import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';

export function LoadingBlock({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading" data-testid="status-loading">
      {Array.from({ length: lines }).map((_, index) => <div key={index} className={`skeleton h-16 rounded-2xl ${index === 0 ? 'w-full' : index % 2 ? 'w-[88%]' : 'w-[72%]'}`} />)}
    </div>
  );
}

export function ErrorBlock({ onRetry, message = 'The workspace could not reach the analytics service.' }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center" data-testid="status-error">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle size={21} /></span>
      <h2 className="mt-4 text-lg font-semibold">A signal went quiet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5" data-testid="button-retry">
        <RotateCcw size={15} /> Try again
      </button>
    </div>
  );
}

export function EmptyBlock({ message = 'There is no data to display yet.' }: { message?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center" data-testid="status-empty">
      <Inbox size={28} className="text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Once the service has a result, it will appear here.</p>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label-kicker">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-[1.35rem]">{title}</h2>
        {detail && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}