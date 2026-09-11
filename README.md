# Employee Attrition Prediction System

A machine learning based employee attrition prediction system built using the IBM HR Employee Attrition dataset. The project combines data preprocessing, feature engineering, machine learning model comparison, a FastAPI backend, and a React/Vite frontend dashboard.

The system is designed as an academic AIML course project as well as a working local web application.

---

## Project Overview

The application helps analyze employee attrition patterns and predict the likelihood that an individual employee may leave the organization.

It provides three main areas:

- **Dataset Overview** — summarizes the employee dataset and attrition patterns.
- **Predict Attrition Risk** — accepts an employee profile and returns an attrition prediction, probability, and risk level.
- **Model Insights** — displays model performance, confusion matrix, model comparison, and feature importance.

> **Important:** The prediction is a machine learning estimate, not a certainty. It should not be used as the sole basis for employment or HR decisions.

---

## Technology Stack

### Machine Learning / Data Science
- Python
- Pandas
- NumPy
- Scikit-learn
- Joblib
- Jupyter Notebook

### Backend
- FastAPI
- Uvicorn
- Pydantic

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

---

## Dataset

The project uses the **IBM HR Employee Attrition** dataset.

- Total employees: **1,470**
- Original columns: **35**
- Target column: `Attrition`
- Target classes:
  - `Yes` — employee left
  - `No` — employee stayed
- Attrition distribution:
  - `No`: 1,233 employees (83.88%)
  - `Yes`: 237 employees (16.12%)

Because the target is imbalanced, model evaluation considers metrics such as Precision, Recall, F1 Score, ROC-AUC, and PR-AUC instead of relying only on accuracy.

---

## Data Preparation

Seven unnecessary columns are removed from the original dataset:

```text
DailyRate
EmployeeCount
EmployeeNumber
HourlyRate
MonthlyRate
Over18
StandardHours
```

After preprocessing and feature engineering, the final modelling dataset contains:

- **32 predictor features**
- **1 target column**
- **33 columns in total**

### Original user-entered features

The prediction form accepts the following 27 original employee attributes:

```text
Age
BusinessTravel
Department
DistanceFromHome
Education
EducationField
EnvironmentSatisfaction
Gender
JobInvolvement
JobLevel
JobRole
JobSatisfaction
MaritalStatus
MonthlyIncome
NumCompaniesWorked
OverTime
PercentSalaryHike
PerformanceRating
RelationshipSatisfaction
StockOptionLevel
TotalWorkingYears
TrainingTimesLastYear
WorkLifeBalance
YearsAtCompany
YearsInCurrentRole
YearsSinceLastPromotion
YearsWithCurrManager
```

### Engineered features

Five additional features are calculated automatically:

```text
CompanyExperienceRatio
PromotionFrequency
IncomePerYearExperience
SatisfactionScore
RoleTenureRatio
```

Therefore, the frontend collects **27 raw inputs**, while the trained model receives **32 predictors** after the backend calculates the five engineered features.

---

## Machine Learning Workflow

The modelling workflow is:

1. Load the feature-engineered and selected CSV dataset.
2. Separate predictors and the `Attrition` target.
3. Perform an 80/20 stratified train-test split.
4. Standardize numerical features using `StandardScaler`.
5. One-hot encode categorical features using `OneHotEncoder`.
6. Train and compare four classification models:
   - Logistic Regression
   - Random Forest
   - Support Vector Machine (SVM)
   - Gradient Boosting
7. Evaluate the models using:
   - Accuracy
   - Precision
   - Recall
   - F1 Score
   - ROC-AUC
   - PR-AUC
8. Select the final model using **F1 Score as the primary criterion**, with Recall and ROC-AUC used as supporting/tie-breaking metrics.
9. Save the fitted preprocessing pipeline and selected classifier.
10. Save model metrics and dataset statistics for the web application.

The train-test split uses:

```text
test_size = 0.20
random_state = 42
stratify = y
```

---

## Model Comparison

The evaluated models produced the following results on the held-out test set:

| Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Logistic Regression | 0.7721 | 0.3864 | 0.7234 | 0.5037 | 0.8188 | 0.5535 |
| SVM | **0.8197** | 0.4516 | 0.5957 | **0.5138** | 0.8105 | 0.5368 |
| Gradient Boosting | 0.7959 | 0.3818 | 0.4468 | 0.4118 | 0.7774 | 0.4670 |
| Random Forest | 0.8435 | **0.5556** | 0.1064 | 0.1786 | 0.8082 | 0.4409 |

