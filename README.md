# Employee Attrition Prediction System

An end-to-end machine-learning project that estimates employee attrition
risk from employee-related information. It includes data preparation,
feature engineering, model comparison, a FastAPI API, and a frontend for
individual and bulk predictions.

> **Status:** In progress. Final model metrics and end-to-end
> integration should be verified before treating this as
> production-ready.

## Features

-   Predict employee attrition risk.
-   Individual predictions through the web interface.
-   Bulk predictions from CSV files.
-   Input and CSV validation before prediction.
-   Engineered features based on employee and job-related attributes.
-   Comparison of multiple classification models.
-   FastAPI endpoints for prediction and dashboard/model metrics.
-   Saved model and JSON/CSV artifacts for backend use.

## Technology Stack

-   Python, pandas, NumPy, scikit-learn, joblib
-   FastAPI and Pydantic
-   React, TypeScript, and Vite
-   CSV, JSON, and joblib/pickle artifacts

Check the repository dependency files for exact package versions.

## Project Structure

The project has used the following key files and folders. Exact names
may differ in your current checkout.

``` text
Employee-Attrition-Prediction/
├── backend/
│   ├── data/
│   │   └── employee_attrition_selected.csv
│   ├── models/
│   │   ├── attrition_model.pkl
│   │   ├── metrics.json
│   │   ├── model_comparison.csv
│   │   └── dataset_stats.json
│   ├── notebooks/
│   │   ├── 02_Feature_Engineering.ipynb
│   │   ├── 03_Feature_Selection.ipynb
│   │   └── 04_Model_Training_Final_Fixed.ipynb
│   └── main.py
└── artifacts/
    └── employee-attrition/
        └── src/
            ├── pages/
            ├── components/
            └── lib/
```

Keep notebook names, dataset paths, and artifact paths consistent with
the files actually present in your checkout.

## How It Works

1.  Prepare the employee attrition dataset.
2.  Engineer additional features from existing employee attributes.
3.  Analyze feature relevance and evaluate candidate feature sets
    without using held-out test data for selection.
4.  Train and compare classification models using stratified
    cross-validation.
5.  Select a model using the chosen cross-validation metric. The current
    workflow was updated to select by F1 score.
6.  Save the fitted model, evaluation metrics, comparison table, and
    dashboard statistics.
7.  Use FastAPI to validate input and return predictions.
8.  Use the frontend for individual employee entry or bulk CSV
    predictions.

## Models

The workflow has been set up to compare seven classifiers:

-   Logistic Regression
-   Random Forest
-   Support Vector Machine (SVM)
-   Gradient Boosting
-   Decision Tree
-   K-Nearest Neighbors (KNN)
-   Gaussian Naive Bayes

The selected model must be confirmed by running the latest training
notebook. Do not assume a particular model is best without checking the
latest cross-validation results.

## Setup and Run

Commands below are a general guide. Adjust paths to match your local
checkout.

### 1. Create a Python environment

**Windows PowerShell**

``` powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / WSL / macOS**

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install backend dependencies

If a backend requirements file exists:

``` bash
pip install -r backend/requirements.txt
```

If it does not exist, install the project's dependencies and pin
versions to match the environment used to train the model. In
particular, ensure the scikit-learn version is compatible with
`attrition_model.pkl`.

### 3. Start FastAPI

From the repository root, if `backend/main.py` exposes an application
named `app`:

``` bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Alternatively, from inside `backend/`:

``` bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API documentation: http://127.0.0.1:8000/docs

### 4. Start the frontend

Change into the frontend directory containing `package.json` (the
project has used `artifacts/employee-attrition`):

``` bash
cd artifacts/employee-attrition
npm install
npm run dev
```

Open the local URL printed by Vite. The Vite `/api` proxy should target
FastAPI on port `8000`; verify the Vite configuration if requests fail.

## Model Training and Artifacts

The training workflow is expected to generate or update:

-   `backend/models/attrition_model.pkl` --- fitted preprocessing and
    classifier pipeline
-   `backend/models/metrics.json` --- selected model and evaluation
    metrics
-   `backend/models/model_comparison.csv` --- model comparison table
-   `backend/models/dataset_stats.json` --- dashboard statistics

Run the data preparation, feature engineering, feature selection, and
model-training notebooks in order. Check each notebook's input/output
paths before execution.

After changing features or the selected model, rerun training and saving
cells. Verify that feature names, transformations, and the inference
schema match between training and backend prediction.

## Evaluation Metrics

-   **Accuracy:** proportion of all predictions that are correct.
-   **Precision:** proportion of predicted attrition cases that are
    actual attrition cases.
-   **Recall:** proportion of actual attrition cases identified.
-   **F1 score:** harmonic mean of precision and recall.

Because attrition data can be imbalanced, accuracy alone is not enough.
Use cross-validation for model selection and keep the test set untouched
until final evaluation. Use the latest generated metrics instead of
hard-coding older values in this README.

## Input Validation

The API and bulk-upload workflow are intended to validate incoming data.
Test that:

-   Required columns are present.
-   Numeric fields contain valid numbers and are within accepted ranges.
-   Categorical fields use supported values.
-   Missing values, empty files, and duplicate employee identifiers are
    handled clearly.
-   Invalid rows return understandable errors.

The current Pydantic models, backend validation, and frontend CSV
utilities are the source of truth for required columns and accepted
values.

## Troubleshooting

**Model loading fails:** The serialized model may have been created with
a different scikit-learn version. Use a compatible version or retrain
and save the model in the intended environment.

**Frontend requests fail:** Confirm FastAPI is running on port `8000`,
check the Vite `/api` proxy, and inspect browser and backend logs.

**CSV upload is rejected:** Check required columns, data types, accepted
categories, and missing values.

**Metrics do not match the latest run:** Rerun the training notebook
from a clean kernel and regenerate all artifacts. Confirm the backend
loads the new files.

## Before Final Submission

-   Test whether feature engineering and feature selection improve
    cross-validation performance.
-   Confirm dependency versions and setup commands against the current
    repository.
-   Test individual prediction, bulk CSV prediction, invalid inputs, and
    dashboard data.
-   Verify that the selected model and metrics come from the same final
    training run.
-   Do not describe the project as production-ready until these checks
    pass.

## License

Add a license if one has been selected.
