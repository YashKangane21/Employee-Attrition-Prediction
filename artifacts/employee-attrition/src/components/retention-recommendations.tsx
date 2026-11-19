import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { EmployeeInput, Prediction } from '@workspace/api-client-react';

/* ============================================================
   TYPES
   ============================================================ */

export interface RecommendationItem {
  id: string;
  title: string;
  category: string;
  current_condition: string;
  suggested_action: string;
  suggested_change: string;
  modified_fields: Record<string, unknown>;
  priority: 'High' | 'Medium' | 'Low';
  priority_reason: string;
  simulated_prediction: string;
  simulated_probability: number | null;
  simulated_risk_level: string;
  risk_difference: number | null;
  risk_difference_percentage_points: number | null;
}

export interface SimulationSummary {
  applied_recommendation_ids: string[];
  applied_changes: Record<string, unknown>;
  simulated_prediction: string;
  simulated_probability: number | null;
  simulated_risk_level: string;
  risk_difference: number | null;
  risk_difference_percentage_points: number | null;
}

export interface RetentionRecommendationsResponse {
  current_prediction: string;
  current_probability: number | null;
  current_risk_level: string;
  model_used: string;
  supports_probability: boolean;
  probability_notes: string;
  recommendations: RecommendationItem[];
  combined_simulation: SimulationSummary;
  disclaimer: string;
}

/* ============================================================
   PROPS
   ============================================================ */

interface RetentionRecommendationsProps {
  employee: EmployeeInput;
  initialPrediction?: Prediction;
  employeeName?: string;
  employeeId?: string;
  onClose?: () => void;
}

