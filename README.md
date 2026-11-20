# Employee Attrition Prediction & Smart Retention Recommendation System

An end-to-end machine-learning and decision-support system that estimates employee
attrition risk from workplace attributes, provides explainable HR retention
recommendations, and performs model-driven What-If risk simulations for both
individual employees and bulk cohorts.

> **Status:** Production-ready prototype. Includes calibrated SVM probability
> predictions, interactive What-If simulation dashboards, and full end-to-end
> test coverage.

## Features

- **Predict Employee Attrition Risk:** Estimate turnover probability and classify risk levels (High, Medium, Low) using a trained SVM pipeline.
- **Smart Employee Retention Recommendations:** Actionable, explainable HR intervention suggestions based on actual employee attributes (workload, satisfaction, work-life balance, career growth, etc.).
- **What-If Risk Analysis (Single & Combined):** Re-evaluate the trained ML model dynamically on modified conditions to compute individual and combined simulated risk changes ($\Delta$ percentage points).
- **Interactive Multi-Action Simulator:** Toggle recommended interventions on or off in real time to observe the net model-predicted risk outcome.
- **Bulk Employee Prediction & Retention Dashboard:** Upload a Google Form CSV to score multiple employees, view cohort-level retention metrics, and open individual What-If simulators for any employee.
- **Calibrated Probabilities:** Evaluates whether the trained model supports calibrated probabilities (Platt scaling cross-validation calibration via `SVC(probability=True)`).
- **Input and CSV Validation:** Strict Pydantic and frontend CSV validation for data integrity and error handling.
- **Model Comparison:** Evaluated seven classification algorithms with cross-validation F1-score model selection.
- **FastAPI Endpoints:** REST APIs for prediction, dashboard cohort stats, model metrics, and retention simulations.
- **Responsible Decision Support:** Clear ethical governance disclaimers indicating simulations are prompts for HR dialogue, not guaranteed causal effects or automated employment decisions.

## Technology Stack

- **Backend & ML:** Python, FastAPI, Pydantic, scikit-learn, pandas, NumPy, joblib
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Radix UI
- **Testing:** pytest, FastAPI TestClient
- **Artifacts:** Pre-fitted SVM pipeline (`attrition_model.pkl`), metrics, and dataset statistics

## Project Structure

```text
employee-attrition-prediction/
├── backend/
│   ├── data/
│   │   └── employee_attrition_selected.csv
│   ├── models/
│   │   ├── attrition_model.pkl          # Fitted ColumnTransformer + SVC pipeline
│   │   ├── metrics.json                 # Evaluation metrics and comparison
│   │   ├── model_comparison.csv         # Comparison table across 7 classifiers
│   │   └── dataset_stats.json           # Cohort statistics for dashboard
│   ├── notebooks/
│   │   ├── 02_Feature_Engineering.ipynb
│   │   ├── 03_Feature_Selection.ipynb
│   │   └── 04_Model_Training_Final_Fixed.ipynb
│   ├── main.py                          # FastAPI application and prediction endpoints
│   ├── recommendations.py               # Retention recommendation & What-If simulation engine
│   ├── test_recommendations.py          # Unit and integration test suite
│   └── requirements.txt
├── artifacts/
│   └── employee-attrition/              # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── dashboard.tsx        # Cohort overview page
│           │   ├── predict.tsx          # Single & bulk prediction page
│           │   ├── insights.tsx         # Model evaluation & metrics page
│           │   └── home.tsx
│           ├── components/
│           │   ├── retention-recommendations.tsx  # Interactive What-If simulation card
│           │   ├── bulk-retention-dashboard.tsx   # Cohort retention overview & simulator
│           │   ├── bulk-predict-panel.tsx         # CSV upload & bulk scoring panel
│           │   └── ui/                            # Design system components
│           └── lib/
│               ├── bulk-csv.ts          # CSV parsing & schema validation
│               └── bulk-predict-api.ts  # Bulk API client & CSV export utilities
├── package.json
└── README.md
```

## How It Works

1. **Prepare Dataset:** IBM HR Analytics Employee Attrition dataset.
2. **Feature Engineering:** Five engineered features created dynamically in inference and training:
   - `CompanyExperienceRatio` = `YearsAtCompany` / `TotalWorkingYears`
   - `PromotionFrequency` = `YearsSinceLastPromotion` / `YearsAtCompany`
   - `IncomePerYearExperience` = `MonthlyIncome` / `TotalWorkingYears`
   - `SatisfactionScore` = Average of Job, Environment, Relationship, and Work-Life Satisfaction
   - `RoleTenureRatio` = `YearsInCurrentRole` / `YearsAtCompany`
