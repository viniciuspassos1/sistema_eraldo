import { cn } from '../utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} />;
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white border border-border rounded-xl shadow-soft p-6 flex items-center gap-4">
      <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-xl shadow-soft p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <Skeleton className="h-3.5 w-full max-w-[10rem]" />
        </td>
      ))}
    </tr>
  );
}

// Fallback genérico do Suspense ao carregar o chunk de uma página sob
// demanda — aproxima a estrutura típica de uma tela (título → cards →
// conteúdo principal) em vez de deixar a área em branco durante o load.
export function RouteSkeleton() {
  return (
    <div className="max-w-6xl space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