### Selected model

**Support Vector Machine (SVM)** is selected because it provides the highest F1 Score among the evaluated models:

```text
F1 Score: 0.5138
Recall:    0.5957
Precision: 0.4516
Accuracy:  0.8197
ROC-AUC:   0.8105
PR-AUC:    0.5368
```

Random Forest has the highest accuracy, but its Recall for the attrition class is very low. Logistic Regression has the highest Recall and ROC-AUC, while SVM gives the best balance between Precision and Recall as reflected by the highest F1 Score.

---

## Project Structure

```text
Employee-Attrition-Prediction-main/
│
├── backend/
│   ├── data/
│   │   └── employee_attrition_selected.csv
│   │
│   ├── models/
│   │   ├── attrition_model.pkl
│   │   ├── metrics.json
│   │   └── dataset_stats.json
│   │
│   ├── notebooks/
│   │   ├── 01_EDA.ipynb
│   │   ├── 02_Feature_Engineering.ipynb
│   │   ├── 03_Feature_Selection.ipynb
│   │   ├── 04_Model_Training.ipynb
│   │   └── 05_Model_Evaluation.ipynb
│   │
│   ├── main.py
│   ├── train_model.py
│   └── requirements.txt
│
├── artifacts/
│   ├── employee-attrition/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── dashboard.tsx
│   │       │   ├── predict.tsx
│   │       │   └── insights.tsx
│   │       └── App.tsx
│   │
│   └── api-server/
│       └── src/
│
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   └── api-zod/
│
└── README.md
```

---

## Role of the Main Files

### `train_model.py`

This is the repeatable training script used to create the model artifacts required by the application.

It:

- loads the selected dataset,
- trains the candidate models,
- evaluates them,
- selects the best model,
- saves `attrition_model.pkl`,
- saves `metrics.json`,
- saves `dataset_stats.json`.

The Jupyter notebooks are useful for academic experimentation, visualization, and documentation, while `train_model.py` provides a repeatable way to regenerate the deployment artifacts.

### `main.py`

This is the FastAPI backend.

It:

- exposes the REST API,
- loads the trained model,
- calculates the five engineered features for a submitted employee profile,
- performs prediction,
- calculates the attrition probability,
- assigns a Low / Medium / High risk level,
- serves dashboard and model metrics data.

### `attrition_model.pkl`

Contains the fitted preprocessing pipeline and selected classifier.

The backend loads this artifact to make predictions.

### `metrics.json`

Contains the selected model's evaluation metrics, confusion matrix, model comparison, feature importance, and training information.

### `dataset_stats.json`

Contains the dataset statistics required by the Dataset Overview dashboard, including:

```text
total_employees
employees_left
employees_stayed
attrition_rate
target_distribution
by_department
by_job_role
by_overtime
income_by_attrition
```

---

## Application Architecture

```text
                    React + Vite Frontend
                              │
                              │ /api requests
                              ▼
                       Vite API Proxy
                              │
                              ▼
                    FastAPI Backend :8000
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
       Dataset Statistics   Model Metrics   Prediction
              │               │                │
              │               │                ▼
              │               │       Feature Engineering
              │               │                │
              │               │                ▼
              │               │        attrition_model.pkl
              │               │                │
              └───────────────┴────────────────┘
                              │
                              ▼
                       JSON API Response
                              │
                              ▼
                    React Dashboard / UI
```

---

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Backend health check |
| GET | `/api/healthz` | API health check |
| GET | `/dashboard` | Dataset statistics |
| GET | `/api/dashboard` | Dataset statistics |
| GET | `/model-metrics` | Model performance information |
| GET | `/api/model-metrics` | Model performance information |
| POST | `/predict` | Employee attrition prediction |
| POST | `/api/predict` | Employee attrition prediction |

The React application uses the `/api/...` routes through the Vite development proxy.

---

## Run Locally

### 1. Create and activate a Python environment

From the project root:

