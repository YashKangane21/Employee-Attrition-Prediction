import {
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Check,
  Crosshair,
  Info,
  Target,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  getGetModelMetricsQueryKey,
  useGetModelMetrics,
} from '@workspace/api-client-react';
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionHeading,
} from '@/components/async-state';

const percent = (value: number | undefined) =>
  `${(((Number(value) || 0) > 1 ? Number(value) || 0 : (Number(value) || 0) * 100)).toFixed(1)}%`;

const prettyFeature = (value: string) => value.replaceAll('_', ' ');

const formatDate = (value?: string) => {
  if (!value) return 'Unknown';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
};

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Target;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-background/60 p-4"
      data-testid={`model-metric-${label.toLowerCase()}`}
    >
      <Icon size={16} className="text-accent" />

      <p className="mt-5 font-mono text-2xl tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default function Insights() {
  const query = useGetModelMetrics({
    query: {
      queryKey: getGetModelMetricsQueryKey(),
    },
  });

  // FIX: Support both direct response and nested { data: ... } response
const rawMetrics = query.data as any;

const metrics =
  rawMetrics?.model_used
    ? rawMetrics
    : rawMetrics?.data?.model_used
      ? rawMetrics.data
      : rawMetrics?.data?.data?.model_used
        ? rawMetrics.data.data
        : rawMetrics?.data?.response?.model_used
          ? rawMetrics.data.response
          : undefined;
