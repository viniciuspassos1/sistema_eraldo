import { useEffect, useState } from 'react';

// Simula o tempo de uma requisição real, já que os dados hoje são mockados
// e chegam instantaneamente. Existe só para dar lugar ao skeleton loading —
// quando o backend real entrar, isso vira o estado de loading de verdade.
export function useMockLoading(ms = 220): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(id);
  }, [ms]);

  return loading;
}
