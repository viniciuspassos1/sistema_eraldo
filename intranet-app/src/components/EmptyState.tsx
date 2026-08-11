import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-navy/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-navy/40" strokeWidth={1.5} />
      </div>
      <p className="text-navy font-medium text-sm">{title}</p>
      {description && <p className="text-text-secondary text-sm mt-1 max-w-sm">{description}</p>}
    </div>
  );
}