console.log("MODEL METRICS RESPONSE:", rawMetrics);
console.log("ACTUAL METRICS:", metrics);

  // FIX: Prevent "Cannot read properties of undefined (reading 'length')"
  const confusionMatrix = Array.isArray(metrics?.confusion_matrix)
    ? metrics.confusion_matrix
    : [];

  const comparison = Array.isArray(metrics?.comparison)
    ? metrics.comparison
    : [];

  const featureImportance = Array.isArray(metrics?.feature_importance)
    ? metrics.feature_importance
    : [];

  return (
    <div className="space-y-10">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="animate-rise-in">
          <p className="label-kicker">03 / Model insights</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">
            Measure the signal.
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A model is only useful when its performance and blind spots are
            visible. This page keeps both in frame.
          </p>
        </div>

        <Link
          href="/predict"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
          data-testid="link-insights-predict"
        >
          Test a profile <ArrowUpRight size={15} />
        </Link>
      </header>

      {query.isLoading && <LoadingBlock lines={6} />}

      {query.isError && (
        <ErrorBlock onRetry={() => query.refetch()} />
      )}

      {metrics && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground shadow-md md:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-[0.63rem] font-bold uppercase tracking-[0.16em] text-accent">
                  <BrainCircuit size={14} />
                  Current model
                </div>

                <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                  {metrics?.model_used || 'Unknown Model'}
                </h2>

                <p className="mt-2 max-w-lg text-sm leading-6 text-primary-foreground/65">
                  Held-out evaluation metrics from the trained pipeline. Use
                  recall and precision together when thinking about intervention.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-primary-foreground/55">
                <CalendarDays size={14} />
                Trained {formatDate(metrics?.trained_at)}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric
                label="Accuracy"
                value={percent(metrics?.accuracy)}
                icon={Crosshair}
              />

              <Metric
                label="Precision"
                value={percent(metrics?.precision)}
                icon={Target}
              />

              <Metric
                label="Recall"
                value={percent(metrics?.recall)}
                icon={Info}
              />

              <Metric
                label="F1 score"
                value={percent(metrics?.f1_score)}
                icon={Check}
              />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading
                eyebrow="Error profile"
                title="Confusion matrix"
                detail="Rows are observed outcomes; columns are predicted outcomes."
              />

              {confusionMatrix.length >= 2 &&
              confusionMatrix[0]?.length >= 2 ? (
                <div className="mt-8">
                  <div className="ml-[92px] grid grid-cols-2 text-center font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                    <span>Pred. no</span>
                    <span>Pred. yes</span>
                  </div>

                  <div className="mt-2 grid grid-cols-[80px_1fr] gap-3">
                    <div className="grid grid-rows-2 items-center text-right font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                      <span>Actual no</span>
                      <span>Actual yes</span>
                    </div>

                    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
                      {confusionMatrix
                        .slice(0, 2)
                        .flatMap((row: number[], rowIndex: number) =>
                          row.slice(0, 2).map(
                            (cell: number, colIndex: number) => (
                              <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`flex min-h-[92px] flex-col items-center justify-center border-border p-3 ${
                                  colIndex === rowIndex
                                    ? 'bg-secondary/70'
                                    : 'bg-destructive/8'
                                }`}
                                data-testid={`confusion-cell-${rowIndex}-${colIndex}`}
                              >
                                <span className="font-mono text-2xl">
                                  {cell}
                                </span>

                                <span className="mt-1 text-[0.65rem] text-muted-foreground">
                                  {colIndex === rowIndex
                                    ? 'correct'
                                    : 'missed'}
                                </span>
                              </div>
                            )
                          )
                        )}
                    </div>
                  </div>

                  <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <Info
                      size={14}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    A false negative can hide an employee who may need support;
                    a false positive can create an unnecessary conversation.
                  </p>
                </div>
              ) : (
                <EmptyBlock message="The confusion matrix is empty." />
              )}
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading
                eyebrow="Benchmark"
                title="Model comparison"
                detail="A relative view of the models evaluated on the same held-out split."
              />

              {comparison.length ? (
                <div className="mobile-scroll-x">
                  <table className="w-full min-w-[580px] text-left text-sm">
                    <thead className="border-b border-border text-[0.63rem] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="pb-3 font-mono font-normal">
                          Model
                        </th>
                        <th className="pb-3 text-right font-mono font-normal">
                          Accuracy
                        </th>
                        <th className="pb-3 text-right font-mono font-normal">
                          Precision
                        </th>
                        <th className="pb-3 text-right font-mono font-normal">
                          Recall
                        </th>
                        <th className="pb-3 text-right font-mono font-normal">
                          F1
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {comparison.map((row: any, index: number) => (
                        <tr
                          key={`${row.model}-${index}`}
                          className={`border-b border-border/70 last:border-0 ${
                            row.model === metrics?.model_used
                              ? 'bg-accent/10'
                              : ''
                          }`}
                          data-testid={`comparison-row-${index}`}
                        >
                          <td className="py-3 font-semibold">
                            {row.model}

                            {row.model === metrics?.model_used && (
                              <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[0.58rem] font-bold uppercase text-accent-foreground">
                                used
                              </span>
                            )}
                          </td>

                          <td className="py-3 text-right font-mono">
                            {percent(row.accuracy)}
                          </td>

                          <td className="py-3 text-right font-mono">
                            {percent(row.precision)}
                          </td>

                          <td className="py-3 text-right font-mono">
                            {percent(row.recall)}
                          </td>

                          <td className="py-3 text-right font-mono">
                            {percent(row.f1_score)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyBlock message="No comparison models returned." />
              )}
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <SectionHeading
                eyebrow="Model explanation"
                title="What moves the prediction"
                detail="Feature importance describes contribution to the model’s decisions; it does not prove causation."
              />

              {featureImportance.length ? (
                <div className="mt-7 space-y-4">
                  {featureImportance.map((item: any, index: number) => {
                    const max = Math.max(
                      ...featureImportance.map(
                        (feature: any) => Number(feature.importance) || 0
                      ),
                      0.001
                    );

                    return (
                      <div
                        key={`${item.feature}-${index}`}
                        data-testid={`feature-importance-${index}`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                          <span className="capitalize">
                            {prettyFeature(item.feature)}
                          </span>

                          <span className="font-mono text-xs text-muted-foreground">
                            {(Number(item.importance) || 0).toFixed(3)}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{
                              width: `${Math.max(
                                ((Number(item.importance) || 0) / max) * 100,
                                2
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyBlock message="Feature importance is empty." />
              )}
            </article>

            <article className="rounded-2xl border border-border bg-secondary p-6 text-secondary-foreground shadow-sm">
              <p className="label-kicker text-secondary-foreground/65">
                How to read this
              </p>

              <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
                Importance is a map, not a motive.
              </h2>

              <p className="mt-4 text-sm leading-6 text-secondary-foreground/75">
                The strongest features tell you where the model finds useful
                separation in this dataset. They do not explain an individual’s
                lived experience or prescribe an HR action.
              </p>

              <div className="mt-7 space-y-3 border-t border-secondary-foreground/15 pt-5 text-sm">
                <div className="flex gap-3">
                  <span className="font-mono text-xs">01</span>
                  <span>Check cohort patterns first.</span>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-xs">02</span>
                  <span>Pair the score with context.</span>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-xs">03</span>
                  <span>Use conversation before conclusion.</span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline decoration-secondary-foreground/30 underline-offset-4 hover:decoration-secondary-foreground"
                data-testid="link-insights-dashboard"
              >
                Return to cohort view <ArrowUpRight size={15} />
              </Link>
            </article>
          </section>
        </div>
      )}
    </div>
  );
}