export function RetentionRecommendations({
  employee,
  initialPrediction,
  employeeName,
  employeeId,
  onClose,
}: RetentionRecommendationsProps) {
  const [data, setData] = useState<RetentionRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [combinedSimulation, setCombinedSimulation] = useState<SimulationSummary | null>(null);
  const [simulatingCombined, setSimulatingCombined] = useState(false);

  /* ----------------------------------------------------------
     Fetch recommendations on employee / initial prediction change
     ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employee),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || `HTTP error ${res.status}`);
        }

        const result: RetentionRecommendationsResponse = await res.json();
        if (!cancelled) {
          setData(result);
          const allIds = result.recommendations.map((r) => r.id);
          setSelectedIds(allIds);
          setCombinedSimulation(result.combined_simulation);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load retention recommendations.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [employee, initialPrediction]);

  /* ----------------------------------------------------------
     Simulate combined changes when selection updates
     ---------------------------------------------------------- */
  const triggerCombinedSimulation = useCallback(
    async (ids: string[]) => {
      setSimulatingCombined(true);
      try {
        const res = await fetch('/api/recommendations/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee,
            selected_recommendation_ids: ids,
          }),
        });

        if (!res.ok) {
          throw new Error(`Simulation failed: HTTP ${res.status}`);
        }

        const simResult: SimulationSummary = await res.json();
        setCombinedSimulation(simResult);
      } catch (err: unknown) {
        console.error('Failed to simulate combined recommendations:', err);
      } finally {
        setSimulatingCombined(false);
      }
    },
    [employee],
  );

  const handleToggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    triggerCombinedSimulation(next);
  };

  const handleSelectAll = () => {
    if (!data) return;
    const allIds = data.recommendations.map((r) => r.id);
    setSelectedIds(allIds);
    triggerCombinedSimulation(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
    triggerCombinedSimulation([]);
  };

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-7 shadow-sm"
        data-testid="section-recommendations-loading"
      >
        <div className="flex items-center gap-3">
          <Sliders className="animate-spin text-accent" size={20} />
          <div>
            <h3 className="text-base font-semibold">Running What-If Simulations…</h3>
            <p className="text-xs text-muted-foreground">
              Evaluating applicable retention rules and executing the trained ML pipeline.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 shadow-sm"
        data-testid="section-recommendations-error"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-destructive shrink-0" size={18} />
          <div>
            <h3 className="text-sm font-semibold text-destructive">
              Could not generate retention recommendations
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const currentProb = data.current_probability;
  const simProb = combinedSimulation?.simulated_probability ?? null;
  const diffPct = combinedSimulation?.risk_difference_percentage_points ?? null;

  const currentRiskBadgeClass =
    data.current_risk_level === 'High'
      ? 'bg-destructive/10 text-destructive border-destructive/25'
      : data.current_risk_level === 'Medium'
        ? 'bg-accent/20 text-accent-foreground border-accent/35'
        : 'bg-secondary text-secondary-foreground border-secondary-foreground/20';

  const simRiskBadgeClass =
    combinedSimulation?.simulated_risk_level === 'High'
      ? 'bg-destructive/10 text-destructive border-destructive/25'
      : combinedSimulation?.simulated_risk_level === 'Medium'
        ? 'bg-accent/20 text-accent-foreground border-accent/35'
        : 'bg-secondary text-secondary-foreground border-secondary-foreground/20';

  return (
    <section
      className="space-y-6 pt-4"
      aria-label="Smart Employee Retention Recommendations"
      data-testid="section-retention-recommendations"
    >
      {/* Optional Employee Context Banner (for Bulk Selection) */}
      {employeeName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/15 px-5 py-3 text-xs text-accent-foreground shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-accent shrink-0" />
            <span>
              Simulating retention scenario for{' '}
              <strong className="text-foreground font-semibold">{employeeName}</strong>
              {employeeId && (
                <span className="font-mono text-muted-foreground ml-1">({employeeId})</span>
              )}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-muted transition"
              data-testid="button-close-employee-scenario"
            >
              Back to cohort table
            </button>
          )}
        </div>
      )}

      {/* ======================================================
          SECTION TITLE & SUBTITLE
          ====================================================== */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="label-kicker">03 / Innovative decision support</span>
            <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-semibold text-accent-foreground">
              <Sparkles size={11} /> What-If Analysis
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">
            Employee Retention Recommendations
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Smart explainable retention actions with model-driven what-if simulation. Each action
            modifies actionable conditions and re-evaluates the trained pipeline to estimate risk
            impact.
          </p>
        </div>

        {/* Model probability capability note */}
        <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
          <ShieldCheck size={16} className="text-primary shrink-0" />
          <span className="text-muted-foreground">
            {data.supports_probability ? (
              <>
                Probability calibration:{' '}
                <strong className="text-foreground font-semibold">Active (Platt Scaling)</strong>
              </>
            ) : (
              <>
                Probability calibration:{' '}
                <span className="text-destructive font-semibold">Unsupported (Categorical)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ======================================================
          COMBINED SCENARIO COMPARISON CARD
          ====================================================== */}
      <div
        className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-7"
        data-testid="card-combined-simulation"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-accent" />
              <h3 className="text-base font-semibold">Combined What-If Scenario Impact</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Simulating{' '}
              <strong className="font-semibold text-foreground">
                {selectedIds.length} of {data.recommendations.length}
              </strong>{' '}
              recommended interventions together. Check or uncheck recommendations below to compare
              alternative scenarios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={selectedIds.length === data.recommendations.length}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              data-testid="button-select-all"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={selectedIds.length === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              data-testid="button-deselect-all"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Comparison grid: Current vs Simulated vs Difference */}
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {/* Current Risk */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Current Predicted Risk</p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-bold" data-testid="text-current-risk-stat">
                {currentProb !== null ? `${(currentProb * 100).toFixed(1)}%` : data.current_prediction}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${currentRiskBadgeClass}`}>
                {data.current_risk_level}
              </span>
            </div>
            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              Prediction:{' '}
              <strong className="font-semibold text-foreground">
                {data.current_prediction === 'Yes' ? 'Attriting' : 'Retained'}
              </strong>
            </p>
          </div>

          {/* Simulated Risk */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Simulated Risk</p>
              {simulatingCombined && (
                <span className="flex items-center gap-1 font-mono text-[0.68rem] text-accent">
                  <Sliders size={12} className="animate-spin" /> recalculating…
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-3xl font-bold" data-testid="text-simulated-risk-stat">
                {simProb !== null
                  ? `${(simProb * 100).toFixed(1)}%`
                  : combinedSimulation?.simulated_prediction ?? '—'}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${simRiskBadgeClass}`}>
                {combinedSimulation?.simulated_risk_level ?? '—'}
              </span>
            </div>
            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              Simulated prediction:{' '}
              <strong className="font-semibold text-foreground">
                {combinedSimulation?.simulated_prediction === 'Yes' ? 'Attriting' : 'Retained'}
              </strong>
            </p>
          </div>

          {/* Difference */}
          <div
            className={`rounded-xl border p-4 ${
              diffPct !== null && diffPct > 0
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : diffPct !== null && diffPct < 0
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border/80 bg-muted/30'
            }`}
          >
            <p className="text-xs font-medium text-muted-foreground">Predicted Risk Difference</p>
            <div className="mt-2 flex items-baseline gap-2">
              {diffPct !== null ? (
                <>
                  <span
                    className={`font-mono text-3xl font-bold ${
                      diffPct > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : diffPct < 0
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                    }`}
                    data-testid="text-risk-difference-stat"
                  >
                    {diffPct > 0 ? `-${diffPct.toFixed(1)}` : `+${Math.abs(diffPct).toFixed(1)}`}
                    <span className="text-lg"> pp</span>
                  </span>
                  {diffPct > 0 ? (
                    <TrendingDown className="text-emerald-600 dark:text-emerald-400" size={20} />
                  ) : diffPct < 0 ? (
                    <TrendingUp className="text-destructive" size={20} />
                  ) : null}
                </>
              ) : (
                <span className="font-mono text-xl text-muted-foreground">Categorical Shift</span>
              )}
            </div>
            <p className="mt-2 text-[0.72rem] text-muted-foreground">
              {diffPct !== null && diffPct > 0
                ? 'Model predicts lower turnover probability'
                : diffPct !== null && diffPct < 0
                  ? 'Non-linear model interaction showed higher risk'
                  : 'No probability shift predicted for this combination'}
            </p>
          </div>
        </div>

        {/* Visual progress bar comparison */}
        {currentProb !== null && simProb !== null && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Risk Comparison Gauge</span>
              <span className="font-mono">
                {(currentProb * 100).toFixed(1)}% → {(simProb * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-16 text-[0.7rem] font-mono text-muted-foreground">Current</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(currentProb * 100, 2), 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 text-[0.7rem] font-mono text-muted-foreground">Simulated</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-secondary-foreground transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(simProb * 100, 2), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          RECOMMENDATIONS LIST & INDIVIDUAL SIMULATIONS
          ====================================================== */}
      {data.recommendations.length === 0 ? (
        <div
          className="flex items-center gap-4 rounded-2xl border border-secondary/50 bg-secondary/20 p-6"
          data-testid="status-no-recommendations"
        >
          <CheckCircle2 size={24} className="text-secondary-foreground shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-secondary-foreground">
              Healthy Retention Signals Detected
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This employee profile shows healthy satisfaction ratings, balanced workload, and
              favorable progression indicators. No urgent HR retention interventions are required.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Applicable Actions ({data.recommendations.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Select actions to include in the combined scenario above
            </span>
          </div>

          <div className="grid gap-4" data-testid="list-recommendations">
            {data.recommendations.map((rec) => {
              const isSelected = selectedIds.includes(rec.id);
              const priorityClass =
                rec.priority === 'High'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : rec.priority === 'Medium'
                    ? 'border-accent/35 bg-accent/20 text-accent-foreground'
                    : 'border-border bg-secondary text-secondary-foreground';

              const diff = rec.risk_difference_percentage_points;

              return (
                <article
                  key={rec.id}
                  className={`rounded-2xl border p-5 shadow-sm transition-all md:p-6 ${
                    isSelected
                      ? 'border-border bg-card'
                      : 'border-border/60 bg-card/60 opacity-80'
                  }`}
                  data-testid={`card-recommendation-${rec.id}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: Checkbox + Action details */}
                    <div className="flex items-start gap-4">
                      <label className="mt-1 flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(rec.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                          data-testid={`checkbox-recommendation-${rec.id}`}
                        />
                      </label>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${priorityClass}`}
                            data-testid={`badge-priority-${rec.id}`}
                          >
                            {rec.priority} Priority
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {rec.category}
                          </span>
                        </div>

                        <h4 className="text-base font-semibold text-foreground">{rec.title}</h4>

                        <p className="text-xs leading-5 text-muted-foreground">
                          {rec.suggested_action}
                        </p>

                        {/* Condition Change Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground">
                            <span className="font-medium text-foreground">Current:</span>{' '}
                            {rec.current_condition}
                          </div>
                          <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                          <div className="rounded-lg border border-border bg-accent/10 px-2.5 py-1 font-medium text-accent-foreground">
                            <span className="text-foreground">Simulated:</span> {rec.suggested_change}
                          </div>
                        </div>

                        <p className="text-[0.7rem] text-muted-foreground/80 italic">
                          Rationale: {rec.priority_reason}
                        </p>
                      </div>
                    </div>

                    {/* Right: Individual Simulation Stats */}
                    <div className="flex shrink-0 flex-col items-start rounded-xl border border-border/80 bg-muted/20 p-4 lg:w-64 lg:items-end">
                      <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                        Individual Simulation
                      </p>

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground">Simulated Risk:</span>
                        <span
                          className="font-mono text-lg font-bold"
                          data-testid={`text-sim-risk-${rec.id}`}
                        >
                          {rec.simulated_probability !== null
                            ? `${(rec.simulated_probability * 100).toFixed(1)}%`
                            : rec.simulated_prediction}
                        </span>
                      </div>

                      {diff !== null && (
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-semibold">
                          <span className="text-muted-foreground font-sans text-[0.7rem]">Shift:</span>
                          <span
                            className={
                              diff > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : diff < 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                            }
                            data-testid={`text-diff-${rec.id}`}
                          >
                            {diff > 0 ? `-${diff.toFixed(1)} pp` : diff < 0 ? `+${Math.abs(diff).toFixed(1)} pp` : '0.0 pp'}
                          </span>
                          {diff > 0 ? (
                            <TrendingDown size={14} className="text-emerald-600 dark:text-emerald-400" />
                          ) : diff < 0 ? (
                            <TrendingUp size={14} className="text-destructive" />
                          ) : null}
                        </div>
                      )}

                      <span className="mt-2 text-[0.68rem] text-muted-foreground">
                        Prediction outcome:{' '}
                        <strong className="text-foreground font-semibold">
                          {rec.simulated_prediction === 'Yes' ? 'Attriting' : 'Retained'} (
                          {rec.simulated_risk_level})
                        </strong>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================
          GOVERNANCE & ETHICAL DISCLAIMER
          ====================================================== */}
      <div
        className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-5 text-xs leading-5 text-muted-foreground"
        data-testid="banner-disclaimer"
      >
        <Info size={18} className="mt-0.5 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-foreground">Decision Support & Simulation Notice</p>
          <p className="mt-1">{data.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
