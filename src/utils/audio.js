let audioCtx = null;

export const getAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

export const playNote = (freq = 440, volume = 0.1, type = 'sine') => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
};

export const playVictoryBurst = () => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    // C major 9 arp
    const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99, 1046.50];
    
    notes.forEach((freq, index) => {
        const delay = index * 0.1;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.5);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 2.6);
    });
};
