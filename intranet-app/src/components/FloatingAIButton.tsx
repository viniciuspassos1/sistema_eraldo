import { useLocation, useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';

export function FloatingAIButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/assistente-ia') return null;

  return (
    <button
      onClick={() => navigate('/assistente-ia')}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-navy text-white pl-4 pr-5 py-3 rounded-full shadow-soft-lg hover:bg-navy-light transition-colors"
    >
      <Bot className="w-[18px] h-[18px] text-gold" />
      <span className="text-sm font-medium">Pergunte à Intranet</span>
    </button>
  );
}
