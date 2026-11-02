export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function SuggestionSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-1.5" aria-label="Загрузка">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className={`h-3.5 ${["w-3/4", "w-2/3", "w-4/5", "w-3/5"][i]}`} />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
