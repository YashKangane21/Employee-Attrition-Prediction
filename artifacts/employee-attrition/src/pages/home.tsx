import { ArrowUpRight, BarChart3, BrainCircuit, Database, ScanSearch, ShieldCheck, Waypoints } from 'lucide-react';
import { Link } from 'wouter';

const principles = [
  { icon: Database, title: 'Know the cohort', copy: 'Read the IBM HR dataset as a living population: where people work, what they earn, and who stays.' },
  { icon: BrainCircuit, title: 'Interrogate the model', copy: 'Put accuracy in context with precision, recall, a confusion matrix, and ranked feature influence.' },
  { icon: ScanSearch, title: 'Study one profile', copy: 'Enter the 27 model features and receive a transparent retention-risk signal in seconds.' },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-primary-foreground shadow-lg md:px-12 md:py-16">
        <div className="pointer-events-none absolute -right-20 -top-32 h-[28rem] w-[28rem] rounded-full border-[60px] border-accent/20" />
        <div className="pointer-events-none absolute bottom-[-9rem] right-[20%] h-72 w-72 rounded-full border border-primary-foreground/10" />
        <div className="relative max-w-3xl animate-rise-in">
          <div className="flex items-center gap-2 font-mono text-[0.64rem] font-bold uppercase tracking-[0.18em] text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" /> Employee attrition prediction system
          </div>
          <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-7xl">
            See the human pattern inside the data.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-primary-foreground/70 md:text-lg">
            A focused HR analytics studio for understanding IBM’s employee attrition dataset, evaluating a trained model, and exploring retention risk one profile at a time.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition hover:-translate-y-0.5 hover:shadow-md" data-testid="link-enter-workspace">
              Enter workspace <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="/predict" className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/20 px-5 py-3 text-sm font-semibold text-primary-foreground/85 transition hover:bg-primary-foreground/10" data-testid="link-start-prediction">
              Run a profile check <ScanSearch size={15} />
            </Link>
          </div>
        </div>
        <div className="relative mt-16 grid max-w-2xl grid-cols-3 gap-5 border-t border-primary-foreground/15 pt-6 text-primary-foreground/75 md:absolute md:bottom-12 md:right-12 md:mt-0 md:w-[360px]">
          <div><p className="font-mono text-[0.62rem] uppercase tracking-wider text-primary-foreground/45">Dataset</p><p className="mt-1 text-sm">IBM HR</p></div>
          <div><p className="font-mono text-[0.62rem] uppercase tracking-wider text-primary-foreground/45">Features</p><p className="mt-1 text-sm">27 signals</p></div>
          <div><p className="font-mono text-[0.62rem] uppercase tracking-wider text-primary-foreground/45">Focus</p><p className="mt-1 text-sm">Retention</p></div>
        </div>
      </section>

      <section className="grid gap-12 md:grid-cols-[0.8fr_1.2fr] md:items-end">
        <div className="animate-rise-in delay-1">
          <p className="label-kicker">A considered starting point</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">From population signal to personal context.</h2>
        </div>
        <p className="max-w-xl text-[1.03rem] leading-7 text-muted-foreground animate-rise-in delay-2">
          Attrition is not a single number. This workspace keeps the dataset, the model, and the individual employee in the same line of sight—so analysis can move from “what is happening?” to “what might explain it?”
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {principles.map(({ icon: Icon, title, copy }, index) => (
          <article key={title} className={`group rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md animate-rise-in delay-${index + 1}`} data-testid={`card-principle-${index}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition group-hover:bg-accent group-hover:text-accent-foreground"><Icon size={19} /></span>
            <h3 className="mt-7 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 md:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm md:p-9">
          <div className="flex items-start justify-between">
            <div><p className="label-kicker">Three lenses</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">A small system for a nuanced question.</h2></div>
            <Waypoints size={23} className="text-accent" />
          </div>
          <div className="mt-9 grid gap-6 border-t border-border pt-6 sm:grid-cols-3">
            <div><p className="font-mono text-2xl text-primary">01</p><p className="mt-2 text-sm font-semibold">Describe</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Group the cohort by department, role, overtime, and income.</p></div>
            <div><p className="font-mono text-2xl text-primary">02</p><p className="mt-2 text-sm font-semibold">Evaluate</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Read model quality beyond one headline metric.</p></div>
            <div><p className="font-mono text-2xl text-primary">03</p><p className="mt-2 text-sm font-semibold">Explore</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Test a profile and understand the output as a signal.</p></div>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-secondary p-7 text-secondary-foreground shadow-sm">
          <ShieldCheck size={24} />
          <div className="mt-12"><p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em]">Working note</p><p className="mt-3 text-xl font-semibold leading-tight">A prediction is a prompt for better questions—not a verdict.</p></div>
          <Link href="/insights" className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline decoration-secondary-foreground/30 underline-offset-4 hover:decoration-secondary-foreground" data-testid="link-read-methodology">Read the model notes <ArrowUpRight size={15} /></Link>
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-5 border-t border-border pt-8 md:flex-row md:items-center">
        <div><p className="label-kicker">Ready when you are</p><p className="mt-2 text-lg font-semibold">Start with the shape of the dataset.</p></div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5" data-testid="link-explore-dataset">Explore dataset <BarChart3 size={16} /></Link>
      </section>
    </div>
  );
}