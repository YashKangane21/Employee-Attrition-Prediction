import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, RotateCcw, ScanSearch, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'wouter';
import { usePredictAttrition, type EmployeeInput, type Prediction } from '@workspace/api-client-react';

const initialEmployee: EmployeeInput = {
  Age: 34,
  BusinessTravel: 'Travel_Rarely',
  Department: 'Research & Development',
  DistanceFromHome: 5,
  Education: 3,
  EducationField: 'Life Sciences',
  EnvironmentSatisfaction: 3,
  Gender: 'Female',
  JobInvolvement: 3,
  JobLevel: 2,
  JobRole: 'Research Scientist',
  JobSatisfaction: 3,
  MaritalStatus: 'Married',
  MonthlyIncome: 5000,
  NumCompaniesWorked: 2,
  OverTime: 'No',
  PercentSalaryHike: 14,
  PerformanceRating: 3,
  RelationshipSatisfaction: 3,
  StockOptionLevel: 1,
  TotalWorkingYears: 10,
  TrainingTimesLastYear: 3,
  WorkLifeBalance: 3,
  YearsAtCompany: 5,
  YearsInCurrentRole: 3,
  YearsSinceLastPromotion: 1,
  YearsWithCurrManager: 3,
};

type FieldConfig = { key: keyof EmployeeInput; label: string; help?: string; min?: number; max?: number; options?: string[] };

