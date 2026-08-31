import { Activity, BarChart3, BrainCircuit, ChevronRight, CircleGauge, Menu, ScanSearch, Sparkles, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { getHealthCheckQueryKey, useHealthCheck } from '@workspace/api-client-react';

const navItems = [
  { href: '/dashboard', label: 'Dataset overview', short: 'Overview', icon: BarChart3 },
  { href: '/predict', label: 'Predict retention risk', short: 'Predict', icon: ScanSearch },
  { href: '/insights', label: 'Model insights', short: 'Model', icon: BrainCircuit },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const healthy = health.data?.status?.toLowerCase() === 'ok' || health.data?.status?.toLowerCase() === 'healthy';

  return (
    <div className="app-shell noise-overlay flex bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground shadow-xl transition-transform duration-200 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between px-3">
          <Link href="/" className="group flex items-center gap-3" data-testid="link-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm transition-transform group-hover:-rotate-3">
              <CircleGauge size={21} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block font-mono text-[0.64rem] font-bold uppercase tracking-[0.18em] text-sidebar-primary">People / signal</span>
              <span className="mt-0.5 block text-[1.02rem] font-semibold tracking-tight">Attrition lab</span>
            </span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" aria-label="Close navigation" data-testid="button-close-navigation">
            <X size={18} />
          </button>
        </div>

        <div className="mt-12 px-3">
          <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.17em] text-sidebar-foreground/45">Workspace</p>
          <nav className="mt-3 space-y-1.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  href={href}
                  key={href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-all duration-150 ${active ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
                  data-testid={`link-nav-${href.slice(1)}`}
                >
                  <span className="flex items-center gap-3"><Icon size={17} /><span>{label}</span></span>
                  <ChevronRight size={15} className={`transition-transform ${active ? 'translate-x-0 opacity-70' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto space-y-4">
          <div className="mx-2 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold"><Activity size={14} className={healthy ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'} /> API connection</div>
            <div className="mt-2 flex items-center gap-2 text-[0.7rem] text-sidebar-foreground/60" data-testid="status-api-connection">
              <span className={`h-1.5 w-1.5 rounded-full ${health.isLoading ? 'bg-sidebar-foreground/40' : healthy ? 'bg-sidebar-primary' : 'bg-destructive'}`} />
              {health.isLoading ? 'Checking service…' : healthy ? 'Service ready' : 'Service unavailable'}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 text-[0.68rem] text-sidebar-foreground/40">
            <Sparkles size={13} />
            <span>IBM HR analytics / course studio</span>
          </div>
        </div>
      </aside>

      {mobileOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-sidebar/35 md:hidden" data-testid="button-navigation-overlay" />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md md:px-9">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Open navigation" data-testid="button-open-navigation">
            <Menu size={20} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span className="font-mono uppercase tracking-[0.14em]">HR / analytics workspace</span>
            <span className="h-1 w-1 rounded-full bg-accent" />
            <span>Decision support, not destiny</span>
          </div>
          {/* <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">AIML engineering project</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[0.68rem] font-bold text-primary-foreground" data-testid="avatar-workspace">AL</span>
          </div> */}
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-9 md:py-10">{children}</main>
      </div>
    </div>
  );
}