```bash
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Generate the model artifacts

Run the training script:

```bash
python backend/train_model.py
```

This creates/updates:

```text
backend/models/attrition_model.pkl
backend/models/metrics.json
backend/models/dataset_stats.json
```

### 4. Start FastAPI

From the project root:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### 5. Start the React frontend

Open a second terminal:

```bash
cd artifacts/employee-attrition
npm install
npm run dev
```

Vite normally starts at:

```text
http://localhost:5173
```

The Vite configuration proxies `/api` requests to the FastAPI server on port `8000`.

---

## Using the Application

### Dataset Overview

The dashboard provides:

- total employees,
- employees who stayed,
- employees who left,
- overall attrition rate,
- target distribution,
- department-wise attrition,
- job-role-wise attrition,
- overtime-wise attrition,
- income-wise attrition.

### Predict Attrition Risk

Enter the employee's 27 original attributes.

The backend automatically calculates:

```text
CompanyExperienceRatio
PromotionFrequency
IncomePerYearExperience
SatisfactionScore
RoleTenureRatio
```

The trained model then returns:

```json
{
  "prediction": "Yes",
  "attrition_probability": 0.72,
  "risk_level": "High",
  "model_used": "Support Vector Machine (SVM)"
}
```

### Model Insights

The Model Insights page displays:

- selected model,
- Accuracy,
- Precision,
- Recall,
- F1 Score,
- confusion matrix,
- model comparison,
- feature importance.

---

## Jupyter Notebook Workflow

The notebooks document the machine learning process:

```text
01_EDA
   ↓
02_Feature_Engineering
   ↓
03_Feature_Selection
   ↓
04_Model_Training
   ↓
05_Model_Evaluation
```

The training notebook works with the feature-engineered selected dataset containing 32 predictors. The feature-engineering stage creates the five engineered variables used by the final model.

---

## Feature Engineering

The project creates five derived features:

### 1. Company Experience Ratio

```text
YearsAtCompany / TotalWorkingYears
```

Measures the proportion of an employee's total working experience spent at the current company.

### 2. Promotion Frequency

```text
YearsSinceLastPromotion / YearsAtCompany
```

Provides a relative measure of promotion timing.

### 3. Income Per Year Experience

```text
MonthlyIncome / TotalWorkingYears
```

Relates monthly income to total working experience.

### 4. Satisfaction Score

```text
(JobSatisfaction
 + EnvironmentSatisfaction
 + RelationshipSatisfaction
 + WorkLifeBalance) / 4
```

Combines four satisfaction/work-life variables into one score.

### 5. Role Tenure Ratio

```text
YearsInCurrentRole / YearsAtCompany
```

Measures the proportion of company tenure spent in the current role.

Division-by-zero cases are handled safely.

---

## Model Evaluation

The test set contains **294 employees** after the 80/20 split.

For the selected SVM model, the confusion matrix is:

```text
[[213, 34],
 [ 19, 28]]
```

with rows representing actual classes and columns representing predicted classes:

```text
              Predicted
              No    Yes

Actual No     213    34
Actual Yes     19    28
```

The minority `Attrition = Yes` class is particularly important because missing an employee who may leave is more informative than simply maximizing overall accuracy.

---

## Generated Artifacts

After training, the following files are generated:

```text
backend/models/
├── attrition_model.pkl
├── metrics.json
└── dataset_stats.json
```

These artifacts connect the machine learning workflow with the web application.

---

## Troubleshooting

### Dataset Overview shows a `length` error

Regenerate `dataset_stats.json` using the corrected model-training notebook/script so that the dashboard receives the expected grouped arrays:

```text
target_distribution
by_department
by_job_role
by_overtime
income_by_attrition
```

Then restart FastAPI and refresh the frontend.

### Backend is not responding

Make sure FastAPI is running:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Then open:

```text
http://localhost:8000/health
```

### Frontend cannot connect to the backend

Make sure:

1. FastAPI is running on port `8000`.
2. React/Vite is running on port `5173`.
3. The Vite proxy is configured to forward `/api` to:

```text
http://127.0.0.1:8000
```

### Model loading error

Regenerate the model artifact using the same Python/scikit-learn environment used by the project:

```bash
python backend/train_model.py
```

This avoids incompatibilities between an old serialized scikit-learn model and a different scikit-learn version.

---

## Future Improvements

Possible extensions include:

- threshold tuning for the attrition class,
- cross-validation,
- hyperparameter optimization,
- SHAP/LIME based explainability,
- model versioning,
- database integration,
- authentication and role-based access,
- cloud deployment,
- automated model retraining,
- monitoring model performance after deployment.

---

## Conclusion

This project demonstrates an end-to-end machine learning workflow:

```text
Dataset
   ↓
EDA
   ↓
Feature Engineering
   ↓
Feature Selection
   ↓
Model Training
   ↓
Model Evaluation
   ↓
Model Artifact
   ↓
FastAPI Backend
   ↓
React/Vite Frontend
   ↓
Employee Attrition Prediction
```

The project combines the academic ML workflow with a functional web application so that the trained model can be used through an interactive HR analytics interface.
