// Gera uma mini-série de 7 pontos terminando no valor atual — usada como
// sparkline decorativa nos StatCards. Determinística (mesmo seed = mesma
// curva), já que os dados aqui são mockados e não existe histórico real.
export function buildTrend(base: number, seed: number): number[] {
  const points: number[] = [];
  for (let i = 0; i < 7; i++) {
    const wave = Math.sin((i + seed) * 1.3) * Math.max(1, base * 0.18);
    const drift = (6 - i) * base * 0.03;
    points.push(Math.max(0, Math.round(base - wave - drift)));
  }
  points[points.length - 1] = base;
  return points;
}
