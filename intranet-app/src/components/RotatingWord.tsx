import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface RotatingWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export function RotatingWord({ words, intervalMs = 3000, className }: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[index]}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`inline-block whitespace-nowrap ${className ?? ''}`}
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}
