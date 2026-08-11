export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function initials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const first = partes[0]?.[0] ?? '';
  const last = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
