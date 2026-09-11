import { useLocation, useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';

export function FloatingAIButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/assistente-ia') return null;

  return (
    <button
      onClick={() => navigate('/assistente-ia')}
      aria-label="Central de Ajuda"
      className="fixed bottom-24 right-4 sm:right-6 lg:bottom-6 z-40 flex items-center gap-2 bg-navy text-white p-3.5 sm:pl-4 sm:pr-5 sm:py-3 rounded-full shadow-soft-lg hover:bg-navy-light transition-colors"
    >
      <Bot className="w-[18px] h-[18px] text-gold" />
      <span className="hidden sm:inline text-sm font-medium">Central de Ajuda</span>
    </button>
  );
}
