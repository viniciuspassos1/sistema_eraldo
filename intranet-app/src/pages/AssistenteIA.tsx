import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Bot, Send, FileSearch, Briefcase, MessageSquareText, type LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiAnswers, fallbackAnswer } from '../mocks/aiKnowledge';
import { communicationAnswers, communicationFallback } from '../mocks/communicationKnowledge';
import type { ChatMessage } from '../types';

interface AssistantConfig {
  id: string;
  label: string;
  descricao: string;
  icon: LucideIcon;
  examples: string[];
  answerFor: (question: string) => { texto: string; fonte?: string };
}

function buildAnswerFn(
  base: typeof aiAnswers,
  fallback: string
): AssistantConfig['answerFor'] {
  return (question: string) => {
    const q = question.toLowerCase();
    const match = base.find((a) => a.keywords.some((k) => q.includes(k)));
    if (match) return { texto: match.resposta, fonte: match.fonte };
    return { texto: fallback };
  };
}

const ASSISTANTS: AssistantConfig[] = [
  {
    id: 'geral',
    label: 'Processos Gerais',
    descricao: 'Consulta a base de conhecimento, documentos, agenda, audiências, férias e funcionários.',
    icon: Briefcase,
    examples: [
      'Quando são minhas próximas férias?',
      'Quais audiências tenho amanhã?',
      'Qual o link do TJBA?',
      'Quem está de férias este mês?',
      'Qual documento fala sobre atendimento?',
    ],
    answerFor: buildAnswerFn(aiAnswers, fallbackAnswer),
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    descricao: 'Ajuda a organizar avisos, e-mails e respostas para deixar a comunicação mais clara e objetiva.',
    icon: MessageSquareText,
    examples: [
      'Como escrever um aviso sobre mudança de horário?',
      'Modelo para comunicar um adiamento de audiência',
      'Resposta educada para reclamação de cliente',
      'Como deixar este texto mais objetivo?',
      'Estrutura de e-mail para cliente',
    ],
    answerFor: buildAnswerFn(communicationAnswers, communicationFallback),
  },
];

export function AssistenteIA() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState(ASSISTANTS[0].id);
  const [messagesByTab, setMessagesByTab] = useState<Record<string, ChatMessage[]>>(
    Object.fromEntries(ASSISTANTS.map((a) => [a.id, []]))
  );
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = ASSISTANTS.find((a) => a.id === activeId)!;
  const messages = messagesByTab[activeId];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function send(question: string) {
    const texto = question.trim();
    if (!texto) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      autor: 'usuario',
      texto,
      data: new Date().toISOString(),
    };
    setMessagesByTab((prev) => ({ ...prev, [activeId]: [...prev[activeId], userMsg] }));
    setInput('');
    setThinking(true);

    await new Promise((r) => setTimeout(r, 500));

    const { texto: resposta, fonte } = active.answerFor(texto);
    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      autor: 'ia',
      texto: resposta,
      fonte,
      data: new Date().toISOString(),
    };
    setMessagesByTab((prev) => ({ ...prev, [activeId]: [...prev[activeId], aiMsg] }));
    setThinking(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-navy flex items-center gap-2">
          <Bot className="w-5 h-5 text-gold" /> Assistente do Escritório
        </h1>
        <p className="text-text-secondary text-sm mt-1">{active.descricao}</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-0">
        {ASSISTANTS.map((a) => {
          const isActive = a.id === activeId;
          return (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-navy' : 'text-text-secondary hover:text-navy'
              }`}
            >
              <a.icon className="w-4 h-4" strokeWidth={1.75} />
              {a.label}
              {isActive && (
                <motion.span
                  layoutId="assistente-tab-indicator"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-gold"
                  transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1 flex flex-col">
        <div key={activeId} aria-hidden className="card-glow-pulse pointer-events-none absolute inset-y-0 -inset-x-1 z-0" />
        <div className="relative z-10 flex-1 bg-white border border-t-0 border-border rounded-b-xl shadow-soft flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-gold" />
                </div>
                <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-navy max-w-md">
                  Olá, {user?.nome.split(' ')[0]}. Como posso ajudar com {active.label.toLowerCase()}?
                </div>
              </div>

              <div className="mt-5 pl-11 flex flex-wrap gap-2">
                {active.examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="text-xs text-navy border border-border rounded-full px-3 py-1.5 hover:border-gold/50 hover:bg-gold/5"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.autor === 'usuario' ? (
              <div key={m.id} className="flex justify-end">
                <div className="bg-navy text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-md">
                  {m.texto}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-gold" />
                </div>
                <div className="max-w-md">
                  <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-navy whitespace-pre-line">
                    {m.texto}
                  </div>
                  {m.fonte && (
                    <div className="flex items-center gap-1.5 mt-1.5 pl-1 text-xs text-text-secondary">
                      <FileSearch className="w-3.5 h-3.5" />
                      Fonte: {m.fonte}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-gold" />
              </div>
              <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-navy/30 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-navy/30 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-navy/30 animate-bounce" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            className="flex-1 bg-cream border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="bg-navy text-white rounded-lg px-4 flex items-center justify-center hover:bg-navy-light disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
