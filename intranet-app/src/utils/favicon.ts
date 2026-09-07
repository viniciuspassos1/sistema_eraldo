const FAVICON_HREF = '/favicon.png';
let faviconAlertaCache: string | null = null;

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="icon"]');
}

/** Desenha o favicon atual num canvas e soma uma bolinha vermelha no canto —
 * o mesmo padrão de "notificação pendente" usado em apps de e-mail/chat.
 * Gerado uma vez só e cacheado: trocar o favicon depois é só reatribuir o
 * href já pronto, sem recriar o canvas a cada notificação. */
async function gerarFaviconComBadge(): Promise<string> {
  if (faviconAlertaCache) return faviconAlertaCache;

  const img = new Image();
  img.src = FAVICON_HREF;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('favicon indisponível'));
  });

  const tamanho = 64;
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');

  ctx.drawImage(img, 0, 0, tamanho, tamanho);

  const raio = tamanho * 0.2;
  const cx = tamanho - raio - 2;
  const cy = raio + 2;
  ctx.beginPath();
  ctx.arc(cx, cy, raio + 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.fillStyle = '#e11d48';
  ctx.fill();

  faviconAlertaCache = canvas.toDataURL('image/png');
  return faviconAlertaCache;
}

export async function ativarFaviconAlerta(): Promise<void> {
  const link = getFaviconLink();
  if (!link) return;
  try {
    link.href = await gerarFaviconComBadge();
  } catch {
    // Sem canvas/Image disponível (ambiente incomum) — segue sem o selo no
    // favicon; o pop-up e o som continuam avisando normalmente.
  }
}

export function restaurarFavicon(): void {
  const link = getFaviconLink();
  if (link) link.href = FAVICON_HREF;
}
