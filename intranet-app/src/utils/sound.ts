let audioCtx: AudioContext | null = null;

/** Dois bips curtos via Web Audio API — sem depender de arquivo de áudio
 * externo. Se o navegador bloquear (ex.: sem interação do usuário ainda),
 * falha silenciosamente e o alerta visual (toast) continua normal. */
export function playAlertSound() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    [0, 0.18].forEach((delay, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1046.5;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.16);
    });
  } catch {
    // Web Audio indisponível — alerta visual continua funcionando normalmente.
  }
}
