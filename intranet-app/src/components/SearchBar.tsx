import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function SearchBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* A partir de sm: campo de busca sempre visível no header */}
      <div className="relative w-full max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          placeholder="Pesquisar na intranet..."
          className="w-full bg-cream border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-navy placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60"
        />
      </div>

      {/* Abaixo de sm: ícone que abre a busca em tela cheia — a funcionalidade
          continua disponível, só muda a forma de acessar. */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cream text-navy transition-colors duration-150"
        aria-label="Pesquisar"
      >
        <Search className="w-[18px] h-[18px]" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.15, ease: 'easeOut' }}
            className="sm:hidden fixed inset-0 z-[45] bg-white flex items-center gap-3 px-4 h-16"
          >
            <Search className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Pesquisar na intranet..."
              className="flex-1 min-w-0 bg-transparent text-sm text-navy placeholder:text-text-secondary focus:outline-none"
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cream text-navy transition-colors duration-150 shrink-0"
              aria-label="Fechar busca"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
