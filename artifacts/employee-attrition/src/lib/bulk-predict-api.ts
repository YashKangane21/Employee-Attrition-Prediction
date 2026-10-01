import type { EmployeeInput } from '@workspace/api-client-react';

export type BulkEmployeePayload = EmployeeInput & {
  EmployeeName: string;
  EmployeeID: string;
};

export type BulkPredictionResult = EmployeeInput & {
  EmployeeName: string;
  EmployeeID: string;
  CompanyExperienceRatio: number;
  PromotionFrequency: number;
  IncomePerYearExperience: number;
  SatisfactionScore: number;
  RoleTenureRatio: number;
  prediction: 'Yes' | 'No';
  attrition_probability: number;
  risk_level: 'Low' | 'Medium' | 'High';
  model_used: string;
};

export type BulkPredictResponse = {
  results: BulkPredictionResult[];
};

function readErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return fallback;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error;
  }
  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail;
  }
  return fallback;
}

export async function predictBulkEmployees(
  employees: BulkEmployeePayload[],
): Promise<BulkPredictResponse> {
  let response: Response;
  try {
    response = await fetch('/api/predict-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ employees }),
    });
  } catch {
    throw new Error(
      'Network error. Make sure the prediction service is running, then try again.',
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      readErrorMessage(
        data,
        'Bulk prediction could not be completed. Please review the employee data and try again.',
      ),
    );
  }

  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as BulkPredictResponse).results)
  ) {
    throw new Error('The prediction service returned an unexpected response.');
  }

  return data as BulkPredictResponse;
}

export const RESULTS_CSV_COLUMNS = [
  'EmployeeName',
  'EmployeeID',
  'Age',
  'BusinessTravel',
  'Department',
  'DistanceFromHome',
  'Education',
  'EducationField',
  'EnvironmentSatisfaction',
  'Gender',
  'JobInvolvement',
  'JobLevel',
  'JobRole',
  'JobSatisfaction',
  'MaritalStatus',
  'MonthlyIncome',
  'NumCompaniesWorked',
  'OverTime',
  'PercentSalaryHike',
  'PerformanceRating',
  'RelationshipSatisfaction',
  'StockOptionLevel',
  'TotalWorkingYears',
  'TrainingTimesLastYear',
  'WorkLifeBalance',
  'YearsAtCompany',
  'YearsInCurrentRole',
  'YearsSinceLastPromotion',
  'YearsWithCurrManager',
  'CompanyExperienceRatio',
  'PromotionFrequency',
  'IncomePerYearExperience',
  'SatisfactionScore',
  'RoleTenureRatio',
  'AttritionPrediction',
  'AttritionProbability',
  'RiskLevel',
] as const;

function csvEscape(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function buildResultsCsv(results: BulkPredictionResult[]): string {
  const lines = [
    RESULTS_CSV_COLUMNS.join(','),
    ...results.map((row) =>
      RESULTS_CSV_COLUMNS.map((column) => {
        if (column === 'AttritionPrediction') {
          return csvEscape(row.prediction);
        }
        if (column === 'AttritionProbability') {
          return csvEscape(row.attrition_probability);
        }
        if (column === 'RiskLevel') {
          return csvEscape(row.risk_level);
        }
        return csvEscape(row[column as keyof BulkPredictionResult] as string | number);
      }).join(','),
    ),
  ];
  return `${lines.join('\n')}\n`;
}

export function downloadResultsCsv(results: BulkPredictionResult[]): void {
  const blob = new Blob([buildResultsCsv(results)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'employee_attrition_results.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
