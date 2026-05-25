document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const overlay = document.getElementById('overlay');
    const actionBtn = document.getElementById('action-btn');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const timerEl = document.getElementById('timer');
    const progressBar = document.getElementById('progressBar');
    const progressEl = document.getElementById('progress-bar');
    const flashOverlay = document.getElementById('flash-overlay');
    const endMessage = document.getElementById('end-message');

    // Canvas styling for crispness
    const cw = 360;
    const ch = 540;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    // --- STATE ---
    let state = 'idle'; // 'idle', 'running', 'finished'
    let duration = 10.0; // 10 seconds run
    let timeRemaining = duration;
    let lastTime = 0;
    
    // --- PARTICLES ---
    const NUM_PARTICLES = 600;
    const particles = [];
    const GOLD = '#ffbe0b';
    const MAGENTA = '#ff007f';
    const CYAN = '#00f2fe';
    const WHITE = '#ffffff';

    // Generates a random chaotic position outside the center
    function randomChaoticPos() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 100 + Math.random() * 300;
        return {
            x: cw/2 + Math.cos(angle) * radius,
            y: ch/2 + Math.sin(angle) * radius,
            a: angle,
            r: radius,
            sa: (Math.random() - 0.5) * 2, // Spin angle speed
            sr: (Math.random() - 0.5) * 50 // Radial drift
        };
    }

    function initParticles() {
        particles.length = 0;
        const c = 7.5; // Scale for Fermat spiral
        for (let i = 0; i < NUM_PARTICLES; i++) {
            // Target position: Fermat's Spiral
            const angleTarget = i * 137.5 * (Math.PI / 180);
            const radiusTarget = c * Math.sqrt(i);
            
            particles.push({
                index: i,
                init: randomChaoticPos(),
                targetAngleOffset: angleTarget, // Angle relative to center grouping
                targetRadius: radiusTarget,
                currX: 0,
                currY: 0,
                size: Math.random() * 1.5 + 0.5
            });
        }
    }

    // --- AUDIO SYSTEM (Web Audio API) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let masterGain = null;
    
    // Build-up elements
    let buildUpGain = null;
    let droneOscs = [];
    let droneFilter = null;
    let riserOsc = null;
    let riserGain = null;

    function initAudio() {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        masterGain.gain.setValueAtTime(1, audioCtx.currentTime);

        buildUpGain = audioCtx.createGain();
        buildUpGain.connect(masterGain);
        buildUpGain.gain.setValueAtTime(0, audioCtx.currentTime);
        buildUpGain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 3);

        // Chaotic Swarm Pad (Slightly dissonant at first, will tune/brighten towards climax)
        droneOscs = [];
        droneFilter = audioCtx.createBiquadFilter();
        
        const frequencies = [110, 130.81, 146.83, 164.81]; // A2, C3, D3, E3 - slightly moody cluster
        
        frequencies.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            // Start with sawtooth for texture, gets filtered
            osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.connect(droneFilter);
            osc.start();
            droneOscs.push(osc);
        });
        
        droneFilter.type = 'lowpass';
        droneFilter.frequency.setValueAtTime(150, audioCtx.currentTime); 
        droneFilter.Q.setValueAtTime(1.5, audioCtx.currentTime); 

        droneFilter.connect(buildUpGain);

        // Harmonic Swell (Replaces intense pitch riser)
        riserOsc = audioCtx.createOscillator();
        riserGain = audioCtx.createGain();
        
        riserOsc.type = 'triangle';
        riserOsc.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
        
        riserGain.gain.setValueAtTime(0, audioCtx.currentTime);
        
        riserOsc.connect(riserGain);
        riserGain.connect(buildUpGain);
        riserOsc.start();
    }

    function updateAudio(progress) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;

        // Progress goes from 0 to 1 over 10 seconds
        // Open the filter gently for a blossoming effect
        const cutoff = 150 + Math.pow(progress, 3) * 3000;
        droneFilter.frequency.setTargetAtTime(cutoff, now, 0.2);

        // Drone tuning: as progress -> 1, detuned cluster shifts into a pure C major stack
        const targetFreqs = [130.81, 130.81, 196.00, 261.63]; // C3, C3, G3, C4
        droneOscs.forEach((osc, i) => {
            const currentF = osc.frequency.value;
            // Interpolate towards the pure chord
            const nextF = currentF + (targetFreqs[i] - currentF) * (progress * 0.1);
            osc.frequency.setTargetAtTime(nextF, now, 0.2);
        });

        // Swell pitch gently upwards into an octave
        const startFreq = 261.63; // C4
        const targetFreq = startFreq + (progress * startFreq); 
        riserOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);

        // Soft volume swell
        const rVol = Math.pow(progress, 3) * 0.15;
        riserGain.gain.setTargetAtTime(rVol, now, 0.2);
    }

    function playClimaxSound() {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        
        // INSTANTLY silence the chaotic build-up to clear the sonic space
        buildUpGain.gain.setTargetAtTime(0, now, 0.05);

        // Create a new gain node for the climax elements
        const climaxGain = audioCtx.createGain();
        climaxGain.connect(masterGain);
        climaxGain.gain.setValueAtTime(1, now);
        climaxGain.gain.setTargetAtTime(0, now + 8, 3); // Slow fade out over 10s

        // C Lydian mode arpeggio/wash for a magical, resolving bloom
        const notes = [
            261.63, // C4
            329.63, // E4
            392.00, // G4
            466.16, // B4
            554.37, // C#5 (Lydian flavor)
            659.25, // E5
            783.99  // G5
        ]; 
        
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            // Mix triangles and sines for a crystalline texture
            osc.type = (idx % 2 === 0) ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now);
            
            // Waterfall delay effect: higher notes trigger slightly later
            const delay = idx * 0.08; 
            
            gain.gain.setValueAtTime(0, now);
            // Sharp bell-like attack
            gain.gain.linearRampToValueAtTime(0.12 / notes.length, now + delay + 0.05); 
            // Long, shimmering decay
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 5 + Math.random() * 3); 
            
            osc.connect(gain);
            gain.connect(climaxGain);
            osc.start(now + delay);
            osc.stop(now + 12);
        });

        // Ethereal choir-like drone holding the root and fifth
        [130.81, 196.00].forEach((freq) => {
            const padOsc = audioCtx.createOscillator();
            const padGain = audioCtx.createGain();
            padOsc.type = 'sine';
            padOsc.frequency.setValueAtTime(freq, now);
            
            padGain.gain.setValueAtTime(0, now);
            padGain.gain.linearRampToValueAtTime(0.2, now + 1.5); // Soft swell
            padGain.gain.exponentialRampToValueAtTime(0.001, now + 9);
            
            padOsc.connect(padGain);
            padGain.connect(climaxGain);
            padOsc.start(now);
            padOsc.stop(now + 10);
        });
    }

    // --- ANIMATION / LOGIC ---

    // Easing function to make convergence accelerate satisfyingly at the end
    function easeInExpo(x) {
        return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
    }
    
    function easeInOutQuad(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function formatTime(s) {
        return s.toFixed(2) + 's';
    }

    function render(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (state === 'running') {
            timeRemaining -= dt;
            if (timeRemaining <= 0) {
                timeRemaining = 0;
                triggerClimax();
            }
            const prog = 1 - (timeRemaining / duration);
            progressEl.style.width = (prog * 100) + '%';
            timerEl.textContent = formatTime(timeRemaining);
            updateAudio(prog);
            drawFrame(prog, dt);
        } else if (state === 'finished') {
            // Post-climax spin
            drawClimaxFrame(dt);
        } else {
            // Idle background before start
            drawIdle(timestamp);
        }

        requestAnimationFrame(render);
    }

    let globalRotation = 0;
    
    function drawIdle(ts) {
        ctx.fillStyle = 'rgba(4, 2, 10, 0.2)';
        ctx.fillRect(0, 0, cw, ch);
        
        const cx = cw / 2;
        const cy = ch / 2;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ts * 0.0005);
        for(let i=0; i<50; i++) {
            const rad = 50 + (i * 3);
            const ang = (i * 0.5) + ts*0.001;
            ctx.fillStyle = i % 2 === 0 ? MAGENTA : CYAN;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(Math.cos(ang)*rad, Math.sin(ang)*rad, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawFrame(progress, dt) {
        // Draw trailing background
        ctx.fillStyle = `rgba(4, 2, 10, ${lerp(0.3, 0.1, progress)})`;
        ctx.fillRect(0, 0, cw, ch);

        globalRotation += dt * lerp(0.1, 1.5, progress); // Spins faster as it converges

        const cx = cw / 2;
        const cy = ch / 2;

        const convergeT = Math.pow(progress, 3); // Slow gather, sudden snap
        
        // Draw connections
        ctx.lineWidth = 0.5;
        const maxDist = lerp(40, 20, progress); // Range gets tighter

        for (let i = 0; i < NUM_PARTICLES; i++) {
            const p = particles[i];
            
            // Advance initial stochastic orbit a bit
            p.init.a += p.init.sa * dt;
            p.init.r += p.init.sr * dt;
            const currentChaosX = cx + Math.cos(p.init.a) * p.init.r;
            const currentChaosY = cy + Math.sin(p.init.a) * p.init.r;

            // Target position in spiral
            const currentTargetAngle = p.targetAngleOffset + globalRotation;
            const targetX = cx + Math.cos(currentTargetAngle) * p.targetRadius;
            const targetY = cy + Math.sin(currentTargetAngle) * p.targetRadius;

            // Interpolate
            p.currX = lerp(currentChaosX, targetX, convergeT);
            p.currY = lerp(currentChaosY, targetY, convergeT);

            // Distance to center controls color shift
            const dCenter = Math.hypot(p.currX - cx, p.currY - cy);
            
            // Render particle
            ctx.beginPath();
            ctx.arc(p.currX, p.currY, p.size + (convergeT * 1.5), 0, Math.PI * 2);

            let r = lerp(0, 255, convergeT);
            let g = lerp(242, 190, convergeT); // Cyan -> Gold
            let b = lerp(254, 11, convergeT);
            
            if (progress > 0.8) {
                // Flash to white/gold mixed near the end
                r = 255;
                g = lerp(g, 255, (progress - 0.8) * 5);
                b = lerp(b, 255, (progress - 0.8) * 5);
            }

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();
        }
    }

    let climaxTime = 0;
    function drawClimaxFrame(dt) {
        climaxTime += dt;
        ctx.fillStyle = `rgba(4, 2, 10, ${Math.min(0.2, climaxTime * 0.1)})`;
        ctx.fillRect(0, 0, cw, ch);

        globalRotation += dt * 0.5; // Smooth majestic spin
        
        const cx = cw / 2;
        const cy = ch / 2;
        
        // Expansion pulse
        const pulse = 1 + Math.sin(climaxTime * 2) * 0.05 * Math.exp(-climaxTime);

        for (let i = 0; i < NUM_PARTICLES; i++) {
            const p = particles[i];
            const angle = p.targetAngleOffset + globalRotation;
            
            // Expand slowly outwards, bloom effect
            const rOffset = climaxTime * 15 * (1 - i/NUM_PARTICLES);
            const radius = (p.targetRadius + rOffset) * pulse;
            
            p.currX = cx + Math.cos(angle) * radius;
            p.currY = cy + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.arc(p.currX, p.currY, p.size * 1.5, 0, Math.PI * 2);
            
            // Solid gold/white petals
            const alpha = Math.max(0, 1 - (climaxTime * 0.15));
            ctx.fillStyle = i % 3 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(255,190,11,${alpha})`;
            ctx.fill();
        }
    }

    function triggerClimax() {
        state = 'finished';
        timerEl.textContent = "0.00s";
        timerEl.style.color = GOLD;
        
        flashOverlay.classList.remove('active'); // Reset if needed
        void flashOverlay.offsetWidth; // Trigger reflow
        flashOverlay.classList.add('active');

        setTimeout(() => {
            flashOverlay.classList.remove('active');
            endMessage.classList.add('visible');
        }, 100);

        playClimaxSound();
    }

    function startGame() {
        initParticles();
        initAudio();
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 400);

        lastTime = performance.now();
        state = 'running';
        
        // Start rendering if not already running
        requestAnimationFrame(render);
    }

    // --- SETUP ---
    actionBtn.addEventListener('click', startGame);

    // Fullscreen behavior
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.log(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Start idle animation
    requestAnimationFrame(render);
});