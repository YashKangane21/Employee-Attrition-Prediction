import type { EmployeeInput } from '@workspace/api-client-react';

export const CSV_IDENTIFIER_FIELDS = ['EmployeeName', 'EmployeeID'] as const;

export const CSV_MODEL_FIELDS = [
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
  'RelationshipSatisfaction',
  'StockOptionLevel',
  'TotalWorkingYears',
  'TrainingTimesLastYear',
  'WorkLifeBalance',
  'YearsAtCompany',
  'YearsInCurrentRole',
  'YearsSinceLastPromotion',
  'YearsWithCurrManager',
] as const;

export const REQUIRED_CSV_COLUMNS = [
  ...CSV_IDENTIFIER_FIELDS,
  ...CSV_MODEL_FIELDS,
] as const;

export const CATEGORICAL_VALUES = {
  BusinessTravel: ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'],
  Department: ['Sales', 'Research & Development', 'Human Resources'],
  EducationField: [
    'Life Sciences',
    'Medical',
    'Marketing',
    'Technical Degree',
    'Human Resources',
    'Other',
  ],
  Gender: ['Female', 'Male'],
  JobRole: [
    'Sales Executive',
    'Research Scientist',
    'Laboratory Technician',
    'Manufacturing Director',
    'Healthcare Representative',
    'Manager',
    'Sales Representative',
    'Research Director',
    'Human Resources',
  ],
  MaritalStatus: ['Single', 'Married', 'Divorced'],
  OverTime: ['Yes', 'No'],
} as const;

export const NUMERIC_RANGES: Record<
  (typeof CSV_MODEL_FIELDS)[number],
  { min: number; max: number } | undefined
> = {
  Age: { min: 18, max: 75 },
  BusinessTravel: undefined,
  Department: undefined,
  DistanceFromHome: { min: 1, max: 100 },
  Education: { min: 1, max: 5 },
  EducationField: undefined,
  EnvironmentSatisfaction: { min: 1, max: 4 },
  Gender: undefined,
  JobInvolvement: { min: 1, max: 4 },
  JobLevel: { min: 1, max: 5 },
  JobRole: undefined,
  JobSatisfaction: { min: 1, max: 4 },
  MaritalStatus: undefined,
  MonthlyIncome: { min: 100, max: 20000 },
  NumCompaniesWorked: { min: 0, max: 20 },
  OverTime: undefined,
  PercentSalaryHike: { min: 10, max: 30 },
  RelationshipSatisfaction: { min: 1, max: 4 },
  StockOptionLevel: { min: 0, max: 3 },
  TotalWorkingYears: { min: 0, max: 50 },
  TrainingTimesLastYear: { min: 0, max: 20 },
  WorkLifeBalance: { min: 1, max: 4 },
  YearsAtCompany: { min: 0, max: 50 },
  YearsInCurrentRole: { min: 0, max: 20 },
  YearsSinceLastPromotion: { min: 0, max: 20 },
  YearsWithCurrManager: { min: 0, max: 20 },
};

export type CsvModelField = (typeof CSV_MODEL_FIELDS)[number];

export type ParsedEmployeeRow = Omit<EmployeeInput, 'PerformanceRating'> & {
  EmployeeName: string;
  EmployeeID: string;
  sourceRowNumber: number;
};

export type CsvValidationIssue = {
  rowNumber?: number;
  employeeId?: string;
  message: string;
};

export type CsvParseResult =
  | {
      ok: true;
      employees: ParsedEmployeeRow[];
    }
  | {
      ok: false;
      missingColumns: string[];
      issues: CsvValidationIssue[];
    };

function normalizeHeaderKey(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_]+/g, '');
}

const CANONICAL_HEADERS = Object.fromEntries(
  REQUIRED_CSV_COLUMNS.map((column) => [normalizeHeaderKey(column), column]),
) as Record<string, (typeof REQUIRED_CSV_COLUMNS)[number]>;

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function matchCategorical(field: keyof typeof CATEGORICAL_VALUES, raw: string): string | null {
  const allowed = CATEGORICAL_VALUES[field];
  const compact = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

  for (const value of allowed) {
    if (value.toLowerCase().replace(/[\s-]+/g, '_') === compact) {
      return value;
    }
  }

  return null;
}

function parseInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+(\.0+)?$/.test(trimmed)) {
    return null;
  }
  return Number.parseInt(trimmed, 10);
}

