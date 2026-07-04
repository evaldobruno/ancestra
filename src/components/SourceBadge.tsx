"use client";

// Small indicator showing whether data comes from Supabase (live) or demo,
// plus a loading skeleton grid. Shared by the Members and Tree pages.

export function SourceBadge({ source, loading }: { source: "supabase" | "demo"; loading: boolean }) {
  if (loading) return <span className="text-xs text-stone-400">⏳</span>;
  return source === "supabase" ? (
    <span className="text-xs text-sage-600">● Supabase</span>
  ) : (
    <span className="text-xs text-amber-600">● demo</span>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-stone-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-brand-100 dark:bg-stone-800" />
              <div className="h-3 w-1/3 rounded bg-brand-50 dark:bg-stone-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
