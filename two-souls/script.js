$(document).ready(function() {
    // Sound setup
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    // Resume audio context on user interaction
    $(document).on('click', function() {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    });

    // Track time to prevent too many sounds at once
    let lastCollisionSoundTime = 0;

    function playCollisionSound(intensity) {
        if (audioCtx.state === 'suspended') return;
        
        const now = audioCtx.currentTime;
        // Throttle to avoid audio clipping overload
        if (now - lastCollisionSoundTime < 0.02) return;
        lastCollisionSoundTime = now;

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Nice soft marimba-like tone
        osc.type = 'sine';
        const freq = 400 + (Math.random() * 400); // Random pitch between 400 and 800
        osc.frequency.setValueAtTime(freq, now);

        // Intensity determines volume
        const volume = Math.min(0.2, Math.max(0.01, intensity * 0.015));
        
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    function playThudSound(intensity) {
        if (audioCtx.state === 'suspended') return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1); // Quick drop off for a "thud"
        
        const volume = Math.min(0.15, Math.max(0.01, intensity * 0.01));
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    function playFusionSound() {
        if (audioCtx.state === 'suspended') return;
        
        const now = audioCtx.currentTime;
        
        // High sparkle - quick punchiness
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.4);
        
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        
        // Warm harmonic base
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(330, now);
        osc2.frequency.linearRampToValueAtTime(550, now + 0.6);
        osc2.frequency.linearRampToValueAtTime(220, now + 1.2);
        
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.3, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        // Middle harmonic - richness
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(660, now);
        osc3.frequency.linearRampToValueAtTime(880, now + 0.3);
        osc3.frequency.exponentialRampToValueAtTime(440, now + 1.5);
        
        gain3.gain.setValueAtTime(0, now);
        gain3.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain3.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        
        osc3.connect(gain3);
        gain3.connect(audioCtx.destination);
        
        // Metallic shimmer
        const osc4 = audioCtx.createOscillator();
        const gain4 = audioCtx.createGain();
        
        osc4.type = 'square';
        osc4.frequency.setValueAtTime(1600, now);
        osc4.frequency.exponentialRampToValueAtTime(600, now + 0.8);
        
        gain4.gain.setValueAtTime(0, now);
        gain4.gain.linearRampToValueAtTime(0.12, now + 0.08);
        gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc4.connect(gain4);
        gain4.connect(audioCtx.destination);
        
        // Start and stop all oscillators
        osc1.start(now);
        osc1.stop(now + 0.4);
        osc2.start(now);
        osc2.stop(now + 1.2);
        osc3.start(now);
        osc3.stop(now + 1.5);
        osc4.start(now);
        osc4.stop(now + 0.8);
    }

    const canvas = $('#canvas')[0];
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // --- CONFIGURATION VARIABLES ---
    const TIME_LIMIT_SECONDS = 30; // Set starting time limit here (seconds)
    const WARNING_PERCENTAGE = 25; // % at which timer turns orange/red

    let timerActive = false;
    let simStartTime = 0;
    const timerElement = $('#timer');

    let fused = false;
    let fusionTime = 0;
    
    // Ball Arrays
    const grayBalls = [];
    let redBall, blueBall, purpleOrb;

    class Ball {
        constructor(x, y, radius, color, vx, vy) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.color = color;
            this.vx = vx;
            this.vy = vy;
            this.mass = radius;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        update() {
            // Apply speed
            this.x += this.vx;
            this.y += this.vy;

            // Bounce off walls (square box)
            if (this.x - this.radius < 0) {
                this.x = this.radius;
                playThudSound(Math.abs(this.vx));
                this.vx *= -1;
            } else if (this.x + this.radius > width) {
                this.x = width - this.radius;
                playThudSound(Math.abs(this.vx));
                this.vx *= -1;
            }

            if (this.y - this.radius < 0) {
                this.y = this.radius;
                playThudSound(Math.abs(this.vy));
                this.vy *= -1;
            } else if (this.y + this.radius > height) {
                this.y = height - this.radius;
                playThudSound(Math.abs(this.vy));
                this.vy *= -1;
            }
        }
    }

    function handleCollisions(balls) {
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const b1 = balls[i];
                const b2 = balls[j];
                
                // Skip colliding red and blue with each other, they fuse on touch instead
                if ((b1 === redBall && b2 === blueBall) || (b1 === blueBall && b2 === redBall)) {
                    continue;
                }

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = b1.radius + b2.radius;

                if (distance < minDistance) {
                    // Separate the balls to prevent sticking
                    const overlap = minDistance - distance;
                    const angle = Math.atan2(dy, dx);
                    
                    const moveX = (Math.cos(angle) * overlap) / 2;
                    const moveY = (Math.sin(angle) * overlap) / 2;
                    
                    b1.x -= moveX;
                    b1.y -= moveY;
                    b2.x += moveX;
                    b2.y += moveY;

                    // 1D Elastic Collision
                    const nx = Math.cos(angle);
                    const ny = Math.sin(angle);
                    
                    const kx = b1.vx - b2.vx;
                    const ky = b1.vy - b2.vy;
                    
                    // Conservation of momentum along the normal
                    const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);
                    
                    b1.vx -= p * b2.mass * nx;
                    b1.vy -= p * b2.mass * ny;
                    b2.vx += p * b1.mass * nx;
                    b2.vy += p * b1.mass * ny;

                    // Play collision sound based on relative velocity (intensity)
                    const impactIntensity = Math.sqrt(kx * kx + ky * ky);
                    playCollisionSound(impactIntensity);
                }
            }
        }
    }

    function init() {
        // Create 45 chaotic gray balls
        for (let i = 0; i < 45; i++) {
            const radius = Math.random() * 3 + 3; // Size 3 to 6
            const x = Math.random() * (width - radius * 2) + radius;
            const y = Math.random() * (height - radius * 2) + radius;
            // High random velocity
            const vx = (Math.random() - 0.5) * 12;
            const vy = (Math.random() - 0.5) * 12;
            grayBalls.push(new Ball(x, y, radius, '#555', vx, vy));
        }

        // Create the Protagonists
        const r1 = 6;
        redBall = new Ball(Math.random() * 100 + 30, Math.random() * 150 + 100, r1, '#ff3333', Math.random()*2-1, Math.random()*2-1);
        blueBall = new Ball(Math.random() * 100 + 230, Math.random() * 150 + 100, r1, '#3333ff', Math.random()*2-1, Math.random()*2-1);

        simStartTime = Date.now();
        timerActive = true;
    }

    function animate() {
        requestAnimationFrame(animate);
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Slight trail effect
        ctx.fillRect(0, 0, width, height);

        if (!fused) {
            // Timer logic
            if (timerActive) {
                let elapsedSeconds = (Date.now() - simStartTime) / 1000;
                let remaining = Math.max(0, TIME_LIMIT_SECONDS - elapsedSeconds);
                
                let mins = Math.floor(remaining / 60);
                let secs = Math.floor(remaining % 60);
                timerElement.text(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                
                // Color update based on warning threshold
                let percentLeft = (remaining / TIME_LIMIT_SECONDS) * 100;
                if (percentLeft <= WARNING_PERCENTAGE) {
                    timerElement.css('color', '#ff4444'); // Red/Orange warning
                } else {
                    timerElement.css('color', '#ffffff');
                }

                if (remaining === 0) {
                    timerActive = false;
                }
            }

            // Normal chaotic state
            handleCollisions([...grayBalls, redBall, blueBall]);
            
            // Draw & Update gray balls
            grayBalls.forEach(ball => {
                ball.update();
                ball.draw();
            });

            // Subtle magnetic attraction between red and blue
            const dx = blueBall.x - redBall.x;
            const dy = blueBall.y - redBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const force = 0.03;
                redBall.vx += (dx / distance) * force;
                redBall.vy += (dy / distance) * force;
                blueBall.vx -= (dx / distance) * force;
                blueBall.vy -= (dy / distance) * force;
            }
            
            // Limit speed for protagonists so they feel like they are searching, not shooting
            const maxSpeed = 3;
            const redSpeed = Math.sqrt(redBall.vx**2 + redBall.vy**2);
            if (redSpeed > maxSpeed) {
                redBall.vx = (redBall.vx / redSpeed) * maxSpeed;
                redBall.vy = (redBall.vy / redSpeed) * maxSpeed;
            }
            
            const blueSpeed = Math.sqrt(blueBall.vx**2 + blueBall.vy**2);
            if (blueSpeed > maxSpeed) {
                blueBall.vx = (blueBall.vx / blueSpeed) * maxSpeed;
                blueBall.vy = (blueBall.vy / blueSpeed) * maxSpeed;
            }

            redBall.update();
            blueBall.update();

            // Draw red and blue softly glowing
            ctx.shadowBlur = 10;
            ctx.shadowColor = redBall.color;
            redBall.draw();
            
            ctx.shadowColor = blueBall.color;
            blueBall.draw();
            ctx.shadowBlur = 0; // reset

            // Check collision (Fusion)
            if (distance <= redBall.radius + blueBall.radius) {
                fused = true;
                fusionTime = Date.now();
                
                // Play fusion sound
                playFusionSound();
                
                purpleOrb = {
                    x: (redBall.x + blueBall.x) / 2,
                    y: (redBall.y + blueBall.y) / 2,
                    radius: redBall.radius * 1.5,
                    baseY: (redBall.y + blueBall.y) / 2
                };
            }

        } else {
            // Fused state (settling)
            handleCollisions(grayBalls);
            
            ctx.shadowBlur = 0;
            grayBalls.forEach(ball => {
                // Apply friction and gravity
                ball.vy += 0.2; // gravity
                ball.vx *= 0.92; // high air friction
                ball.vy *= 0.98;

                ball.x += ball.vx;
                ball.y += ball.vy;

                // Stop firmly on bottom
                if (ball.y >= height - ball.radius - 1) {
                    ball.y = height - ball.radius;
                    ball.vy = 0;
                    ball.vx *= 0.5; // floor friction
                }
                
                // Keep walls solid
                if (ball.x - ball.radius < 0) ball.x = ball.radius;
                if (ball.x + ball.radius > width) ball.x = width - ball.radius;

                ball.draw();
            });

            // Purple Orb gently floating
            const elapsed = (Date.now() - fusionTime) / 1000;
            purpleOrb.y = purpleOrb.baseY + Math.sin(elapsed * 2) * 5; // Float silently up and down

            ctx.beginPath();
            ctx.arc(purpleOrb.x, purpleOrb.y, purpleOrb.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#9b30ff';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#d94dff';
            ctx.fill();
            ctx.closePath();
            ctx.shadowBlur = 0;
        }
    }

    // Start button event handler
    $('#startBtn').on('click', function() {
        if (timerActive || fused) return; // Prevent multiple starts

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        $('#startScreen').hide();
        init();
        animate();
    });

    // Handle double click or tap in empty body area for fullscreen
    function toggleFullscreen(e) {
        if (e.target === document.body || e.target === document.documentElement) {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const docEl = document.documentElement;
                if (docEl.requestFullscreen) docEl.requestFullscreen().catch(err => console.log(err));
                else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        }
    }

    document.body.addEventListener('dblclick', toggleFullscreen);

    let lastTapTime = 0;
    document.body.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        if (tapLength < 500 && tapLength > 0) {
            toggleFullscreen(e);
            e.preventDefault(); // Prevent double-tap zoom
        }
        lastTapTime = currentTime;
    });
});
