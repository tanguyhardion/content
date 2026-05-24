document.addEventListener('DOMContentLoaded', () => {
    // --- AUDIO SYSTEM (Web Audio API) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playThud(volume = 0.08) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    function playChime(freq, volume = 0.12) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;

        // Primary bell chime
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        // Echo/Delay effect
        setTimeout(() => {
            if (!audioCtx || audioCtx.state === 'suspended') return;
            const echoNow = audioCtx.currentTime;
            const oscEcho = audioCtx.createOscillator();
            const gainEcho = audioCtx.createGain();

            oscEcho.type = 'sine';
            oscEcho.frequency.setValueAtTime(freq, echoNow);

            gainEcho.gain.setValueAtTime(volume * 0.4, echoNow);
            gainEcho.gain.exponentialRampToValueAtTime(0.001, echoNow + 0.25);

            oscEcho.connect(gainEcho);
            gainEcho.connect(audioCtx.destination);
            oscEcho.start(echoNow);
            oscEcho.stop(echoNow + 0.3);
        }, 150);
    }

    function playVictorySound() {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;
        
        // Sparkling arpeggio (C major 9 chord)
        const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99];
        
        notes.forEach((freq, index) => {
            const delay = index * 0.08;
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);

            gainNode.gain.setValueAtTime(0.08, now + delay);
            gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 1.3);
        });
    }

    function playFailureSound() {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.7);

        // Low-pass filter to soften the sawtooth
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gainNode.gain.setValueAtTime(0.14, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.75);
    }

    // --- CANVAS SETUP ---
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    // --- SIMULATION VARIABLES ---
    let gameState = 'menu'; // 'menu', 'playing', 'victory', 'failed'
    let startTime = 0;
    const TIME_LIMIT = 15000; // 15 seconds limit
    let finalAlignTime = 0;

    // Seeker Ball
    const ball = {
        x: cx,
        y: 45,
        radius: 8,
        vx: 0,
        vy: 2.0,
        color: '#00f2fe',
        trail: []
    };

    // Center Core (Target)
    const core = {
        radius: 12,
        color: '#ffbe0b',
        pulse: 0
    };

    // Rings (Gates of Fate)
    const rings = [
        {
            id: 1, // Inner
            radius: 60,
            thickness: 6,
            color: '#00f2fe',
            gapSize: 0.45, // rad (~26 deg)
            angle: Math.PI / 3,
            speed: 0.024, // rad/frame
            chimeFreq: 392.00 // G4
        },
        {
            id: 2, // Middle
            radius: 110,
            thickness: 6,
            color: '#9b30ff',
            gapSize: 0.55, // rad (~31 deg)
            angle: Math.PI,
            speed: -0.017, // rad/frame
            chimeFreq: 329.63 // E4
        },
        {
            id: 3, // Outer
            radius: 160,
            thickness: 6,
            color: '#ff007f',
            gapSize: 0.65, // rad (~37 deg)
            angle: 0,
            speed: 0.013, // rad/frame
            chimeFreq: 261.63 // C4
        }
    ];

    let particles = [];

    // --- HUD ELEMENTS ---
    const timerElement = document.getElementById('timer');
    const progressBar = document.getElementById('progress-bar');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayDesc = document.getElementById('overlay-desc');
    const actionBtn = document.getElementById('action-btn');

    // --- PHYSICS FUNCTIONS ---
    function spawnParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 1 + Math.random() * 3;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                alpha: 1.0,
                size: 2 + Math.random() * 2,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    }

    function spawnVictoryParticles(x, y) {
        const colors = ['#ff007f', '#9b30ff', '#00f2fe', '#ffbe0b', '#ffffff'];
        for (let i = 0; i < 150; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 0.5 + Math.random() * 5;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                size: 2 + Math.random() * 4,
                decay: 0.006 + Math.random() * 0.008
            });
        }
    }

    function getProgressPercent(d) {
        if (d > 160) {
            let val = (1 - (d - 160) / 80) * 25;
            return Math.max(0, val);
        } else if (d > 110) {
            return 25 + (1 - (d - 110) / 50) * 25;
        } else if (d > 60) {
            return 50 + (1 - (d - 60) / 50) * 25;
        } else {
            let val = 75 + (1 - (d - 12) / 48) * 25;
            return Math.min(100, val);
        }
    }

    function updatePhysics() {
        if (gameState !== 'playing') return;

        // Apply Central Gravity Pull
        let dx = cx - ball.x;
        let dy = cy - ball.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 0) {
            let pull = 0.045; // Base attraction pull
            ball.vx += (dx / dist) * pull;
            ball.vy += (dy / dist) * pull;
        }

        // --- GAP GUIDANCE & ALIGNMENT FUNNEL ---
        // Find which ring the ball is currently trying to pass (from outside to inside)
        let targetRing = null;
        if (dist > 160) {
            targetRing = rings[2]; // Outer ring
        } else if (dist > 110) {
            targetRing = rings[1]; // Middle ring
        } else if (dist > 60) {
            targetRing = rings[0]; // Inner ring
        }

        // If the ball is close to the target ring's outer boundary, help funnel it in
        if (targetRing) {
            let R = targetRing.radius;
            if (dist > R && dist < R + 25) {
                // Calculate angular difference to the gap
                let ballAngle = Math.atan2(ball.y - cy, ball.x - cx);
                let diff = ballAngle - targetRing.angle;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize to [-PI, PI]

                // If the ball is aligned with the gap (with a slight margin to catch it early)
                if (Math.abs(diff) < targetRing.gapSize * 1.1) {
                    // Damp tangential velocity (helps the ball stop sliding/skimming over the gap)
                    let rx = (ball.x - cx) / dist;
                    let ry = (ball.y - cy) / dist;
                    let tx = -ry;
                    let ty = rx;

                    let v_radial = ball.vx * rx + ball.vy * ry;
                    let v_tangent = ball.vx * tx + ball.vy * ty;

                    v_tangent *= 0.65; // Damp tangential sliding speed

                    ball.vx = v_radial * rx + v_tangent * tx;
                    ball.vy = v_radial * ry + v_tangent * ty;

                    // Pull directly through the center of the gap (8px inside the ring)
                    let gapAngle = targetRing.angle;
                    let gx = cx + Math.cos(gapAngle) * (R - 8);
                    let gy = cy + Math.sin(gapAngle) * (R - 8);
                    
                    let dx_gap = gx - ball.x;
                    let dy_gap = gy - ball.y;
                    let dist_gap = Math.sqrt(dx_gap*dx_gap + dy_gap*dy_gap);
                    if (dist_gap > 0) {
                        let guidePull = 0.12; // Inward funnel force
                        ball.vx += (dx_gap / dist_gap) * guidePull;
                        ball.vy += (dy_gap / dist_gap) * guidePull;
                    }
                }
            }
        }

        // Add subtle chaotic wind/drift to prevent static locking
        ball.vx += (Math.random() - 0.5) * 0.12;
        ball.vy += (Math.random() - 0.5) * 0.12;

        // Speed limiting (keeps path smooth and satisfying)
        let speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
        const maxSpeed = 5.2;
        if (speed > maxSpeed) {
            ball.vx = (ball.vx / speed) * maxSpeed;
            ball.vy = (ball.vy / speed) * maxSpeed;
        }

        // Update Position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Store Trail
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 15) {
            ball.trail.shift();
        }

        // Canvas Wall Collisions
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -0.7;
            playThud(Math.abs(ball.vx) * 0.02);
        } else if (ball.x + ball.radius > width) {
            ball.x = width - ball.radius;
            ball.vx *= -0.7;
            playThud(Math.abs(ball.vx) * 0.02);
        }

        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.vy *= -0.7;
            playThud(Math.abs(ball.vy) * 0.02);
        } else if (ball.y + ball.radius > height) {
            ball.y = height - ball.radius;
            ball.vy *= -0.7;
            playThud(Math.abs(ball.vy) * 0.02);
        }

        // Rings Collision Check
        let updatedDist = Math.sqrt((ball.x - cx)**2 + (ball.y - cy)**2);
        
        for (let i = 0; i < rings.length; i++) {
            let ring = rings[i];
            let R = ring.radius;

            // Check if ball is intersecting the ring shell
            if (Math.abs(updatedDist - R) < ball.radius) {
                // Check if ball falls inside the gap of this rotating ring
                let ballAngle = Math.atan2(ball.y - cy, ball.x - cx);
                let diff = ballAngle - ring.angle;
                // Normalize angle difference to [-PI, PI]
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));

                if (Math.abs(diff) < ring.gapSize / 2) {
                    // Ball passes through the gap! No collision
                    continue;
                }

                // Normal collision response
                let nx = (ball.x - cx) / updatedDist;
                let ny = (ball.y - cy) / updatedDist;
                let dot = ball.vx * nx + ball.vy * ny;

                // Reflect velocity
                ball.vx = ball.vx - 2 * dot * nx;
                ball.vy = ball.vy - 2 * dot * ny;

                // Add bounce restitution
                ball.vx *= 0.72;
                ball.vy *= 0.72;

                // Transfer Ring tangential velocity to give it dynamic spin (reduced to prevent locking)
                let tx = -ny;
                let ty = nx;
                let vRing = ring.speed * R;
                ball.vx += tx * vRing * 0.05;
                ball.vy += ty * vRing * 0.05;

                // Resolve penetration based on which side the ball collided
                let pushD = (updatedDist >= R) ? (R + ball.radius + 0.3) : (R - ball.radius - 0.3);
                ball.x = cx + nx * pushD;
                ball.y = cy + ny * pushD;

                // Re-calculate distance
                updatedDist = Math.sqrt((ball.x - cx)**2 + (ball.y - cy)**2);

                // Audio and particles
                playChime(ring.chimeFreq, 0.12);
                spawnParticles(ball.x, ball.y, ring.color, 8);
                break; // Handle one ring collision per frame max
            }
        }

        // Center Core Fusion Check
        if (updatedDist <= core.radius + ball.radius) {
            triggerWin();
        }

        // Update HUD
        let progress = getProgressPercent(updatedDist);
        progressBar.style.width = `${progress}%`;
    }

    function triggerWin() {
        gameState = 'victory';
        finalAlignTime = (Date.now() - startTime) / 1000;
        playVictorySound();
        spawnVictoryParticles(cx, cy);
        
        // Push ball to center
        ball.x = cx;
        ball.y = cy;
        ball.vx = 0;
        ball.vy = 0;

        setTimeout(() => {
            showMenu('ALIGNMENT SUCCESS', `The soul reached the core in ${finalAlignTime.toFixed(2)}s!`, 'TRY AGAIN');
        }, 1500);
    }

    function triggerFail() {
        gameState = 'failed';
        playFailureSound();
        showMenu('ALIGNMENT FAILED', 'The soul lost its way in the rotating gates of fate.', 'RETRY ALIGNMENT');
    }

    // --- GAME LOOP ---
    function animate() {
        // Clear screen with a slight trail opacity
        ctx.fillStyle = 'rgba(3, 3, 7, 0.35)';
        ctx.fillRect(0, 0, width, height);

        // Draw Starry BG Jitters
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 6; i++) {
            let sx = (cx * (1 + Math.sin(Date.now() * 0.001 * (i + 1)))) % width;
            let sy = (cy * (1 + Math.cos(Date.now() * 0.0015 * (i + 1)))) % height;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Update ring rotation angles
        if (gameState === 'playing') {
            rings.forEach(ring => {
                ring.angle += ring.speed;
                // Normalize angle
                ring.angle = ring.angle % (Math.PI * 2);
            });
        }

        // Draw Rings (Gates)
        rings.forEach(ring => {
            ctx.save();
            ctx.beginPath();
            
            // Draw gap by drawing the arc starting from ring.angle + gapSize/2 to ring.angle - gapSize/2
            let startArc = ring.angle + ring.gapSize / 2;
            let endArc = ring.angle - ring.gapSize / 2;
            
            ctx.arc(cx, cy, ring.radius, startArc, endArc);
            ctx.lineWidth = ring.thickness;
            ctx.strokeStyle = ring.color;
            ctx.lineCap = 'round';
            
            // Add subtle neon glow
            ctx.shadowBlur = 12;
            ctx.shadowColor = ring.color;
            
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        });

        // Draw Center Core (Target)
        if (gameState !== 'menu') {
            core.pulse = Math.sin(Date.now() * 0.004) * 2;
            let pulseRad = core.radius + core.pulse;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, pulseRad, 0, Math.PI * 2);
            ctx.fillStyle = core.color;
            ctx.shadowBlur = 25;
            ctx.shadowColor = core.color;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        // Update & Draw Seeker Ball Trail
        if (gameState === 'playing' || gameState === 'victory') {
            for (let i = 0; i < ball.trail.length; i++) {
                let t = ball.trail[i];
                let alpha = ((i + 1) / ball.trail.length) * 0.35;
                let size = ((i + 1) / ball.trail.length) * ball.radius;
                
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 242, 254, ${alpha})`;
                ctx.fill();
                ctx.closePath();
            }
        }

        // Update and Draw Seeker Ball
        if (gameState === 'playing') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = ball.color;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        // Update and Draw Particles
        updateAndDrawParticles();

        // Update Timer HUD
        if (gameState === 'playing') {
            let elapsed = Date.now() - startTime;
            let remaining = Math.max(0, TIME_LIMIT - elapsed);
            
            let secs = Math.floor(remaining / 1000);
            let centis = Math.floor((remaining % 1000) / 10);
            
            timerElement.innerText = `${secs}.${centis.toString().padStart(2, '0')}s`;
            
            if (remaining < 3000) {
                timerElement.style.color = '#ff007f';
                timerElement.style.textShadow = '0 0 10px rgba(255, 0, 127, 0.4)';
            } else {
                timerElement.style.color = '#ffffff';
                timerElement.style.textShadow = 'none';
            }

            if (remaining <= 0) {
                triggerFail();
            }
        }

        // Physics update
        updatePhysics();

        requestAnimationFrame(animate);
    }

    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
        }
    }

    // --- MENU CONTROL ---
    function showMenu(title, desc, btnText) {
        overlayTitle.innerText = title;
        overlayDesc.innerText = desc;
        actionBtn.innerText = btnText;
        
        // Color headers appropriately
        if (title.includes('SUCCESS')) {
            overlayTitle.style.color = '#ffbe0b';
            overlayTitle.style.textShadow = '0 0 20px rgba(255, 190, 11, 0.4)';
        } else if (title.includes('FAILED')) {
            overlayTitle.style.color = '#ff007f';
            overlayTitle.style.textShadow = '0 0 20px rgba(255, 0, 127, 0.4)';
        } else {
            overlayTitle.style.color = '#ffffff';
            overlayTitle.style.textShadow = 'none';
        }

        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
    }

    function hideMenu() {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }

    function startGame() {
        initAudio();
        hideMenu();

        // Reset Seeker Ball
        ball.x = cx;
        ball.y = 45;
        ball.vx = 0.5 - Math.random(); // Subtle random side kick
        ball.vy = 2.0;
        ball.trail = [];
        particles = [];

        // Randomize gates slightly so each run is unique
        rings[0].angle = Math.random() * Math.PI * 2;
        rings[1].angle = Math.random() * Math.PI * 2;
        rings[2].angle = Math.random() * Math.PI * 2;

        startTime = Date.now();
        gameState = 'playing';
        progressBar.style.width = '0%';
        timerElement.innerText = '15.00s';
    }

    // Event Listener
    actionBtn.addEventListener('click', startGame);

    // Fullscreen Event Listener
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((err) => {
                    console.log(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    // Initial draw to fill canvas background and rings
    animate();
});
