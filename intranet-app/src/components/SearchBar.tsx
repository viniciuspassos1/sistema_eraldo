import { Search } from 'lucide-react';

export function SearchBar() {
  return (
    <div className="relative w-full max-w-md hidden sm:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        placeholder="Pesquisar na intranet..."
        className="w-full bg-cream border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-navy placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60"
      />
    </div>
  );
}
