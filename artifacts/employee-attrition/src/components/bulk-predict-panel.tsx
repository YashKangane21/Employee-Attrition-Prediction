import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Search,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';

import { useMemo, useState, type ChangeEvent } from 'react';

import {
  isCsvFile,
  parseAndValidateEmployeeCsv,
  type CsvValidationIssue,
  type ParsedEmployeeRow,
} from '@/lib/bulk-csv';
import {
  downloadResultsCsv,
  predictBulkEmployees,
  type BulkPredictionResult,
} from '@/lib/bulk-predict-api';

type BulkStep = 'upload' | 'rate' | 'review' | 'results';

function formatProbability(value: number): string {
  const probability = Math.max(
    0,
    Math.min(value > 1 ? value / 100 : value, 1),
  );
  return `${(probability * 100).toFixed(1)}%`;
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

export function BulkPredictPanel() {
  const [step, setStep] = useState<BulkStep>('upload');
  const [fileName, setFileName] = useState('');
  const [employees, setEmployees] = useState<ParsedEmployeeRow[]>([]);
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
  const [ratingIndex, setRatingIndex] = useState(0);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [issues, setIssues] = useState<CsvValidationIssue[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [predictError, setPredictError] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [results, setResults] = useState<BulkPredictionResult[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchId, setSearchId] = useState('');
  const [filterPrediction, setFilterPrediction] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');

  const currentEmployee = employees[ratingIndex];
  const allRated = employees.length > 0 && employees.every(
    (employee) => typeof ratings[employee.EmployeeID] === 'number',
  );

  const summary = useMemo(() => {
    const predictedLeave = results.filter((row) => row.prediction === 'Yes').length;
    return {
      total: results.length,
      leave: predictedLeave,
      stay: results.length - predictedLeave,
      high: results.filter((row) => row.risk_level === 'High').length,
      medium: results.filter((row) => row.risk_level === 'Medium').length,
      low: results.filter((row) => row.risk_level === 'Low').length,
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();
    const idQuery = searchId.trim().toLowerCase();
    return results.filter((row) => {
      if (nameQuery && !row.EmployeeName.toLowerCase().includes(nameQuery)) {
        return false;
      }
      if (idQuery && !row.EmployeeID.toLowerCase().includes(idQuery)) {
        return false;
      }
      if (filterPrediction !== 'all' && row.prediction !== filterPrediction) {
        return false;
      }
      if (filterRisk !== 'all' && row.risk_level !== filterRisk) {
        return false;
      }
      return true;
    });
  }, [results, searchName, searchId, filterPrediction, filterRisk]);

  const resetBulk = () => {
    setStep('upload');
    setFileName('');
    setEmployees([]);
    setRatings({});
    setRatingIndex(0);
    setMissingColumns([]);
    setIssues([]);
    setUploadError('');
    setPredictError('');
    setResults([]);
    setSearchName('');
    setSearchId('');
    setFilterPrediction('all');
    setFilterRisk('all');
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setUploadError('');
    setMissingColumns([]);
    setIssues([]);
    setEmployees([]);
    setResults([]);

    if (!file) {
      return;
    }

    if (!isCsvFile(file)) {
      setUploadError('Please choose a CSV file.');
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    const parsed = parseAndValidateEmployeeCsv(text);

    if (!parsed.ok) {
      setMissingColumns(parsed.missingColumns);
      setIssues(parsed.issues);
      if (parsed.missingColumns.length === 0 && parsed.issues.length === 0) {
        setUploadError('The CSV file could not be validated.');
      }
      return;
    }

    const nextRatings = Object.fromEntries(
      parsed.employees.map((employee) => [employee.EmployeeID, null]),
    );
    setEmployees(parsed.employees);
    setRatings(nextRatings);
    setRatingIndex(0);
  };

  const setCurrentRating = (value: number) => {
    if (!currentEmployee) {
      return;
    }
    setRatings((current) => ({
      ...current,
      [currentEmployee.EmployeeID]: value,
    }));
  };

  const runPrediction = async () => {
    if (!allRated) {
      setPredictError('Performance rating is required for every employee before prediction can run.');
      return;
    }

    setIsPredicting(true);
    setPredictError('');

    try {
      const payload = employees.map((employee) => {
        const { sourceRowNumber: _sourceRowNumber, ...rest } = employee;
        return {
          ...rest,
          PerformanceRating: ratings[employee.EmployeeID] as number,
        };
      });
      const response = await predictBulkEmployees(payload);
      setResults(response.results);
      setStep('results');
    } catch (error) {
      setPredictError(
        error instanceof Error
          ? error.message
          : 'Bulk prediction could not be completed. Please try again.',
      );
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <FileSpreadsheet size={17} />
        </span>
        <div>
          <p className="text-sm font-semibold">Bulk employee prediction</p>
          <p className="text-xs text-muted-foreground">
            Upload the CSV exported from your Google Form responses.
            Performance rating is entered by HR after upload.
          </p>
        </div>
      </div>

      {step === 'upload' && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <p className="label-kicker">Upload CSV</p>
          <h2 className="mt-2 text-lg font-semibold">Choose a Google Form export</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Extra columns such as Timestamp and Email Address are ignored.
            PerformanceRating should not be in the file.
          </p>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center transition hover:bg-muted/70">
            <Upload size={22} className="text-accent" />
            <span className="mt-3 text-sm font-semibold">Choose CSV file</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {fileName || 'No file selected'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFile}
              data-testid="input-bulk-csv"
            />
          </label>

          {uploadError && (
            <ValidationBox title="CSV could not be used" body={uploadError} />
          )}

          {missingColumns.length > 0 && (
            <div
              className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm"
              data-testid="status-missing-columns"
            >
              <p className="font-semibold">Missing required columns:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {missingColumns.map((column) => (
                  <li key={column}>{column}</li>
                ))}
              </ul>
            </div>
          )}

          {issues.length > 0 && (
            <div
              className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm"
              data-testid="status-csv-issues"
            >
              <p className="font-semibold">Invalid values were found</p>
              <ul className="mt-2 max-h-56 space-y-1 overflow-auto text-xs text-muted-foreground">
                {issues.slice(0, 40).map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
              </ul>
              {issues.length > 40 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing the first 40 issues of {issues.length}.
                </p>
              )}
            </div>
          )}

          {employees.length > 0 && (
            <div className="mt-6 space-y-4" data-testid="status-csv-preview">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Preview</p>
                <p className="font-mono text-xs text-muted-foreground">
                  Total employees: {employees.length}
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Employee name</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Job role</th>
                      <th className="px-4 py-3">Overtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.EmployeeID} className="border-t border-border">
                        <td className="px-4 py-3">{employee.EmployeeName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{employee.EmployeeID}</td>
                        <td className="px-4 py-3">{employee.Department}</td>
                        <td className="px-4 py-3">{employee.JobRole}</td>
                        <td className="px-4 py-3">{employee.OverTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep('rate')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md"
                  data-testid="button-csv-continue"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'rate' && currentEmployee && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <p className="label-kicker">Performance rating</p>
          <h2 className="mt-2 text-lg font-semibold">
            Employee {ratingIndex + 1} of {employees.length}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Employees do not provide this value. HR must rate every person
            before prediction can run.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Employee name" value={currentEmployee.EmployeeName} />
            <InfoBlock label="Employee ID" value={currentEmployee.EmployeeID} />
            <InfoBlock label="Department" value={currentEmployee.Department} />
            <InfoBlock label="Job role" value={currentEmployee.JobRole} />
          </div>

          <p className="mt-6 text-xs font-semibold">Performance rating</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = ratings[currentEmployee.EmployeeID] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCurrentRating(value)}
                  className={`h-11 w-11 rounded-xl border text-sm font-bold transition ${
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted'
                  }`}
                  data-testid={`button-rating-${value}`}
                >
                  {value}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (ratingIndex === 0) {
                  setStep('upload');
                  return;
                }
                setRatingIndex((index) => index - 1);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={15} />
              Previous
            </button>
            <button
              type="button"
              disabled={ratings[currentEmployee.EmployeeID] == null}
              onClick={() => {
                if (ratingIndex < employees.length - 1) {
                  setRatingIndex((index) => index + 1);
                  return;
                }
                setStep('review');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="button-rating-next"
            >
              {ratingIndex < employees.length - 1 ? 'Next' : 'Review ratings'}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
          <p className="label-kicker">Review</p>
          <h2 className="mt-2 text-lg font-semibold">Confirm performance ratings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prediction uses the existing trained model after HR ratings are attached.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Employee name</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Performance rating</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.EmployeeID} className="border-t border-border">
                    <td className="px-4 py-3">{employee.EmployeeName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{employee.EmployeeID}</td>
                    <td className="px-4 py-3">{ratings[employee.EmployeeID] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {predictError && (
            <ValidationBox title="Prediction could not be completed" body={predictError} />
          )}

          <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep('rate')}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              data-testid="button-edit-ratings"
            >
              Edit ratings
            </button>
            <button
              type="button"
              disabled={!allRated || isPredicting}
              onClick={runPrediction}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="button-run-bulk-prediction"
            >
              {isPredicting ? (
                <>
                  <SlidersHorizontal size={16} className="animate-pulse" />
                  Scoring employees…
                </>
              ) : (
                <>
                  Run bulk prediction
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {step === 'results' && (
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard label="Total employees" value={summary.total} />
            <SummaryCard label="Predicted to leave" value={summary.leave} />
            <SummaryCard label="Predicted to stay" value={summary.stay} />
            <SummaryCard label="High risk" value={summary.high} />
            <SummaryCard label="Medium risk" value={summary.medium} />
            <SummaryCard label="Low risk" value={summary.low} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="label-kicker">Results</p>
                <h2 className="mt-2 text-lg font-semibold">Bulk prediction results</h2>
              </div>
              <button
                type="button"
                onClick={() => downloadResultsCsv(results)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md"
                data-testid="button-download-results"
              >
                <Download size={15} />
                Download results CSV
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-xs font-semibold">
                Search employee name
                <span className="mt-1.5 flex items-center gap-2">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    value={searchName}
                    onChange={(event) => setSearchName(event.target.value)}
                    className="input-field"
                    placeholder="Rahul Sharma"
                  />
                </span>
              </label>
              <label className="block text-xs font-semibold">
                Search employee ID
                <input
                  value={searchId}
                  onChange={(event) => setSearchId(event.target.value)}
                  className="input-field mt-1.5"
                  placeholder="EMP001"
                />
              </label>
              <label className="block text-xs font-semibold">
                Filter prediction
                <select
                  value={filterPrediction}
                  onChange={(event) => setFilterPrediction(event.target.value)}
                  className="input-field mt-1.5"
                >
                  <option value="all">All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Filter risk level
                <select
                  value={filterRisk}
                  onChange={(event) => setFilterRisk(event.target.value)}
                  className="input-field mt-1.5"
                >
                  <option value="all">All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-left text-sm" data-testid="table-bulk-results">
                <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Employee name</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Job role</th>
                    <th className="px-4 py-3">Performance</th>
                    <th className="px-4 py-3">Prediction</th>
                    <th className="px-4 py-3">Probability</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((row) => (
                    <tr key={row.EmployeeID} className="border-t border-border">
                      <td className="px-4 py-3">{row.EmployeeName}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.EmployeeID}</td>
                      <td className="px-4 py-3">{row.Department}</td>
                      <td className="px-4 py-3">{row.JobRole}</td>
                      <td className="px-4 py-3">{row.PerformanceRating}</td>
                      <td className="px-4 py-3">{row.prediction}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatProbability(row.attrition_probability)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${riskClass(row.risk_level)}`}>
                          {row.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredResults.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No employees match the current search or filters.
              </p>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-secondary-foreground" />
              <span>
                Employee names and IDs are metadata only and were not sent into the
                trained model. Treat these scores as a prompt for context, not a
                decision.
              </span>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={resetBulk}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Upload another CSV
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl">{value}</p>
    </div>
  );
}

function ValidationBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
