export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameMonth(iso: string, refDate: Date): boolean {
  const [, m] = iso.split('-');
  return Number(m) === refDate.getMonth() + 1;
}

export function daysUntilNextOccurrence(monthDay: string): number {
  // monthDay: "YYYY-MM-DD" (ano é ignorado, considera o próximo aniversário/data recorrente)
  const [, mm, dd] = monthDay.split('-').map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();
  let next = new Date(thisYear, mm - 1, dd);
  next.setHours(0, 0, 0, 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < todayStart) {
    next = new Date(thisYear + 1, mm - 1, dd);
  }
  return Math.round((next.getTime() - todayStart.getTime()) / 86400000);
}
