document.addEventListener('DOMContentLoaded', () => {
    // --- AUDIO SYSTEM (Web Audio API) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let ambientDrone = null;
    let ambientGain = null;
    let resonanceOsc = null;
    let resonanceGain = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        startAmbientDrone();
        startResonanceSynth();
    }

    function startAmbientDrone() {
        if (!audioCtx || ambientDrone) return;
        
        try {
            const now = audioCtx.currentTime;
            
            // Create oscillators for a deep celestial hum
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            ambientGain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(55, now); // A1 base
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(110.5, now); // A2 slightly detuned

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(110, now);
            filter.Q.setValueAtTime(4, now);

            // Modulate filter frequency with a slow LFO
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(0.15, now); // 0.15Hz
            lfoGain.gain.setValueAtTime(35, now);

            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            ambientGain.gain.setValueAtTime(0.0, now);
            ambientGain.gain.linearRampToValueAtTime(0.18, now + 1.5); // Fade in

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(ambientGain);
            ambientGain.connect(audioCtx.destination);

            osc1.start(now);
            osc2.start(now);
            lfo.start(now);

            ambientDrone = {
                osc1,
                osc2,
                lfo,
                filter,
                gain: ambientGain
            };
        } catch (e) {
            console.warn('Failed to start ambient drone:', e);
        }
    }

    function startResonanceSynth() {
        if (!audioCtx || resonanceOsc) return;
        try {
            const now = audioCtx.currentTime;
            resonanceOsc = audioCtx.createOscillator();
            resonanceGain = audioCtx.createGain();
            
            resonanceOsc.type = 'sine';
            resonanceOsc.frequency.setValueAtTime(220, now); // A3 default
            
            resonanceGain.gain.setValueAtTime(0.0, now);
            
            resonanceOsc.connect(resonanceGain);
            resonanceGain.connect(audioCtx.destination);
            resonanceOsc.start(now);
        } catch (e) {
            console.warn('Failed to start resonance synth:', e);
        }
    }

    function updateSoundscape(mergedCount, activeResonances) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;

        // 1. Modulate Ambient Drone base on merged nodes count
        // More nodes merged = higher pitch and brighter filter
        if (ambientDrone) {
            const baseFreqs = [55, 65.41, 73.42, 82.41, 98.00, 110.00]; // A1, C2, D2, E2, G2, A2
            const targetFreq = baseFreqs[Math.min(mergedCount, baseFreqs.length - 1)];
            
            // Slide frequency smoothly
            ambientDrone.osc1.frequency.setTargetAtTime(targetFreq, now, 0.5);
            ambientDrone.osc2.frequency.setTargetAtTime(targetFreq * 2.01, now, 0.5);
            
            // Open up filter as nodes merge
            const filterCutoff = 110 + mergedCount * 45;
            ambientDrone.filter.frequency.setTargetAtTime(filterCutoff, now, 0.4);
        }

        // 2. Modulate Resonance Synth based on active links
        if (resonanceOsc && resonanceGain) {
            if (activeResonances.length > 0) {
                // Determine chord frequency based on link types
                // We'll use the first active resonance to set pitch
                const resType = activeResonances[0];
                let freq = 220; // Default A3
                if (resType === 'outer-mid') freq = 220; // A3
                if (resType === 'mid-inner') freq = 277.18; // C#4
                if (resType === 'inner-core') freq = 329.63; // E4

                resonanceOsc.frequency.setTargetAtTime(freq, now, 0.1);
                resonanceGain.gain.setTargetAtTime(0.06, now, 0.1); // Soft hum
            } else {
                // Fade out resonance hum
                resonanceGain.gain.setTargetAtTime(0.0, now, 0.15);
            }
        }
    }

    function stopAllAudio() {
        stopAmbientDrone();
        if (resonanceOsc) {
            try {
                resonanceOsc.stop();
                resonanceOsc = null;
            } catch (e) {}
        }
    }

    function stopAmbientDrone() {
        if (!ambientDrone || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            ambientGain.gain.cancelScheduledValues(now);
            ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
            ambientGain.gain.linearRampToValueAtTime(0.0, now + 0.6);
            
            setTimeout(() => {
                if (ambientDrone) {
                    ambientDrone.osc1.stop();
                    ambientDrone.osc2.stop();
                    ambientDrone.lfo.stop();
                    ambientDrone = null;
                }
            }, 700);
        } catch (e) {
            console.warn('Failed to stop ambient drone:', e);
        }
    }

    function playJumpSound(orbit) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            // Higher starting frequencies for inner jumps
            const startFreq = orbit === 3 ? 180 : (orbit === 2 ? 260 : 380);
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.2);

            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.21);
        } catch (e) {}
    }

    function playSyncSuccessSound(orbit) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'triangle';
            // Pentatonic scale ladder
            const freqs = { 2: 523.25, 1: 659.25, 0: 783.99 }; // C5, E5, G5
            const pitch = freqs[orbit] || 523;

            osc.frequency.setValueAtTime(pitch, now);
            osc.frequency.exponentialRampToValueAtTime(pitch * 2.0, now + 0.25);

            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    function playCollisionSound(orbit) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = 'sawtooth';
            // Resonant frequencies for different barriers
            const collisionFreqs = { 2: 120, 1: 160, 0: 200 };
            const baseFreq = collisionFreqs[orbit] || 120;

            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.18);

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(baseFreq * 1.5, now);

            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.23);
        } catch (e) {}
    }

    function playMergeSound() {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            // Shimmering arpeggio
            const notes = [523.25, 659.25, 783.99, 987.77, 1046.50]; // C5, E5, G5, B5, C6
            
            notes.forEach((freq, index) => {
                const delay = index * 0.05;
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + delay);

                gainNode.gain.setValueAtTime(0.04, now + delay);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.6);
            });
        } catch (e) {}
    }

    function playVictorySound() {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            // Majestic ascending C Major 9 chord
            const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99, 1046.50];
            
            notes.forEach((freq, index) => {
                const delay = index * 0.08;
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + delay);

                gainNode.gain.setValueAtTime(0.05, now + delay);
                gainNode.gain.linearRampToValueAtTime(0.08, now + delay + 0.04);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2);

                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 1.3);
            });
        } catch (e) {}
    }

    function playFailureSound() {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(25, now + 0.85);

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, now);

            gainNode.gain.setValueAtTime(0.18, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.9);
        } catch (e) {}
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
    const TIME_LIMIT = 15000; // 15 seconds observation time
    let finalAlignTime = 0;

    const ORBIT_RADII = {
        3: 170,
        2: 115,
        1: 60,
        0: 0
    };

    // 5 Soul Nodes
    let nodes = [];
    const colors = ['#00f2fe', '#ff007f', '#9b30ff', '#ffffff', '#ffbe0b'];

    // Center Core Target
    const core = {
        radius: 12,
        color: '#ffbe0b',
        pulse: 0,
        glowTimer: 0
    };

    // Obstacle barriers
    const barriers = [
        // Orbit 2 barriers (Outer check)
        {
            orbit: 2,
            span: 1.15,
            angle: 0,
            speed: 0.012,
            color: '#ff007f'
        },
        {
            orbit: 2,
            span: 1.15,
            angle: Math.PI,
            speed: 0.012,
            color: '#ff007f'
        },
        // Orbit 1 barriers (Middle check)
        {
            orbit: 1,
            span: 1.25,
            angle: Math.PI / 2,
            speed: -0.018,
            color: '#9b30ff'
        },
        {
            orbit: 1,
            span: 1.25,
            angle: -Math.PI / 2,
            speed: -0.018,
            color: '#9b30ff'
        },
        // Core Shield (Inner check)
        {
            orbit: 0,
            span: 2.0,
            angle: Math.PI,
            speed: 0.032,
            color: '#7209b7'
        }
    ];

    let particles = [];
    let activeResonances = []; // To track link types in current frame

    // --- HUD ELEMENTS ---
    const timerElement = document.getElementById('timer');
    const progressBar = document.getElementById('progress-bar');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayDesc = document.getElementById('overlay-desc');
    const actionBtn = document.getElementById('action-btn');

    // --- GENERATIVE PHYSICS LOGIC ---
    function spawnParticles(x, y, color, count = 10, speedMult = 1.0) {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = (1 + Math.random() * 3) * speedMult;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                alpha: 1.0,
                size: 1.5 + Math.random() * 2,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    }

    function spawnVictoryParticles() {
        for (let i = 0; i < 150; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 0.5 + Math.random() * 5.5;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                size: 2 + Math.random() * 3,
                decay: 0.005 + Math.random() * 0.008
            });
        }
    }

    function checkCollision(targetOrbit, checkAngle) {
        const activeBarriers = barriers.filter(b => b.orbit === targetOrbit);
        for (let barrier of activeBarriers) {
            let normOrb = (checkAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            let normBar = (barrier.angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            
            let diff = Math.abs(normOrb - normBar);
            if (diff > Math.PI) {
                diff = Math.PI * 2 - diff;
            }
            
            if (diff < barrier.span / 2) {
                return barrier;
            }
        }
        return null;
    }

    function updatePhysics() {
        if (gameState !== 'playing') return;

        // Update barrier rotation
        barriers.forEach(b => {
            b.angle += b.speed;
        });

        activeResonances = [];
        let mergedCount = 0;

        // Update Soul Nodes
        nodes.forEach(node => {
            if (node.state === 'merged') {
                mergedCount++;
                return;
            }

            if (node.state === 'orbiting') {
                // Orbit rotation (Orbit 1 moves reverse for beauty)
                const direction = node.orbit === 1 ? -1 : 1;
                node.angle += node.speed * direction;
                node.radius = ORBIT_RADII[node.orbit];

                // Decrement jump cooldown
                node.jumpCooldown--;

                // Pulse node slightly when close to jump
                if (node.jumpCooldown < 30 && node.jumpCooldown > 0) {
                    if (Math.random() < 0.25) {
                        const px = cx + Math.cos(node.angle) * node.radius;
                        const py = cy + Math.sin(node.angle) * node.radius;
                        // Emits visual cue charge sparks
                        spawnParticles(px, py, node.color, 1, 0.4);
                    }
                }

                // Trigger autonomous jump
                if (node.jumpCooldown <= 0) {
                    node.state = 'jumping';
                    node.jumpProgress = 0;
                    node.sourceRadius = ORBIT_RADII[node.orbit];
                    node.targetRadius = ORBIT_RADII[node.orbit - 1];
                    playJumpSound(node.orbit);
                }
            } 
            else if (node.state === 'jumping') {
                // Progress jump inwards
                node.jumpProgress += 0.05; // Smooth radial shift
                
                if (node.jumpProgress >= 1) {
                    node.jumpProgress = 1;
                    node.radius = node.targetRadius;
                    
                    const targetOrbit = node.orbit - 1;
                    const collisionBarrier = checkCollision(targetOrbit, node.angle);
                    
                    const sx = cx + Math.cos(node.angle) * node.radius;
                    const sy = cy + Math.sin(node.angle) * node.radius;

                    if (collisionBarrier) {
                        // HIT! Bounce back outwards
                        node.state = 'bouncing';
                        node.jumpProgress = 0;
                        node.sourceRadius = node.radius;
                        node.targetRadius = ORBIT_RADII[node.orbit];
                        
                        playCollisionSound(targetOrbit);
                        spawnParticles(sx, sy, collisionBarrier.color, 12, 1.2);
                    } else {
                        // SUCCESS! Sync to inner track
                        node.orbit = targetOrbit;
                        
                        if (node.orbit === 0) {
                            // Merge with core
                            node.state = 'merged';
                            core.glowTimer = 25; // Trigger core flash
                            playMergeSound();
                            spawnParticles(cx, cy, node.color, 25, 2.0);
                            
                            // Check for victory
                            const allMerged = nodes.every(n => n.state === 'merged');
                            if (allMerged) {
                                triggerWin();
                            }
                        } else {
                            node.state = 'orbiting';
                            node.radius = ORBIT_RADII[node.orbit];
                            node.jumpCooldown = 120 + Math.random() * 150; // New cooldown
                            playSyncSuccessSound(node.orbit);
                            spawnParticles(sx, sy, node.color, 6, 0.7);
                        }
                    }
                } else {
                    node.radius = node.sourceRadius + (node.targetRadius - node.sourceRadius) * node.jumpProgress;
                }
            } 
            else if (node.state === 'bouncing') {
                // Bouncing back to source orbit
                node.jumpProgress += 0.08;
                
                if (node.jumpProgress >= 1) {
                    node.state = 'orbiting';
                    node.radius = node.targetRadius;
                    node.jumpCooldown = 70 + Math.random() * 100; // Reset cooldown
                } else {
                    node.radius = node.sourceRadius + (node.targetRadius - node.sourceRadius) * node.jumpProgress;
                }
            }

            // Record trail
            const sx = cx + Math.cos(node.angle) * node.radius;
            const sy = cy + Math.sin(node.angle) * node.radius;
            node.trail.push({ x: sx, y: sy });
            if (node.trail.length > 10) {
                node.trail.shift();
            }
        });

        // 3. Check for Resonance Beams between adjacent orbit nodes
        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            if (nodeA.state !== 'orbiting') continue;
            
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                if (nodeB.state !== 'orbiting') continue;

                // Adjacent tracks check: difference in orbit must be exactly 1
                if (Math.abs(nodeA.orbit - nodeB.orbit) === 1) {
                    let diff = Math.abs(nodeA.angle - nodeB.angle);
                    diff = (diff % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;

                    if (diff < 0.22) { // Within threshold angle
                        const linkKey = nodeA.orbit > nodeB.orbit ? `${nodeB.orbit}-${nodeA.orbit}` : `${nodeA.orbit}-${nodeB.orbit}`;
                        // Convert tracks index to semantic link names
                        let linkType = 'outer-mid';
                        if (linkKey === '1-2') linkType = 'mid-inner';
                        if (linkKey === '0-1') linkType = 'inner-core';
                        
                        if (!activeResonances.includes(linkType)) {
                            activeResonances.push(linkType);
                        }
                        
                        // Link is active, script drawing happens in render
                        nodeA.activeResNode = nodeB; // Temporarily map linking partner
                    }
                }
            }
        }

        // Modulate audio context based on current simulation state
        updateSoundscape(mergedCount, activeResonances);

        // Update progress bar HUD
        const progressPercent = (mergedCount / nodes.length) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }

    function triggerWin() {
        gameState = 'victory';
        finalAlignTime = (Date.now() - startTime) / 1000;
        playVictorySound();
        spawnVictoryParticles();
        stopAllAudio();

        setTimeout(() => {
            showMenu('RESONANCE ACHIEVED', `All 5 souls fully merged in ${finalAlignTime.toFixed(2)}s!`, 'OBSERVE AGAIN');
        }, 1500);
    }

    function triggerFail() {
        gameState = 'failed';
        playFailureSound();
        stopAllAudio();
        
        const mergedCount = nodes.filter(n => n.state === 'merged').length;
        showMenu('RESONANCE COMPLETED', `Time expired. ${mergedCount} out of 5 souls reached the core.`, 'OBSERVE AGAIN');
    }

    // --- GAME LOOP ---
    function animate() {
        // Clear screen with beautiful trail persistence
        ctx.fillStyle = 'rgba(4, 2, 10, 0.28)';
        ctx.fillRect(0, 0, width, height);

        // Draw Starry BG Jitters
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let i = 0; i < 10; i++) {
            let sx = (cx * (1 + Math.sin(Date.now() * 0.0007 * (i + 1)))) % width;
            let sy = (cy * (1 + Math.cos(Date.now() * 0.0011 * (i + 1)))) % height;
            ctx.fillRect(sx, sy, 1.2, 1.2);
        }

        // Draw concentric orbit tracks
        ctx.save();
        ctx.strokeStyle = 'rgba(140, 133, 166, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        [ORBIT_RADII[3], ORBIT_RADII[2], ORBIT_RADII[1]].forEach(radius => {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.restore();

        // Draw active Resonance Beams
        ctx.save();
        nodes.forEach(node => {
            if (node.state === 'orbiting' && node.activeResNode) {
                const partner = node.activeResNode;
                const ax = cx + Math.cos(node.angle) * node.radius;
                const ay = cy + Math.sin(node.angle) * node.radius;
                const bx = cx + Math.cos(partner.angle) * partner.radius;
                const by = cy + Math.sin(partner.angle) * partner.radius;

                // Gradient glowing line
                const grad = ctx.createLinearGradient(ax, ay, bx, by);
                grad.addColorStop(0, node.color);
                grad.addColorStop(1, partner.color);

                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.0;
                ctx.shadowBlur = 10;
                ctx.shadowColor = node.color;
                ctx.stroke();
                ctx.closePath();

                // Reset relationship mapping
                node.activeResNode = null;
            }
        });
        ctx.restore();

        // Draw Barriers
        barriers.forEach(barrier => {
            let radius = ORBIT_RADII[barrier.orbit];
            if (barrier.orbit === 0) {
                radius = 32; // Core shield placement
            }
            
            ctx.save();
            ctx.beginPath();
            let startArc = barrier.angle - barrier.span / 2;
            let endArc = barrier.angle + barrier.span / 2;
            ctx.arc(cx, cy, radius, startArc, endArc);
            
            ctx.lineWidth = barrier.orbit === 0 ? 5 : 7;
            ctx.strokeStyle = barrier.color;
            ctx.lineCap = 'round';
            
            ctx.shadowBlur = 12;
            ctx.shadowColor = barrier.color;
            
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        });

        // Draw Center Core (Target star)
        if (gameState !== 'menu') {
            core.pulse = Math.sin(Date.now() * 0.005) * 2;
            let currentCoreRadius = core.radius + core.pulse;
            
            // Add merge absorption expansion flash
            let extraGlow = 0;
            if (core.glowTimer > 0) {
                extraGlow = core.glowTimer * 0.8;
                core.glowTimer--;
            }

            ctx.save();
            // Core outer resonance glow ring
            ctx.beginPath();
            ctx.arc(cx, cy, currentCoreRadius + 6 + extraGlow, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 190, 11, ${0.15 + (extraGlow / 30)})`;
            ctx.lineWidth = 1.5 + extraGlow * 0.25;
            ctx.stroke();
            ctx.closePath();

            // Core portal body
            ctx.beginPath();
            ctx.arc(cx, cy, currentCoreRadius + extraGlow * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = core.color;
            ctx.shadowBlur = 20 + extraGlow * 1.5;
            ctx.shadowColor = core.color;
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }

        // Draw Soul Nodes
        nodes.forEach(node => {
            if (node.state === 'merged') return;

            // Draw trail
            for (let i = 0; i < node.trail.length; i++) {
                let t = node.trail[i];
                let alpha = ((i + 1) / node.trail.length) * 0.35;
                let size = ((i + 1) / node.trail.length) * node.size;
                
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.globalAlpha = alpha;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.closePath();
            }

            // Draw node orb
            const sx = cx + Math.cos(node.angle) * node.radius;
            const sy = cy + Math.sin(node.angle) * node.radius;

            ctx.save();
            ctx.beginPath();
            
            // If charging up for a jump, draw a white inner core to suggest anticipation
            ctx.arc(sx, sy, node.size + (node.jumpCooldown < 30 && node.state === 'orbiting' ? Math.sin(Date.now() * 0.2) * 1.5 : 0), 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.shadowBlur = node.state === 'jumping' ? 16 : 10;
            ctx.shadowColor = node.color;
            ctx.fill();
            ctx.closePath();
            
            if (node.jumpCooldown < 30 && node.state === 'orbiting') {
                ctx.beginPath();
                ctx.arc(sx, sy, node.size * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.closePath();
            }
            
            ctx.restore();
        });

        // Update & Draw Particles
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
            ctx.shadowBlur = 8;
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
        
        if (title.includes('ACHIEVED')) {
            overlayTitle.style.color = '#ffbe0b';
            overlayTitle.style.textShadow = '0 0 20px rgba(255, 190, 11, 0.4)';
        } else if (title.includes('COMPLETED')) {
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

    function startSimulation() {
        initAudio();
        hideMenu();

        // Initialize 5 soul nodes
        nodes = [];
        for (let i = 0; i < 5; i++) {
            nodes.push({
                id: i,
                orbit: 3,
                radius: ORBIT_RADII[3],
                angle: (i * (Math.PI * 2 / 5)) + (Math.random() * 0.4), // Equally spaced with slight jitter
                speed: 0.015 + Math.random() * 0.008,
                color: colors[i],
                state: 'orbiting',
                jumpProgress: 0,
                sourceRadius: 0,
                targetRadius: 0,
                // Random jump cooldown (approx 2 to 4.5 seconds initial wait)
                jumpCooldown: 120 + Math.floor(Math.random() * 150),
                trail: [],
                size: 5.5,
                activeResNode: null
            });
        }

        // Randomize barrier start positions
        barriers[0].angle = Math.random() * Math.PI * 2;
        barriers[1].angle = barriers[0].angle + Math.PI;
        barriers[2].angle = Math.random() * Math.PI * 2;
        barriers[3].angle = barriers[2].angle + Math.PI;
        barriers[4].angle = Math.random() * Math.PI * 2;

        particles = [];
        startTime = Date.now();
        gameState = 'playing';
        progressBar.style.width = '0%';
        timerElement.innerText = '15.00s';
    }

    // Connect trigger
    actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startSimulation();
    });

    // Handle double click in empty body area for fullscreen
    document.body.addEventListener('dblclick', (e) => {
        if (e.target === document.body || e.target === document.documentElement) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    });

    // Initial draw to fill canvas background and orbit tracks
    animate();
});