3. **Train & Select Model:** Trained and evaluated seven classifiers using stratified cross-validation. Selected SVM (`SVC(class_weight='balanced', probability=True, random_state=42)`) based on cross-validation F1-score.
4. **Calibrated Probability Check:** The model verifies calibrated probability estimation support via Platt scaling before calculating risk percentages.
5. **Smart Recommendation Generation:** Analyzes employee attributes against explainable HR rules to suggest personalized actions:
   - *OverTime = Yes* $\rightarrow$ Reduce excessive overtime and review workload (High Priority).
   - *JobSatisfaction $\le$ 2* $\rightarrow$ Conduct 1-on-1 feedback sessions and realign role responsibilities.
   - *WorkLifeBalance $\le$ 2* $\rightarrow$ Discuss flexible working arrangements and enforce boundaries.
   - *YearsSinceLastPromotion $\ge$ 4* $\rightarrow$ Review promotion criteria and career growth opportunities.
   - *EnvironmentSatisfaction $\le$ 2* $\rightarrow$ Upgrade workspace conditions and team climate.
   - *JobInvolvement $\le$ 2* $\rightarrow$ Grant project autonomy and clarify strategic alignment.
   - *BusinessTravel = Travel_Frequently* $\rightarrow$ Moderate travel and utilize video conferencing.
   - *TrainingTimesLastYear $\le$ 1* $\rightarrow$ Provide professional upskilling and training sessions.
   - *RelationshipSatisfaction $\le$ 2* $\rightarrow$ Facilitate peer mentorship and team building.
   - *StockOptionLevel = 0* $\rightarrow$ Review equity participation and long-term incentives.
6. **What-If Simulation:** Applies proposed condition improvements, recalculates engineered features, and re-scores through the trained SVM pipeline to compute simulated risk and difference ($\Delta$ pp).
7. **Combined Scenario Analysis:** Allows users to check/uncheck combinations of interventions to simulate combined outcomes dynamically.
8. **Bulk Cohort Analysis:** Upload CSV files to score dozens of employees simultaneously, view cohort-level retention metrics, and launch individual what-if simulators.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` / `/api/healthz` | Health check endpoint |
| `GET` | `/dashboard` / `/api/dashboard` | Cohort statistics and distribution metrics |
| `GET` | `/model-metrics` / `/api/model-metrics` | Trained model metrics and 7-model comparison |
| `POST` | `/predict` / `/api/predict` | Predict attrition for a single employee |
| `POST` | `/predict-bulk` / `/api/predict-bulk` | Bulk prediction for multiple employee records |
| `POST` | `/recommendations` / `/api/recommendations` | Generate recommendations & What-If simulations for an employee |
| `POST` | `/recommendations/simulate` / `/api/recommendations/simulate` | Simulate custom combinations of selected recommendations |
| `POST` | `/recommendations/bulk` / `/api/recommendations/bulk` | Cohort-wide retention analysis & per-employee recommendations |

API interactive documentation: `http://127.0.0.1:8000/docs`

## Setup and Run

### 1. Create and Activate Virtual Environment

**Windows PowerShell:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Run Automated Tests

Run the test suite verifying probability estimation, rule evaluation, single & combined what-if simulations, and API endpoints:
```powershell
pytest -v backend/test_recommendations.py
```

### 4. Start the FastAPI Backend

From the repository root:
```powershell
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
Or from inside `backend/`:
```powershell
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 5. Start the Frontend Application

In a separate terminal:
```bash
cd artifacts/employee-attrition
pnpm install
pnpm run dev
```

Open the local Vite URL (e.g., `http://localhost:5173`). The Vite `/api` proxy automatically routes requests to FastAPI on port `8000`.

## Input Validation

The API and bulk CSV workflow validate incoming data against strict schemas:
- **Identifier fields:** `EmployeeName`, `EmployeeID` (metadata only, excluded from ML features).
- **Numeric fields:** `Age` (18–75), `DistanceFromHome` (1–100), `MonthlyIncome` (100–20,000), `TotalWorkingYears` (0–50), `YearsAtCompany` (0–50), etc.
- **Categorical fields:** `BusinessTravel`, `Department`, `EducationField`, `Gender`, `JobRole`, `MaritalStatus`, `OverTime`.
- **Duplicate Prevention:** Bulk uploads reject duplicate employee IDs.

## Ethical AI & Decision Support Notice

Recommendations and simulated risk shifts are produced by re-scoring modified employee inputs through the trained SVM pipeline. These are **model-based simulations** designed to guide HR exploratory discussions and prioritize support. They do **not** represent proven causal guarantees that an employee will stay, and the system must **never** be used to make automated employment decisions.

## License

This project is licensed under the MIT License.
