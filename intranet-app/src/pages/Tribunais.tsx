import { useState } from 'react';
import { Link2, ExternalLink } from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { courtLinks } from '../mocks/courtLinks';

export function Tribunais() {
  const [busca, setBusca] = useState('');

  const filtrados = courtLinks.filter((c) =>
    `${c.nome} ${c.descricao} ${c.categoria}`.toLowerCase().includes(busca.toLowerCase())
  );

  const categorias = Array.from(new Set(filtrados.map((c) => c.categoria)));

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gold" /> Portais Jurídicos
        </h1>
        <p className="text-text-secondary text-sm mt-1">Links rápidos para tribunais e sistemas utilizados pelo escritório.</p>
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Pesquisar tribunal..."
        className="w-full sm:max-w-sm bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 transition-shadow duration-150"
      />

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState icon={Link2} title="Nenhum tribunal encontrado" description="Tente pesquisar por outro termo." />
        </Card>
      ) : (
        <div className="space-y-6">
          {categorias.map((cat) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">{cat}</h2>
              <div className="stagger-fade grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                {filtrados
                  .filter((c) => c.categoria === cat)
                  .map((c) => (
                    <div key={c.id}>
                      <Card className="flex flex-col h-full">
                        <p className="text-sm font-semibold text-navy">{c.nome}</p>
                        <p className="text-xs text-text-secondary mt-1 flex-1">{c.descricao}</p>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-navy text-white rounded-lg py-2 hover:bg-navy-light transition-colors duration-150"
                        >
                          Acessar <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Card>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
