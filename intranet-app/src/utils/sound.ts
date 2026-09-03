let audioCtx: AudioContext | null = null;

const CICLOS = 8; // repete o "bip-bip" 8x, ~10s de duração total
const INTERVALO_CICLO = 1.3;
const GANHO_PICO = 0.7; // bem mais alto que antes (era 0.25)

/** Repete um "bip-bip" (dois tons) por ~10s via Web Audio API — sem depender
 * de arquivo de áudio externo. Se o navegador bloquear (ex.: sem interação
 * do usuário ainda), falha silenciosamente e o alerta visual (toast)
 * continua normal. */
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
    for (let ciclo = 0; ciclo < CICLOS; ciclo++) {
      const base = now + ciclo * INTERVALO_CICLO;
      [0, 0.18].forEach((delay, i) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 0 ? 880 : 1046.5;
        gain.gain.setValueAtTime(0.0001, base + delay);
        gain.gain.exponentialRampToValueAtTime(GANHO_PICO, base + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, base + delay + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(base + delay);
        osc.stop(base + delay + 0.22);
      });
    }
  } catch {
    // Web Audio indisponível — alerta visual continua funcionando normalmente.
  }
}
