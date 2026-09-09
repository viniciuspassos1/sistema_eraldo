import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-navy/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative bg-white rounded-xl shadow-soft-lg w-full max-w-md max-h-[85vh] flex flex-col"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98, y: reduceMotion ? 0 : 4 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-serif text-lg text-navy">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-cream hover:text-navy transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Só o conteúdo rola — cabeçalho e rodapé (com o botão Salvar)
                ficam sempre visíveis, mesmo num formulário comprido numa
                tela baixa (celular deitado, notebook pequeno). */}
            <div className="px-6 py-5 overflow-y-auto min-h-0">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