const sections: { title: string; eyebrow: string; fields: FieldConfig[] }[] = [
  {
    title: 'Work context', eyebrow: '01', fields: [
      { key: 'BusinessTravel', label: 'Business travel', options: ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'] },
      { key: 'Department', label: 'Department', options: ['Sales', 'Research & Development', 'Human Resources'] },
      { key: 'JobRole', label: 'Job role', options: ['Sales Executive', 'Research Scientist', 'Laboratory Technician', 'Manufacturing Director', 'Healthcare Representative', 'Manager', 'Sales Representative', 'Research Director', 'Human Resources'] },
      { key: 'OverTime', label: 'Overtime', options: ['Yes', 'No'] },
      { key: 'DistanceFromHome', label: 'Distance from home', help: 'in miles', min: 1, max: 100 },
      { key: 'NumCompaniesWorked', label: 'Companies worked', min: 0, max: 20 },
    ],
  },
  {
    title: 'Employee profile', eyebrow: '02', fields: [
      { key: 'Age', label: 'Age', min: 18, max: 75 },
      { key: 'Gender', label: 'Gender', options: ['Female', 'Male'] },
      { key: 'MaritalStatus', label: 'Marital status', options: ['Single', 'Married', 'Divorced'] },
      { key: 'Education', label: 'Education level', help: '1–5 scale', min: 1, max: 5 },
      { key: 'EducationField', label: 'Education field', options: ['Life Sciences', 'Medical', 'Marketing', 'Technical Degree', 'Human Resources', 'Other'] },
      { key: 'StockOptionLevel', label: 'Stock option level', min: 0, max: 3 },
    ],
  },
  {
    title: 'Experience & growth', eyebrow: '03', fields: [
      { key: 'JobLevel', label: 'Job level', min: 1, max: 5 },
      { key: 'TotalWorkingYears', label: 'Total working years', min: 0, max: 50 },
      { key: 'YearsAtCompany', label: 'Years at company', min: 0, max: 50 },
      { key: 'YearsInCurrentRole', label: 'Years in current role', min: 0, max: 20 },
      { key: 'YearsSinceLastPromotion', label: 'Years since promotion', min: 0, max: 20 },
      { key: 'YearsWithCurrManager', label: 'Years with manager', min: 0, max: 20 },
      { key: 'TrainingTimesLastYear', label: 'Training last year', min: 0, max: 20 },
    ],
  },
  {
    title: 'Experience at work', eyebrow: '04', fields: [
      { key: 'EnvironmentSatisfaction', label: 'Environment satisfaction', help: '1–4 scale', min: 1, max: 4 },
      { key: 'JobInvolvement', label: 'Job involvement', help: '1–4 scale', min: 1, max: 4 },
      { key: 'JobSatisfaction', label: 'Job satisfaction', help: '1–4 scale', min: 1, max: 4 },
      { key: 'RelationshipSatisfaction', label: 'Relationship satisfaction', help: '1–4 scale', min: 1, max: 4 },
      { key: 'WorkLifeBalance', label: 'Work-life balance', help: '1–4 scale', min: 1, max: 4 },
      { key: 'PerformanceRating', label: 'Performance rating', min: 1, max: 5 },
      { key: 'PercentSalaryHike', label: 'Salary hike', help: 'percentage', min: 10, max: 30 },
      { key: 'MonthlyIncome', label: 'Monthly income', help: 'in dollars', min: 100, max: 20000 },
    ],
  },
];

function ResultCard({ result }: { result: Prediction }) {
  const isLeaving = result.prediction === 'Yes';
  const probability = Math.max(0, Math.min(result.attrition_probability > 1 ? result.attrition_probability / 100 : result.attrition_probability, 1));
  const riskClass = result.risk_level === 'High' ? 'bg-destructive/10 text-destructive border-destructive/25' : result.risk_level === 'Medium' ? 'bg-accent/20 text-accent-foreground border-accent/35' : 'bg-secondary text-secondary-foreground border-secondary-foreground/20';
  return (
    <aside className="sticky top-[92px] rounded-2xl border border-border bg-card p-6 shadow-md md:p-7" data-testid="card-prediction-result">
      <div className="flex items-center justify-between"><p className="label-kicker">Prediction result</p><Sparkles size={18} className="text-accent" /></div>
      <div className="mt-8 flex items-start justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Predicted attrition</p><h2 className={`mt-2 text-4xl font-semibold tracking-tight ${isLeaving ? 'text-destructive' : 'text-secondary-foreground'}`} data-testid="text-prediction">{result.prediction}</h2></div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${riskClass}`} data-testid="status-risk-level">{result.risk_level} risk</span>
      </div>
      <div className="mt-9 border-t border-border pt-6">
        <div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">Attrition probability</span><span className="font-mono text-2xl" data-testid="text-attrition-probability">{(probability * 100).toFixed(1)}%</span></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all duration-700 ${isLeaving ? 'bg-destructive' : 'bg-secondary-foreground'}`} style={{ width: `${probability * 100}%` }} /></div>
        <div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground"><span>lower signal</span><span>higher signal</span></div>
      </div>
      <div className="mt-7 flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-secondary-foreground" /><span>Scored by <strong className="font-semibold text-foreground">{result.model_used}</strong>. Treat this as a prompt for context, not a decision.</span></div>
    </aside>
  );
}

export default function Predict() {
  const [form, setForm] = useState<EmployeeInput>(initialEmployee);
  const mutation = usePredictAttrition();
  const result = mutation.data;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = event.currentTarget;
    const key = target.name as keyof EmployeeInput;
    const value = target.type === 'number' ? Number(target.value) : target.value;
    setForm((current) => ({ ...current, [key]: value } as EmployeeInput));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({ data: form });
  };

  const handleReset = () => {
    setForm(initialEmployee);
    mutation.reset();
  };

  return (
    <div className="space-y-9">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="animate-rise-in">
          <p className="label-kicker">02 / Single profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Read one profile.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Use the same 27 features used by the pipeline to explore a retention-risk signal. Fields are prefilled to make the workflow easy to inspect.</p>
        </div>
        <Link href="/dashboard" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground" data-testid="link-predict-back"><ArrowLeft size={15} /> Back to overview</Link>
      </header>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-predict-employee">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><ClipboardList size={17} /></span>
            <div><p className="text-sm font-semibold">Profile inputs</p><p className="text-xs text-muted-foreground">Every field is sent to the saved preprocessing pipeline.</p></div>
            <span className="ml-auto font-mono text-xs text-muted-foreground">27 / 27</span>
          </div>
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-4 border-b border-border pb-5"><span className="font-mono text-xs text-accent">{section.eyebrow}</span><div><h2 className="text-lg font-semibold">{section.title}</h2><p className="mt-1 text-xs text-muted-foreground">{section.title === 'Work context' ? 'The environment around this employee.' : section.title === 'Employee profile' ? 'Basic demographic and education context.' : section.title === 'Experience & growth' ? 'Tenure and progression signals.' : 'Self-reported and observed workplace signals.'}</p></div></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold"><span>{field.label}</span>{field.help && <span className="font-normal text-muted-foreground">{field.help}</span>}</span>
                    {field.options ? <select name={field.key} value={String(form[field.key])} onChange={handleChange} className="input-field" data-testid={`input-${field.key}`}><option value="" disabled>Select value</option>{field.options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select> : <input required type="number" name={field.key} min={field.min} max={field.max} value={String(form[field.key])} onChange={handleChange} className="input-field" data-testid={`input-${field.key}`} />}
                  </label>
                ))}
              </div>
            </section>
          ))}
          {mutation.isError && <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm" data-testid="status-prediction-error"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-destructive" /><div><p className="font-semibold">Prediction could not be completed</p><p className="mt-1 text-xs text-muted-foreground">Check the profile values and try the request again.</p></div></div>}
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
            <button type="button" onClick={handleReset} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground" data-testid="button-reset-form"><RotateCcw size={15} /> Reset fields</button>
            <button type="submit" disabled={mutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-60" data-testid="button-run-prediction">{mutation.isPending ? <><SlidersHorizontal size={16} className="animate-pulse" /> Scoring profile…</> : <>Run prediction <ArrowRight size={16} /></>}</button>
          </div>
        </form>
        <div>
          {result ? <ResultCard result={result} /> : <div className="sticky top-[92px] rounded-2xl border border-dashed border-border bg-card/60 p-6 md:p-7" data-testid="status-prediction-empty"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><ScanSearch size={22} /></div><p className="label-kicker mt-9">Awaiting profile</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Your result will land here.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Complete the profile on the left, then run the saved model. The response includes a class, probability, risk level, and model name.</p><div className="mt-8 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-accent" /> No request has been made</div></div>}
        </div>
      </div>
    </div>
  );
}