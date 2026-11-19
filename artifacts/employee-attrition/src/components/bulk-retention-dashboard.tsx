import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Filter,
  Info,
  Layers,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { EmployeeInput } from '@workspace/api-client-react';

import type { BulkPredictionResult } from '@/lib/bulk-predict-api';
import {
  RetentionRecommendations,
  type RecommendationItem,
  type SimulationSummary,
} from '@/components/retention-recommendations';

/* ============================================================
   TYPES
   ============================================================ */

export interface BulkEmployeeRetentionItem {
  EmployeeID: string;
  EmployeeName: string;
  Department: string;
  JobRole: string;
  current_prediction: string;
  current_probability: number | null;
  current_risk_level: string;
  recommendations_count: number;
  top_recommendations: string[];
  recommendations: RecommendationItem[];
  combined_simulation: SimulationSummary;
  simulated_probability: number | null;
  risk_difference_percentage_points: number | null;
  employee_inputs: Record<string, unknown>;
}

export interface BulkRetentionSummary {
  total_analyzed: number;
  employees_with_recommendations: number;
  high_risk_count: number;
  average_risk_reduction_percentage_points: number | null;
}

export interface BulkRetentionRecommendationsResponse {
  summary: BulkRetentionSummary;
  employees: BulkEmployeeRetentionItem[];
  supports_probability: boolean;
  probability_notes: string;
  disclaimer: string;
}

interface BulkRetentionDashboardProps {
  results: BulkPredictionResult[];
}

function riskClass(level: string): string {
  if (level === 'High') {
    return 'bg-destructive/10 text-destructive border-destructive/25';
  }
  if (level === 'Medium') {
    return 'bg-accent/20 text-accent-foreground border-accent/35';
  }
  return 'bg-secondary text-secondary-foreground border-secondary-foreground/20';
}

function formatProb(prob: number | null): string {
  if (prob === null) return '—';
  const val = Math.max(0, Math.min(prob > 1 ? prob / 100 : prob, 1));
  return `${(val * 100).toFixed(1)}%`;
}