export function parseAndValidateEmployeeCsv(text: string): CsvParseResult {
  const table = parseCsvText(text);
  if (table.length === 0) {
    return {
      ok: false,
      missingColumns: [],
      issues: [{ message: 'The CSV file is empty.' }],
    };
  }

  const headerRow = table[0].map((cell) => cell.replace(/^\uFEFF/, '').trim());
  const headerIndex = new Map<string, number>();

  headerRow.forEach((header, index) => {
    const canonical = CANONICAL_HEADERS[normalizeHeaderKey(header)];
    if (canonical && !headerIndex.has(canonical)) {
      headerIndex.set(canonical, index);
    }
  });

  const missingColumns = REQUIRED_CSV_COLUMNS.filter((column) => !headerIndex.has(column));
  if (missingColumns.length > 0) {
    return {
      ok: false,
      missingColumns: [...missingColumns],
      issues: [],
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length === 0) {
    return {
      ok: false,
      missingColumns: [],
      issues: [{ message: 'The CSV file does not contain any employee rows.' }],
    };
  }

  const issues: CsvValidationIssue[] = [];
  const employees: ParsedEmployeeRow[] = [];
  const seenIds = new Map<string, number>();

  dataRows.forEach((cells, dataIndex) => {
    const rowNumber = dataIndex + 2;
    const get = (column: (typeof REQUIRED_CSV_COLUMNS)[number]) => {
      const index = headerIndex.get(column);
      return index === undefined ? '' : (cells[index] ?? '').trim();
    };

    const employeeName = get('EmployeeName');
    const employeeId = get('EmployeeID');

    if (!employeeName) {
      issues.push({
        rowNumber,
        employeeId: employeeId || undefined,
        message: `Row ${rowNumber}: EmployeeName is missing.`,
      });
    }

    if (!employeeId) {
      issues.push({
        rowNumber,
        message: `Row ${rowNumber}: EmployeeID is missing.`,
      });
    } else if (seenIds.has(employeeId)) {
      issues.push({
        rowNumber,
        employeeId,
        message: `Row ${rowNumber}: EmployeeID "${employeeId}" is duplicated (also used on row ${seenIds.get(employeeId)}).`,
      });
    } else {
      seenIds.set(employeeId, rowNumber);
    }

        const modelValues: Partial<Omit<EmployeeInput, 'PerformanceRating'>> = {};

    for (const field of CSV_MODEL_FIELDS) {
      const raw = get(field);
      if (!raw) {
        issues.push({
          rowNumber,
          employeeId: employeeId || undefined,
          message: `Row ${rowNumber}${employeeId ? ` (${employeeId})` : ''}: ${field} is missing.`,
        });
        continue;
      }

      if (field in CATEGORICAL_VALUES) {
        const matched = matchCategorical(
          field as keyof typeof CATEGORICAL_VALUES,
          raw,
        );
        if (!matched) {
          issues.push({
            rowNumber,
            employeeId: employeeId || undefined,
            message: `Row ${rowNumber}${employeeId ? ` (${employeeId})` : ''}: ${field} has an invalid value "${raw}".`,
          });
          continue;
        }
        (modelValues as Record<string, string>)[field] = matched;
        continue;
      }

      const parsed = parseInteger(raw);
      const range = NUMERIC_RANGES[field];
      if (parsed === null) {
        issues.push({
          rowNumber,
          employeeId: employeeId || undefined,
          message: `Row ${rowNumber}${employeeId ? ` (${employeeId})` : ''}: ${field} must be a whole number.`,
        });
        continue;
      }
      if (range && (parsed < range.min || parsed > range.max)) {
        issues.push({
          rowNumber,
          employeeId: employeeId || undefined,
          message: `Row ${rowNumber}${employeeId ? ` (${employeeId})` : ''}: ${field} must be between ${range.min} and ${range.max}.`,
        });
        continue;
      }
      (modelValues as Record<string, number>)[field] = parsed;
    }

    if (issues.some((issue) => issue.rowNumber === rowNumber)) {
      return;
    }

    employees.push({
      ...(modelValues as Omit<EmployeeInput, 'PerformanceRating'>),
      EmployeeName: employeeName,
      EmployeeID: employeeId,
      sourceRowNumber: rowNumber,
    });
  });

  if (issues.length > 0) {
    return { ok: false, missingColumns: [], issues };
  }

  return { ok: true, employees };
}

export function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
}
