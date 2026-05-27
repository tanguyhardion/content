document.addEventListener('DOMContentLoaded', () => {
    // --- UI ELEMENTS ---
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const overlay = document.getElementById('overlay');
    const actionBtn = document.getElementById('action-btn');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const timerElement = document.getElementById('timer');
    const progressBar = document.getElementById('progress-bar');
    const flashOverlay = document.getElementById('flash-overlay');
    const endMessage = document.getElementById('end-message');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayDesc = document.getElementById('overlay-desc');

    // Canvas styling for crispness (from soul-bloom)
    const cw = 360;
    const ch = 540;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
    
    // Core coordinates (from soul-bloom style layout)
    const cx = cw / 2;
    const cy = ch / 2;

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
        const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99]; // C major 9
        
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

    // --- SIMULATION VARIABLES ---
    let gameState = 'menu'; // 'menu', 'playing', 'victory', 'failed'
    let startTime = 0;
    const TIME_LIMIT = 15000; 
    let finalAlignTime = 0;

    const ball = {
        x: cx,
        y: 45,
        radius: 8,
        vx: 0,
        vy: 2.0,
        color: '#00f2fe',
        trail: []
    };

    const core = {
        radius: 12,
        color: '#ffbe0b',
        pulse: 0
    };

    const rings = [
        { radius: 60, thickness: 6, color: '#00f2fe', gapSize: 0.45, angle: Math.PI / 3, speed: 0.024, chimeFreq: 392.00 },
        { radius: 110, thickness: 6, color: '#9b30ff', gapSize: 0.55, angle: Math.PI, speed: -0.017, chimeFreq: 329.63 },
        { radius: 160, thickness: 6, color: '#ff007f', gapSize: 0.65, angle: 0, speed: 0.013, chimeFreq: 261.63 }
    ];

    let particles = [];

    // --- PHYSICS FUNCTIONS ---
    function spawnParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 1 + Math.random() * 3;
            particles.push({
                x: x, y: y,
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
                x: x, y: y,
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
            return Math.max(0, (1 - (d - 160) / 80) * 25);
        } else if (d > 110) {
            return 25 + (1 - (d - 110) / 50) * 25;
        } else if (d > 60) {
            return 50 + (1 - (d - 60) / 50) * 25;
        } else {
            return Math.min(100, 75 + (1 - (d - 12) / 48) * 25);
        }
    }

    function updatePhysics() {
        if (gameState !== 'playing') return;

        let dx = cx - ball.x;
        let dy = cy - ball.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 0) {
            let pull = 0.045;
            ball.vx += (dx / dist) * pull;
            ball.vy += (dy / dist) * pull;
        }

        let targetRing = null;
        if (dist > 160) targetRing = rings[2];
        else if (dist > 110) targetRing = rings[1];
        else if (dist > 60) targetRing = rings[0];

        if (targetRing) {
            let R = targetRing.radius;
            if (dist > R && dist < R + 25) {
                let ballAngle = Math.atan2(ball.y - cy, ball.x - cx);
                let diff = Math.atan2(Math.sin(ballAngle - targetRing.angle), Math.cos(ballAngle - targetRing.angle));

                if (Math.abs(diff) < targetRing.gapSize * 1.1) {
                    let rx = (ball.x - cx) / dist;
                    let ry = (ball.y - cy) / dist;
                    let tx = -ry;
                    let ty = rx;

                    let v_radial = ball.vx * rx + ball.vy * ry;
                    let v_tangent = (ball.vx * tx + ball.vy * ty) * 0.65;
                    ball.vx = v_radial * rx + v_tangent * tx;
                    ball.vy = v_radial * ry + v_tangent * ty;

                    let gx = cx + Math.cos(targetRing.angle) * (R - 8);
                    let gy = cy + Math.sin(targetRing.angle) * (R - 8);
                    let dx_gap = gx - ball.x;
                    let dy_gap = gy - ball.y;
                    let dist_gap = Math.sqrt(dx_gap*dx_gap + dy_gap*dy_gap);
                    if (dist_gap > 0) {
                        ball.vx += (dx_gap/dist_gap) * 0.12;
                        ball.vy += (dy_gap/dist_gap) * 0.12;
                    }
                }
            }
        }

        ball.vx += (Math.random() - 0.5) * 0.12;
        ball.vy += (Math.random() - 0.5) * 0.12;

        let speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
        if (speed > 5.2) {
            ball.vx = (ball.vx / speed) * 5.2;
            ball.vy = (ball.vy / speed) * 5.2;
        }

        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 15) ball.trail.shift();

        // Wall collisions
        if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx *= -0.7; playThud(Math.abs(ball.vx)*0.02); }
        else if (ball.x + ball.radius > cw) { ball.x = cw - ball.radius; ball.vx *= -0.7; playThud(Math.abs(ball.vx)*0.02); }
        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= -0.7; playThud(Math.abs(ball.vy)*0.02); }
        else if (ball.y + ball.radius > ch) { ball.y = ch - ball.radius; ball.vy *= -0.7; playThud(Math.abs(ball.vy)*0.02); }

        let updatedDist = Math.sqrt((ball.x - cx)**2 + (ball.y - cy)**2);
        for (let ring of rings) {
            if (Math.abs(updatedDist - ring.radius) < ball.radius) {
                let ballAngle = Math.atan2(ball.y - cy, ball.x - cx);
                let diff = Math.atan2(Math.sin(ballAngle - ring.angle), Math.cos(ballAngle - ring.angle));
                if (Math.abs(diff) < ring.gapSize / 2) continue;

                let nx = (ball.x - cx) / updatedDist;
                let ny = (ball.y - cy) / updatedDist;
                let dot = ball.vx * nx + ball.vy * ny;
                ball.vx = (ball.vx - 2 * dot * nx) * 0.72;
                ball.vy = (ball.vy - 2 * dot * ny) * 0.72;
                ball.vx += (-ny) * ring.speed * ring.radius * 0.05;
                ball.vy += nx * ring.speed * ring.radius * 0.05;

                let pushD = (updatedDist >= ring.radius) ? (ring.radius + ball.radius + 0.3) : (ring.radius - ball.radius - 0.3);
                ball.x = cx + nx * pushD;
                ball.y = cy + ny * pushD;
                updatedDist = Math.sqrt((ball.x - cx)**2 + (ball.y - cy)**2);

                playChime(ring.chimeFreq, 0.12);
                spawnParticles(ball.x, ball.y, ring.color, 8);
                break;
            }
        }

        if (updatedDist <= core.radius + ball.radius) triggerWin();
        progressBar.style.width = `${getProgressPercent(updatedDist)}%`;
    }

    function triggerWin() {
        gameState = 'victory';
        finalAlignTime = (Date.now() - startTime) / 1000;
        playVictorySound();
        spawnVictoryParticles(cx, cy);
        
        ball.x = cx; ball.y = cy; ball.vx = 0; ball.vy = 0;

        // Visual climax (from soul-bloom style)
        flashOverlay.classList.add('active');
        setTimeout(() => flashOverlay.classList.remove('active'), 50);
        endMessage.classList.add('visible');

        setTimeout(() => {
            endMessage.classList.remove('visible');
            showMenu('ALIGNMENT SUCCESS', `The soul reached the core in ${finalAlignTime.toFixed(2)}s!`, 'TRY AGAIN');
        }, 2500);
    }

    function triggerFail() {
        gameState = 'failed';
        playFailureSound();
        showMenu('ALIGNMENT FAILED', 'The soul lost its way in the rotating gates of fate.', 'RETRY ALIGNMENT');
    }

    // --- GAME LOOP ---
    function animate() {
        ctx.fillStyle = 'rgba(3, 3, 7, 0.35)';
        ctx.fillRect(0, 0, cw, ch);

        // Starry BG
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 6; i++) {
            let sx = (cx * (1 + Math.sin(Date.now() * 0.001 * (i + 1)))) % cw;
            let sy = (cy * (1 + Math.cos(Date.now() * 0.0015 * (i + 1)))) % ch;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        if (gameState === 'playing') {
            rings.forEach(ring => { ring.angle = (ring.angle + ring.speed) % (Math.PI * 2); });
        }

        rings.forEach(ring => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, ring.radius, ring.angle + ring.gapSize / 2, ring.angle - ring.gapSize / 2);
            ctx.lineWidth = ring.thickness;
            ctx.strokeStyle = ring.color;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 12; ctx.shadowColor = ring.color;
            ctx.stroke();
            ctx.restore();
        });

        if (gameState !== 'menu') {
            core.pulse = Math.sin(Date.now() * 0.004) * 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, core.radius + core.pulse, 0, Math.PI * 2);
            ctx.fillStyle = core.color;
            ctx.shadowBlur = 25; ctx.shadowColor = core.color;
            ctx.fill();
            ctx.restore();
        }

        if (gameState === 'playing' || gameState === 'victory') {
            ball.trail.forEach((t, i) => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, ((i + 1) / ball.trail.length) * ball.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 242, 254, ${((i + 1) / ball.trail.length) * 0.35})`;
                ctx.fill();
            });
        }

        if (gameState === 'playing') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.shadowBlur = 15; ctx.shadowColor = ball.color;
            ctx.fill();
            ctx.restore();
        }

        updateAndDrawParticles();

        if (gameState === 'playing') {
            let remaining = Math.max(0, TIME_LIMIT - (Date.now() - startTime));
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
            if (remaining <= 0) triggerFail();
        }

        updatePhysics();
        requestAnimationFrame(animate);
    }

    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
            if (p.alpha <= 0) { particles.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10; ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
        }
    }

    function showMenu(title, desc, btnText) {
        overlayTitle.innerText = title;
        overlayDesc.innerText = desc;
        actionBtn.innerText = btnText;
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

    function startGame() {
        initAudio();
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        ball.x = cx; ball.y = 45; ball.vx = 0.5 - Math.random(); ball.vy = 2.0;
        ball.trail = []; particles = [];
        rings.forEach(r => r.angle = Math.random() * Math.PI * 2);
        startTime = Date.now();
        gameState = 'playing';
        progressBar.style.width = '0%';
        timerElement.innerText = '15.00s';
    }

    actionBtn.addEventListener('click', startGame);
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
    }
    animate();
});