export function BulkRetentionDashboard({ results }: BulkRetentionDashboardProps) {
  const [data, setData] = useState<BulkRetentionRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterRecsOnly, setFilterRecsOnly] = useState<boolean>(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  /* ----------------------------------------------------------
     Fetch bulk retention recommendations whenever results change
     ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    if (!results || results.length === 0) {
      setData(null);
      return;
    }

    async function loadBulkRecommendations() {
      setLoading(true);
      setError(null);
      try {
        const payload = results.map((row) => {
          // Model requires numeric & categorical features plus EmployeeName and EmployeeID
          const {
            prediction: _prediction,
            attrition_probability: _attrition_probability,
            risk_level: _risk_level,
            model_used: _model_used,
            CompanyExperienceRatio: _CompanyExperienceRatio,
            PromotionFrequency: _PromotionFrequency,
            IncomePerYearExperience: _IncomePerYearExperience,
            SatisfactionScore: _SatisfactionScore,
            RoleTenureRatio: _RoleTenureRatio,
            ...rest
          } = row;
          return rest;
        });

        const res = await fetch('/api/recommendations/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employees: payload }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || `HTTP error ${res.status}`);
        }

        const json: BulkRetentionRecommendationsResponse = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to analyze bulk retention recommendations.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBulkRecommendations();
    return () => {
      cancelled = true;
    };
  }, [results]);

  /* ----------------------------------------------------------
     Filter employee list
     ---------------------------------------------------------- */
  const filteredEmployees = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.trim().toLowerCase();

    return data.employees.filter((emp) => {
      if (
        query &&
        !emp.EmployeeName.toLowerCase().includes(query) &&
        !emp.EmployeeID.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (filterRisk !== 'all' && emp.current_risk_level !== filterRisk) {
        return false;
      }
      if (filterRecsOnly && emp.recommendations_count === 0) {
        return false;
      }
      return true;
    });
  }, [data, searchQuery, filterRisk, filterRecsOnly]);

  const selectedEmployee = useMemo(() => {
    if (!data || !selectedEmployeeId) return null;
    return data.employees.find((e) => e.EmployeeID === selectedEmployeeId) || null;
  }, [data, selectedEmployeeId]);

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-border bg-card p-7 shadow-sm"
        data-testid="section-bulk-recommendations-loading"
      >
        <div className="flex items-center gap-3">
          <Sliders className="animate-spin text-accent" size={20} />
          <div>
            <h3 className="text-base font-semibold">
              Analyzing Bulk Employee Retention & Running What-If Simulations…
            </h3>
            <p className="text-xs text-muted-foreground">
              Evaluating personalized HR recommendations and simulating intervention models for{' '}
              {results.length} employees.
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
        data-testid="section-bulk-recommendations-error"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-destructive shrink-0" size={18} />
          <div>
            <h3 className="text-sm font-semibold text-destructive">
              Could not generate bulk retention analysis
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section
      className="space-y-6 pt-2"
      aria-label="Bulk Retention Recommendations and What-If Analysis"
      data-testid="section-bulk-retention"
    >
      {/* ======================================================
          HEADER & SUBTITLE
          ====================================================== */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="label-kicker">04 / Bulk decision support</span>
            <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-semibold text-accent-foreground">
              <Sparkles size={11} /> What-If Cohort Analysis
            </span>
          </div>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">
            Bulk Employee Retention Recommendations
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Personalized retention recommendations and what-if simulation for all analyzed
            employees. Review cohort-wide trends or select any employee to simulate custom
            intervention scenarios in real time.
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
          SUMMARY METRICS CARDS
          ====================================================== */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="label-kicker">Analyzed</p>
            <Users size={16} className="text-muted-foreground" />
          </div>
          <p className="metric-value mt-3 font-mono text-3xl font-bold">
            {data.summary.total_analyzed}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total employees in uploaded file</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="label-kicker">With Recommendations</p>
            <Sparkles size={16} className="text-accent" />
          </div>
          <p className="metric-value mt-3 font-mono text-3xl font-bold text-accent-foreground">
            {data.summary.employees_with_recommendations}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Employees with actionable HR levers</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="label-kicker">High Risk Cohort</p>
            <AlertCircle size={16} className="text-destructive" />
          </div>
          <p className="metric-value mt-3 font-mono text-3xl font-bold text-destructive">
            {data.summary.high_risk_count}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Employees classified as High Risk</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="label-kicker">Avg. Risk Reduction</p>
            <TrendingDown size={16} className="text-emerald-500" />
          </div>
          <p className="metric-value mt-3 font-mono text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.summary.average_risk_reduction_percentage_points !== null
              ? `-${data.summary.average_risk_reduction_percentage_points.toFixed(1)} pp`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Simulated reduction across targets</p>
        </div>
      </div>

      {/* ======================================================
          COHORT RETENTION TABLE
          ====================================================== */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-accent" />
              <h3 className="text-base font-semibold">Cohort Retention Overview</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare current predicted attrition risk against simulated outcomes. Click &quot;Simulate
              What-If&quot; on any employee to explore custom multi-action scenarios.
            </p>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Showing {filteredEmployees.length} of {data.employees.length}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="block text-xs font-semibold">
            Search employee name or ID
            <span className="mt-1.5 flex items-center gap-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                placeholder="Search..."
                data-testid="input-search-bulk-retention"
              />
            </span>
          </label>

          <label className="block text-xs font-semibold">
            Filter by risk level
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="input-field mt-1.5"
              data-testid="select-filter-bulk-risk"
            >
              <option value="all">All Risk Levels</option>
              <option value="High">High Risk Only</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </label>

          <label className="flex items-center gap-2.5 pt-6 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={filterRecsOnly}
              onChange={(e) => setFilterRecsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary cursor-pointer"
              data-testid="checkbox-filter-recs-only"
            />
            <span>Show only employees with recommendations</span>
          </label>
        </div>

        {/* Retention Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm" data-testid="table-bulk-retention">
            <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role & Dept</th>
                <th className="px-4 py-3">Current Risk</th>
                <th className="px-4 py-3">Recommendations</th>
                <th className="px-4 py-3">Simulated Risk</th>
                <th className="px-4 py-3">Predicted Shift</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const diff = emp.risk_difference_percentage_points;
                const isSelected = selectedEmployeeId === emp.EmployeeID;

                return (
                  <tr
                    key={emp.EmployeeID}
                    className={`border-t border-border transition hover:bg-muted/30 ${
                      isSelected ? 'bg-accent/10 font-medium' : ''
                    }`}
                    data-testid={`row-retention-${emp.EmployeeID}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{emp.EmployeeName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{emp.EmployeeID}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-foreground">{emp.JobRole}</p>
                      <p className="text-muted-foreground">{emp.Department}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">
                          {formatProb(emp.current_probability)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${riskClass(
                            emp.current_risk_level,
                          )}`}
                        >
                          {emp.current_risk_level}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.recommendations_count > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                            {emp.recommendations_count} actions available
                          </span>
                          <p className="text-[0.7rem] text-muted-foreground truncate max-w-xs">
                            {emp.top_recommendations.join(', ')}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 size={13} className="text-secondary-foreground" /> Healthy
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">
                          {formatProb(emp.simulated_probability)}
                        </span>
                        {emp.combined_simulation && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${riskClass(
                              emp.combined_simulation.simulated_risk_level,
                            )}`}
                          >
                            {emp.combined_simulation.simulated_risk_level}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">
                      {diff !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            diff > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : diff < 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {diff > 0 ? `-${diff.toFixed(1)} pp` : diff < 0 ? `+${Math.abs(diff).toFixed(1)} pp` : '0.0 pp'}
                          {diff > 0 ? <TrendingDown size={13} /> : diff < 0 ? <TrendingUp size={13} /> : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedEmployeeId(
                            selectedEmployeeId === emp.EmployeeID ? null : emp.EmployeeID,
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        }`}
                        data-testid={`button-simulate-employee-${emp.EmployeeID}`}
                      >
                        {isSelected ? 'Viewing' : 'Simulate What-If'}
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground py-6">
            No employees in this cohort match the current filter criteria.
          </p>
        )}
      </div>

      {/* ======================================================
          DETAILED WHAT-IF SIMULATOR FOR SELECTED EMPLOYEE
          ====================================================== */}
      {selectedEmployee && (
        <div
          className="rounded-2xl border-2 border-accent/40 bg-card p-6 shadow-md space-y-4"
          data-testid="panel-selected-employee-simulator"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-accent" />
                <h3 className="text-lg font-semibold">
                  Personalized What-If Simulator: {selectedEmployee.EmployeeName}
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  ({selectedEmployee.EmployeeID})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedEmployee.JobRole} • {selectedEmployee.Department}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEmployeeId(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
              data-testid="button-close-bulk-simulator"
            >
              <X size={15} /> Close simulator
            </button>
          </div>

          {/* Render the full interactive RetentionRecommendations component */}
          <RetentionRecommendations
            employee={selectedEmployee.employee_inputs as unknown as EmployeeInput}
            employeeName={selectedEmployee.EmployeeName}
            employeeId={selectedEmployee.EmployeeID}
            onClose={() => setSelectedEmployeeId(null)}
          />
        </div>
      )}

      {/* ======================================================
          GOVERNANCE & ETHICAL DISCLAIMER
          ====================================================== */}
      <div
        className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-5 text-xs leading-5 text-muted-foreground"
        data-testid="banner-bulk-disclaimer"
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
