import React, { useRef, useEffect, useState } from "react";
import styles from "./HarmonicBounces.module.css";
import {
  getAudioContext,
  playNote,
  playVictoryBurst,
} from "../../../utils/audio";

const PENTATONIC_SCALE = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
];

export default function HarmonicBounces() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("menu"); // 'menu', 'playing', 'victory'
  const [timeLeft, setTimeLeft] = useState(15.0);

  useEffect(() => {
    if (gameState !== "playing") return;

    const cw = 360;
    const ch = 540;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Support crisp canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    let startTime = Date.now();
    let animationFrameId;

    let balls = [
      {
        x: cw / 2,
        y: ch / 2 - 100,
        vx: 3,
        vy: -3,
        radius: 8,
        color: "#00f2fe",
        trail: [],
      },
    ];
    let particles = [];
    let echoSparks = [];
    let lastSplitTime = 0;
    
    // Core state
    let coreCharge = 0;
    let visualCharge = 0;
    const MAX_CHARGE = 100;
    let baseCoreRadius = 80;
    
    let hasWon = false;

    const spawnParticles = (x, y, color, count = 6) => {
      for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 1 + Math.random() * 3;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1.0,
          size: 2 + Math.random() * 2,
          decay: 0.02 + Math.random() * 0.03,
        });
      }
    };
    
    const spawnEchoSpark = (x, y, color) => {
      echoSparks.push({
        x, y, color, alpha: 1.0
      });
    };

    const renderLoop = () => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      let remaining = Math.max(0, 15 - elapsed);

      if (!hasWon) {
        setTimeLeft(remaining);
      }

      // Dark background
      ctx.fillStyle = "rgba(5, 5, 10, 0.35)";
      ctx.fillRect(0, 0, cw, ch);

      if (remaining <= 0 && gameState === "playing" && !hasWon) {
        hasWon = true; 
        setGameState("failed");
        return;
      }

      if (coreCharge >= MAX_CHARGE && gameState === "playing" && !hasWon) {
        hasWon = true;
        endGame();
        return;
      }

      // Smooth visual charge growth
      visualCharge += (coreCharge - visualCharge) * 0.1;
      const chargePercent = Math.min(1, visualCharge / MAX_CHARGE);

      // Split balls
      if (elapsed > 2.0 && lastSplitTime === 0) {
        lastSplitTime = 2.0;
        splitBalls();
      } else if (elapsed > 6.0 && lastSplitTime === 2.0) {
        lastSplitTime = 6.0;
        splitBalls();
      } else if (elapsed > 10.0 && lastSplitTime === 6.0) {
        lastSplitTime = 10.0;
        splitBalls();
      }

      // Draw Central Core
      ctx.save();
      const pulse = Math.sin(now * 0.005) * (2 + chargePercent * 8);
      const currentRadius = baseCoreRadius + pulse;
      
      // Outer Glow Ring
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, currentRadius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + chargePercent * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Progressive Fill Effect (Liquid-like)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, currentRadius, 0, Math.PI * 2);
      ctx.clip(); // Clip to circle

      // Draw the fill
      const fillHeight = currentRadius * 2 * chargePercent;
      const fillY = (ch / 2 + currentRadius) - fillHeight;
      
      const coreColorLower = `rgba(${Math.floor(0 + chargePercent * 150)}, ${Math.floor(242 - chargePercent * 100)}, 254, 0.8)`;
      const coreColorUpper = `rgba(${Math.floor(155 + chargePercent * 100)}, 0, 255, 0.9)`;
      
      const grad = ctx.createLinearGradient(0, ch / 2 + currentRadius, 0, ch / 2 - currentRadius);
      grad.addColorStop(0, coreColorLower);
      grad.addColorStop(1, coreColorUpper);
      
      ctx.fillStyle = grad;
      ctx.fillRect(cw/2 - currentRadius, fillY, currentRadius * 2, fillHeight);
      
      // Wave effect at top of fill
      if (chargePercent > 0 && chargePercent < 1) {
        ctx.beginPath();
        for(let i = -currentRadius; i <= currentRadius; i++) {
            const wave = Math.sin(i * 0.05 + now * 0.01) * 3;
            ctx.lineTo(cw/2 + i, fillY + wave);
        }
        ctx.lineTo(cw/2 + currentRadius, ch/2 + currentRadius);
        ctx.lineTo(cw/2 - currentRadius, ch/2 + currentRadius);
        ctx.fill();
      }

      ctx.restore();

      // Core Background stroke
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Timer in center
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(remaining.toFixed(2), cw / 2, ch / 2 - 10);
      
      // Percentage below timer
      ctx.font = "bold 18px monospace";
      ctx.globalAlpha = 0.8;
      ctx.fillText(`${Math.floor(chargePercent * 100)}%`, cw / 2, ch / 2 + 25);
      ctx.restore();

      // Update and Draw balls
      balls.forEach((ball, bIdx) => {
        // Trail
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 20) ball.trail.shift();

        // Normal physics
        ball.vy += 0.12; // Gravity
        ball.x += ball.vx;
        ball.y += ball.vy;

        let hit = false;
        // Wall collisions
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx *= -1.02; // slight energy gain
          hit = true;
        } else if (ball.x + ball.radius > cw) {
          ball.x = cw - ball.radius;
          ball.vx *= -1.02;
          hit = true;
        }
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy *= -1.02;
          hit = true;
        } else if (ball.y + ball.radius > ch) {
          ball.y = ch - ball.radius;
          ball.vy *= -1.02;
          // Friction on floor to prevent wild bouncing out of bounds
          ball.vy *= 0.95; 
          hit = true;
        }

        // Collision with core
        const distToCore = Math.sqrt((ball.x - cw/2)**2 + (ball.y - ch/2)**2);
        if (distToCore < currentRadius + ball.radius) {
            const nx = (ball.x - cw/2) / distToCore;
            const ny = (ball.y - ch/2) / distToCore;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2 * dot * nx) * 1.05;
            ball.vy = (ball.vy - 2 * dot * ny) * 1.05;
            ball.x = cw/2 + nx * (currentRadius + ball.radius + 1);
            ball.y = ch/2 + ny * (currentRadius + ball.radius + 1);
            hit = true;
        }

        // Cap speed
        const speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
        if (speed > 10) {
          ball.vx = (ball.vx / speed) * 10;
          ball.vy = (ball.vy / speed) * 10;
        }

        if (hit && !hasWon) {
          const freq = PENTATONIC_SCALE[Math.floor(Math.random() * PENTATONIC_SCALE.length)];
          playNote(freq, 0.05, "triangle");
          spawnParticles(ball.x, ball.y, ball.color, 5);
          spawnEchoSpark(ball.x, ball.y, ball.color);
          
          coreCharge += 1.8;
          
          ball.vx += (Math.random() - 0.5) * 0.5;
          ball.vy += (Math.random() - 0.5) * 0.5;
        }
        
        // Draw trail
        ball.trail.forEach((t, i) => {
          ctx.beginPath();
          ctx.arc(
            t.x,
            t.y,
            ((i + 1) / ball.trail.length) * ball.radius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = ball.color;
          ctx.globalAlpha = ((i + 1) / ball.trail.length) * 0.5;
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = ball.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw and update Echo Sparks (fly to center)
      for (let i = echoSparks.length - 1; i >= 0; i--) {
        const spark = echoSparks[i];
        const dx = cw / 2 - spark.x;
        const dy = ch / 2 - spark.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < currentRadius) {
          echoSparks.splice(i, 1);
          continue;
        }
        
        // Move towards center
        spark.x += (dx / dist) * 18;
        spark.y += (dy / dist) * 18;
        
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = spark.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = spark.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw and update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    const splitBalls = () => {
      const colors = ["#00f2fe", "#ff007f", "#9b30ff", "#ffbe0b"];
      const newBalls = [];
      balls.forEach((ball) => {
        newBalls.push(ball);
        newBalls.push({
          x: ball.x,
          y: ball.y,
          vx: -ball.vx + (Math.random() - 0.5),
          vy: -ball.vy + (Math.random() - 0.5),
          radius: ball.radius * 0.85,
          color: colors[Math.floor(Math.random() * colors.length)],
          trail: [],
        });
      });
      balls = newBalls;
    };

    const endGame = () => {
      setGameState("victory");
      playVictoryBurst();
      drawVictory();
    };

    const drawVictory = () => {
      // Big explosion at the center
      const particles = [];
      const colors = ["#00f2fe", "#ff007f", "#9b30ff", "#ffbe0b", "#ffffff"];
      for (let i = 0; i < 200; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 2 + Math.random() * 8;
        particles.push({
          x: cw / 2,
          y: ch / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
          size: 2 + Math.random() * 5,
          decay: 0.01 + Math.random() * 0.02,
        });
      }

      const animateVictory = () => {
        ctx.fillStyle = "rgba(5, 5, 10, 0.4)";
        ctx.fillRect(0, 0, cw, ch);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;

        if (particles.length > 0) {
          requestAnimationFrame(animateVictory);
        }
      };

      animateVictory();
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  const handleStart = () => {
    getAudioContext(); // Initialize audio context on user interaction
    setGameState("playing");
    setTimeLeft(15.0);
  };

  const handleReset = () => {
    setGameState("menu");
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.title}>Harmonic Bounces</h2>
      </header>

      <div className={styles.gameContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />

        {gameState === "menu" && (
          <div className={styles.overlay}>
            <div className={styles.menuContent}>
              <div className={styles.pulseOrb}></div>
              <h3>CHARGE THE CORE</h3>
              <p>
                The central core needs energy. Allow the chaotic echoes to bounce and
                charge it to 100% within 15 seconds.
              </p>
              <button className={styles.actionBtn} onClick={handleStart}>
                RELEASE ECHOES
              </button>
            </div>
          </div>
        )}

        {gameState === "failed" && (
          <div className={styles.endOverlay}>
            <h2 className={styles.victoryText} style={{color: '#ff007f', textShadow: '0 0 20px #ff007f, 0 0 40px #9b30ff'}}>TIME EXPIRED</h2>
            <button className={styles.resetBtn} onClick={handleReset}>ATTEMPT AGAIN</button>
          </div>
        )}

        {gameState === "victory" && (
          <div className={styles.endOverlay}>
            <h2 className={styles.victoryText}>HARMONY ACHIEVED</h2>
            <button className={styles.resetBtn} onClick={handleReset}>
              OBSERVE AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
