export interface DiaNota {
  id: string;
  hora: string;
  texto: string;
}

function storageKey(iso: string): string {
  return `agenda-anotacoes-${iso}`;
}

export function loadNotas(iso: string): DiaNota[] {
  try {
    const raw = localStorage.getItem(storageKey(iso));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotas(iso: string, notas: DiaNota[]) {
  localStorage.setItem(storageKey(iso), JSON.stringify(notas));
}
