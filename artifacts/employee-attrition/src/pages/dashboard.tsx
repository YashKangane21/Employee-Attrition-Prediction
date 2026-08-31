import { ArrowUpRight, Building2, CircleDollarSign, Clock3, Users } from 'lucide-react';
import { Link } from 'wouter';
import { getGetDashboardQueryKey, useGetDashboard } from '@workspace/api-client-react';
import { EmptyBlock, ErrorBlock, LoadingBlock, SectionHeading } from '@/components/async-state';

const percentage = (value: number) => `${(value > 1 ? value : value * 100).toFixed(1)}%`;
const number = (value: number) => new Intl.NumberFormat('en-US').format(value);

function MetricCard({ label, value, note, icon: Icon, tone = 'plain' }: { label: string; value: string; note: string; icon: typeof Users; tone?: 'plain' | 'warm' | 'mint' }) {
  return (
    <article className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone === 'warm' ? 'border-accent/30 bg-accent/15' : tone === 'mint' ? 'border-secondary bg-secondary/60' : 'border-border bg-card'}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="flex items-start justify-between"><p className="label-kicker">{label}</p><Icon size={18} className="text-muted-foreground/70" /></div>
      <p className="metric-value mt-6">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function GroupRows({ rows, accent = 'primary' }: { rows: { label: string; yes: number; no: number; total: number; rate: number }[]; accent?: 'primary' | 'accent' }) {
  if (!rows.length) return <EmptyBlock message="No grouped observations returned." />;
  const max = Math.max(...rows.map((row) => row.rate), 0.01);
  return (
    <div className="space-y-4" data-testid="grouped-rows">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="group">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium" title={row.label}>{row.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{percentage(row.rate)} <span className="font-sans">/ {number(row.total)}</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-700 ${accent === 'accent' ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${Math.max((row.rate / max) * 100, 2)}%` }} />
          </div>
          <div className="mt-1 flex gap-3 text-[0.68rem] text-muted-foreground"><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-destructive align-middle" />left {number(row.yes)}</span><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-secondary-foreground align-middle" />stayed {number(row.no)}</span></div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const query = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const dashboard = query.data;

  return (
    <div className="space-y-10">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="animate-rise-in">
          <p className="label-kicker">01 / Dataset overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">The shape of attrition.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A cohort-level read of the IBM HR dataset. Compare where exits concentrate, then use the model lens to ask why.</p>
        </div>
        <Link href="/predict" className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5" data-testid="link-dashboard-predict">Check an employee <ArrowUpRight size={15} /></Link>
      </header>

      {query.isLoading && <LoadingBlock lines={5} />}
      {query.isError && <ErrorBlock onRetry={() => query.refetch()} />}
      {dashboard && (
        <div className="space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Employees" value={number(dashboard.total_employees)} note="records in the cohort" icon={Users} />
            <MetricCard label="Attrition rate" value={percentage(dashboard.attrition_rate)} note="share marked as leaving" icon={CircleDollarSign} tone="warm" />
            <MetricCard label="Left" value={number(dashboard.employees_left)} note="observed attrition cases" icon={ArrowUpRight} tone="plain" />
            <MetricCard label="Stayed" value={number(dashboard.employees_stayed)} note="observed retained cases" icon={Building2} tone="mint" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading eyebrow="Target distribution" title="Stay / leave balance" detail="The outcome the model is learning to distinguish." />
              {dashboard.target_distribution.length ? (
                <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                  <div
                    className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(hsl(var(--destructive)) 0 ${Math.min((dashboard.attrition_rate > 1 ? dashboard.attrition_rate : dashboard.attrition_rate * 100), 100)}%, hsl(var(--secondary-foreground)) ${Math.min((dashboard.attrition_rate > 1 ? dashboard.attrition_rate : dashboard.attrition_rate * 100), 100)}% 100%)` }}
                    data-testid="chart-target-distribution"
                  >
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card"><span className="font-mono text-2xl font-bold">{percentage(dashboard.attrition_rate)}</span><span className="text-[0.65rem] text-muted-foreground">attrition</span></div>
                  </div>
                  <div className="w-full max-w-[180px] space-y-4">
                    {dashboard.target_distribution.map((item, index) => <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0" data-testid={`distribution-${index}`}><span className="flex items-center gap-2 text-sm"><i className={`h-2 w-2 rounded-full ${item.label.toLowerCase() === 'yes' || item.label.toLowerCase() === 'left' ? 'bg-destructive' : 'bg-secondary-foreground'}`} />{item.label}</span><span className="font-mono text-xs">{number(item.count)} <span className="text-muted-foreground">({percentage(item.percentage)})</span></span></div>)}
                  </div>
                </div>
              ) : <EmptyBlock message="Target distribution is empty." />}
            </article>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading eyebrow="Fast read" title="What deserves a closer look" detail="Group rates reveal where the signal is uneven." />
              <div className="chart-grid mt-7 rounded-xl border border-border/70 p-5">
                <div className="flex items-end justify-between gap-5">
                  <div><p className="font-mono text-3xl text-primary">{dashboard.by_department.length}</p><p className="mt-1 text-xs text-muted-foreground">departments mapped</p></div>
                  <div><p className="font-mono text-3xl text-primary">{dashboard.by_job_role.length}</p><p className="mt-1 text-xs text-muted-foreground">roles observed</p></div>
                  <div><p className="font-mono text-3xl text-primary">{dashboard.by_overtime.length}</p><p className="mt-1 text-xs text-muted-foreground">overtime groups</p></div>
                </div>
                <div className="mt-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-destructive" /> Attrition cases <span className="ml-auto font-mono">yes</span></div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-secondary-foreground" /> Retained cases <span className="ml-auto font-mono">no</span></div>
              </div>
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading eyebrow="Grouped insight" title="By department" detail="Rate is the share of the group marked Yes." action={<Building2 size={19} className="text-accent" />} />
              <GroupRows rows={dashboard.by_department} />
            </article>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading eyebrow="Grouped insight" title="By overtime" detail="A compact view of workload context." action={<Clock3 size={19} className="text-accent" />} />
              <GroupRows rows={dashboard.by_overtime} accent="accent" />
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading eyebrow="Role landscape" title="Job roles with the strongest signal" detail="Sorted as returned by the analytics service." />
              <GroupRows rows={dashboard.by_job_role} />
            </article>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading eyebrow="Income context" title="Monthly income & attrition" detail="Bucketed counts, not a causal claim." action={<CircleDollarSign size={19} className="text-accent" />} />
              {dashboard.income_by_attrition.length ? <div className="mobile-scroll-x"><table className="w-full min-w-[300px] text-left text-sm"><thead className="border-b border-border text-[0.66rem] uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 font-mono font-normal">Bucket</th><th className="pb-3 text-right font-mono font-normal">Yes</th><th className="pb-3 text-right font-mono font-normal">No</th></tr></thead><tbody>{dashboard.income_by_attrition.map((point, index) => <tr key={`${point.bucket}-${index}`} className="border-b border-border/70 last:border-0" data-testid={`income-row-${index}`}><td className="py-3 font-medium">{point.bucket}</td><td className="py-3 text-right font-mono text-destructive">{number(point.yes)}</td><td className="py-3 text-right font-mono text-secondary-foreground">{number(point.no)}</td></tr>)}</tbody></table></div> : <EmptyBlock message="Income bands are empty." />}
            </article>
          </section>
        </div>
      )}
    </div>
  );
}