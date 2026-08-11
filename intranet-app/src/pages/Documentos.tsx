import { useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { documents, documentCategories } from '../mocks/documents';
import { formatDate } from '../utils/format';

export function Documentos() {
  const [categoria, setCategoria] = useState('todas');
  const [busca, setBusca] = useState('');

  const filtrados = documents.filter((d) => {
    if (categoria !== 'todas' && d.categoria !== categoria) return false;
    if (busca && !`${d.titulo} ${d.tags.join(' ')}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold" /> Documentos
          </h1>
          <p className="text-text-secondary text-sm mt-1">Biblioteca de documentos do escritório.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoria('todas')}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            categoria === 'todas' ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:bg-cream'
          }`}
        >
          Todas
        </button>
        {documentCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              categoria === c ? 'bg-navy text-white border-navy' : 'border-border text-navy hover:bg-cream'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Pesquisar documentos..."
        className="w-full sm:max-w-sm bg-white border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
      />

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Nenhum documento encontrado"
            description="Tente ajustar a categoria ou o termo pesquisado."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-navy/8 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-navy" strokeWidth={1.75} />
                </div>
                <Badge tone={d.status === 'PUBLICADO' ? 'success' : 'neutral'}>{d.status}</Badge>
              </div>
              <p className="text-sm font-medium text-navy leading-snug">{d.titulo}</p>
              <p className="text-xs text-text-secondary mt-1">{d.categoria} · {d.tamanho}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {d.tags.map((t) => (
                  <span key={t} className="text-[11px] text-text-secondary bg-cream px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-[11px] text-text-secondary">Atualizado em {formatDate(d.atualizadoEm)}</span>
                <div className="flex gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cream text-navy" aria-label="Visualizar">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cream text-navy" aria-label="Baixar">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
