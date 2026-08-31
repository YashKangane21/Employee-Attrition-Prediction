# Employee Attrition Prediction System

A complete third-year AIML course project that uses the IBM HR Employee Attrition dataset to estimate whether an employee may leave an organization. The project combines a real scikit-learn training pipeline, a FastAPI backend, and a React/Vite HR analytics dashboard.

## Features

- Dataset dashboard with calculated employee totals, attrition rate, department, job role, overtime, and income distributions
- Random Forest model trained on the provided dataset with a stratified 80/20 holdout split
- Logistic Regression comparison using accuracy, precision, recall, and F1 score
- Confusion matrix and top feature importance analysis
- Employee prediction form using all 27 approved input features
- Probability-based risk meter with Low, Medium, and High risk bands
- Shared preprocessing pipeline with one-hot encoding for categorical features
- Responsive React UI for laptop and mobile screens
- Graceful loading, validation, and error states

## Project structure

```text
backend/
├── data/employee_attrition.csv       # provided IBM HR dataset
├── models/                           # generated after training
├── main.py                            # FastAPI app
├── predict_cli.py                     # JSON adapter for the Replit preview API
├── train_model.py                     # training and evaluation script
└── requirements.txt

artifacts/employee-attrition/
└── src/                               # React/Vite frontend

artifacts/api-server/
└── src/routes/attrition.ts            # preview adapter for the shared API service
```

## Dataset and feature selection

The source dataset has 1,470 employees and 35 columns. The target column is `Attrition` (`Yes` or `No`).

These 7 columns are removed because they are identifiers, constants, or otherwise unnecessary:

`DailyRate`, `EmployeeCount`, `EmployeeNumber`, `HourlyRate`, `MonthlyRate`, `Over18`, `StandardHours`

The model uses exactly these 27 input features:

`Age`, `BusinessTravel`, `Department`, `DistanceFromHome`, `Education`, `EducationField`, `EnvironmentSatisfaction`, `Gender`, `JobInvolvement`, `JobLevel`, `JobRole`, `JobSatisfaction`, `MaritalStatus`, `MonthlyIncome`, `NumCompaniesWorked`, `OverTime`, `PercentSalaryHike`, `PerformanceRating`, `RelationshipSatisfaction`, `StockOptionLevel`, `TotalWorkingYears`, `TrainingTimesLastYear`, `WorkLifeBalance`, `YearsAtCompany`, `YearsInCurrentRole`, `YearsSinceLastPromotion`, `YearsWithCurrManager`

## Machine learning workflow

1. Load the CSV with Pandas.
2. Check model columns for missing values and duplicate rows.
3. Split the data with `test_size=0.2`, `random_state=42`, and `stratify=y`.
4. One-hot encode the seven categorical features with `handle_unknown="ignore"`.
5. Train a class-weighted Random Forest as the primary model.
6. Train a class-weighted Logistic Regression comparison model.
7. Calculate accuracy, precision, recall, F1 score, and the confusion matrix.
8. Save the fitted preprocessing and Random Forest model together as `backend/models/attrition_model.pkl`.
9. Save calculated dashboard and model-insight JSON files alongside the model.

The reported metrics and prediction probabilities are generated from the actual uploaded dataset and saved model. They are not hardcoded.

## Run locally in VS Code

### 1. Start the FastAPI backend

From the project root:

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r backend/requirements.txt
python backend/train_model.py
uvicorn backend.main:app --reload --port 8000
```

FastAPI will be available at `http://localhost:8000`. Interactive API documentation is at `http://localhost:8000/docs`.

### 2. Start the React frontend

In a second terminal:

```bash
cd artifacts/employee-attrition
pnpm install

# PowerShell
$env:VITE_API_BASE_URL="http://localhost:8000"
pnpm dev

# macOS/Linux
VITE_API_BASE_URL=http://localhost:8000 pnpm dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

If you use npm instead of pnpm, `npm install` and `npm run dev` work in the frontend directory as well.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | FastAPI health check |
| GET | `/dashboard` | Dataset summaries and grouped distributions |
| GET | `/model-metrics` | Holdout metrics, confusion matrix, and feature importance |
| POST | `/predict` | Validate a 27-feature employee record and return model-backed risk |

The Replit preview uses the equivalent `/api/healthz`, `/api/dashboard`, `/api/model-metrics`, and `/api/predict` paths through the shared API adapter.

## Important note

Attrition risk is a model estimate, not a certainty. The interface intentionally describes the output as predicted likelihood and should not be used as the sole basis for employment decisions.