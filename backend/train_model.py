"""Train and evaluate the employee attrition model.

Run from the project root:
    python backend/train_model.py

The saved artifact contains the fitted preprocessing pipeline and the
automatically selected classifier.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent

DATA_PATH = ROOT / "data" / "employee_attrition.csv"

MODEL_DIR = ROOT / "models"

MODEL_PATH = MODEL_DIR / "attrition_model.pkl"

METRICS_PATH = MODEL_DIR / "metrics.json"

DATASET_STATS_PATH = MODEL_DIR / "dataset_stats.json"


# ============================================================
# DATASET SETTINGS
# ============================================================

TARGET = "Attrition"

REMOVED_COLUMNS = [
    "DailyRate",
    "EmployeeCount",
    "EmployeeNumber",
    "HourlyRate",
    "MonthlyRate",
    "Over18",
    "StandardHours",
]

FEATURES = [
    "Age",
    "BusinessTravel",
    "Department",
    "DistanceFromHome",
    "Education",
    "EducationField",
    "EnvironmentSatisfaction",
    "Gender",
    "JobInvolvement",
    "JobLevel",
    "JobRole",
    "JobSatisfaction",
    "MaritalStatus",
    "MonthlyIncome",
    "NumCompaniesWorked",
    "OverTime",
    "PercentSalaryHike",
    "PerformanceRating",
    "RelationshipSatisfaction",
    "StockOptionLevel",
    "TotalWorkingYears",
    "TrainingTimesLastYear",
    "WorkLifeBalance",
    "YearsAtCompany",
    "YearsInCurrentRole",
    "YearsSinceLastPromotion",
    "YearsWithCurrManager",
]

CATEGORICAL_FEATURES = [
    "BusinessTravel",
    "Department",
    "EducationField",
    "Gender",
    "JobRole",
    "MaritalStatus",
    "OverTime",
]

NUMERIC_FEATURES = [
    feature
    for feature in FEATURES
    if feature not in CATEGORICAL_FEATURES
]


# ============================================================
# PREPROCESSING
# ============================================================

def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "numeric",
                "passthrough",
                NUMERIC_FEATURES,
            ),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )


def make_pipeline(model: object) -> Pipeline:
    return Pipeline(
        steps=[
            ("preprocessor", make_preprocessor()),
            ("model", model),
        ]
    )


# ============================================================
# METRICS
# ============================================================

def metric_row(
    name: str,
    actual: pd.Series,
    predicted: object,
) -> dict:

    return {
        "model": name,

        "accuracy": round(
            float(accuracy_score(actual, predicted)),
            4,
        ),

        "precision": round(
            float(
                precision_score(
                    actual,
                    predicted,
                    pos_label="Yes",
                    zero_division=0,
                )
            ),
            4,
        ),

        "recall": round(
            float(
                recall_score(
                    actual,
                    predicted,
                    pos_label="Yes",
                    zero_division=0,
                )
            ),
            4,
        ),

        "f1_score": round(
            float(
                f1_score(
                    actual,
                    predicted,
                    pos_label="Yes",
                    zero_division=0,
                )
            ),
            4,
        ),
    }


# ============================================================
# DATASET STATISTICS
# ============================================================

def grouped_counts(
    frame: pd.DataFrame,
    column: str,
) -> list[dict]:

    grouped = (
        frame.groupby(
            [column, TARGET],
            dropna=False,
        )
        .size()
        .unstack(fill_value=0)
    )

    rows = []

    for label, values in grouped.iterrows():

        yes = int(values.get("Yes", 0))
        no = int(values.get("No", 0))

        total = yes + no

        rows.append(
            {
                "label": str(label),
                "yes": yes,
                "no": no,
                "total": total,
                "rate": round(
                    yes / total * 100,
                    1,
                )
                if total
                else 0,
            }
        )

    return rows


def build_dataset_stats(
    frame: pd.DataFrame,
) -> dict:

    total = len(frame)

    left = int(
        (frame[TARGET] == "Yes").sum()
    )

    stayed = int(
        (frame[TARGET] == "No").sum()
    )

    distribution = [
        {
            "label": "Stayed",
            "count": stayed,
            "percentage": round(
                stayed / total * 100,
                1,
            ),
        },
        {
            "label": "Left",
            "count": left,
            "percentage": round(
                left / total * 100,
                1,
            ),
        },
    ]

    income_bins = [
        0,
        3000,
        6000,
        9000,
        12000,
        float("inf"),
    ]

    income_labels = [
        "Under 3k",
        "3k–6k",
        "6k–9k",
        "9k–12k",
        "12k+",
    ]

    income_groups = (
        frame.assign(
            income_bucket=pd.cut(
                frame["MonthlyIncome"],
                bins=income_bins,
                labels=income_labels,
                right=False,
            )
        )
        .groupby(
            ["income_bucket", TARGET],
            observed=False,
        )
        .size()
        .unstack(fill_value=0)
    )

    income_by_attrition = [
        {
            "bucket": str(label),
            "yes": int(values.get("Yes", 0)),
            "no": int(values.get("No", 0)),
        }
        for label, values in income_groups.iterrows()
    ]

    return {
        "total_employees": total,
        "employees_left": left,
        "employees_stayed": stayed,

        "attrition_rate": round(
            left / total * 100,
            1,
        ),

        "target_distribution": distribution,

        "by_department": grouped_counts(
            frame,
            "Department",
        ),

        "by_job_role": grouped_counts(
            frame,
            "JobRole",
        ),

        "by_overtime": grouped_counts(
            frame,
            "OverTime",
        ),

        "income_by_attrition": income_by_attrition,
    }


# ============================================================
# TRAIN MODEL
# ============================================================

def train() -> None:

    print("\nLoading dataset...")

    frame = pd.read_csv(DATA_PATH)

    # Check data quality
    missing = (
        frame[FEATURES + [TARGET]]
        .isna()
        .sum()
        .sum()
    )

    duplicates = int(
        frame.duplicated().sum()
    )

    if missing:
        raise ValueError(
            f"Dataset contains {missing} missing values."
        )

    # Features and target
    X = frame[FEATURES].copy()

    y = frame[TARGET].copy()

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # ========================================================
    # RANDOM FOREST
    # ========================================================

    forest = make_pipeline(
        RandomForestClassifier(
            n_estimators=300,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1,
        )
    )

    # ========================================================
    # LOGISTIC REGRESSION
    # ========================================================

    logistic = make_pipeline(
        LogisticRegression(
            max_iter=5000,
            solver="liblinear",
            class_weight="balanced",
            random_state=42,
        )
    )

    print("Training Random Forest...")

    forest.fit(
        X_train,
        y_train,
    )

    print("Training Logistic Regression...")

    logistic.fit(
        X_train,
        y_train,
    )

    # Predictions
    forest_predictions = forest.predict(X_test)

    logistic_predictions = logistic.predict(X_test)

    # ========================================================
    # MODEL COMPARISON
    # ========================================================

    comparison = [
        metric_row(
            "Random Forest",
            y_test,
            forest_predictions,
        ),

        metric_row(
            "Logistic Regression",
            y_test,
            logistic_predictions,
        ),
    ]

    # Select model with highest F1 Score
    selected = max(
        comparison,
        key=lambda x: x["f1_score"],
    )

    # ========================================================
    # SELECT ACTUAL WINNING MODEL
    # ========================================================

    if selected["model"] == "Random Forest":

        selected_model = forest

        selected_predictions = forest_predictions

        model_name = "Random Forest Classifier"

    else:

        selected_model = logistic

        selected_predictions = logistic_predictions

        model_name = "Logistic Regression"

    print(f"\nSelected Model: {model_name}")

    # ========================================================
    # FEATURE IMPORTANCE
    # ========================================================

    preprocessor = selected_model.named_steps["preprocessor"]

    classifier = selected_model.named_steps["model"]

    transformed_names = (
        preprocessor.get_feature_names_out()
    )

    # Random Forest
    if hasattr(
        classifier,
        "feature_importances_",
    ):

        importances = classifier.feature_importances_

    # Logistic Regression
    else:

        importances = abs(
            classifier.coef_[0]
        )

    ranked = sorted(
        [
            {
                "feature": (
                    name
                    .replace("numeric__", "")
                    .replace("categorical__", "")
                ),

                "importance": round(
                    float(value),
                    5,
                ),
            }

            for name, value in zip(
                transformed_names,
                importances,
            )
        ],

        key=lambda item: item["importance"],

        reverse=True,
    )

    # ========================================================
    # SAVE METRICS
    # ========================================================

    metrics = {

        # Actual selected model
        "model_used": model_name,

        # Selected model metrics
        "accuracy": selected["accuracy"],

        "precision": selected["precision"],

        "recall": selected["recall"],

        "f1_score": selected["f1_score"],

        # Confusion matrix of selected model
        "confusion_matrix": confusion_matrix(
            y_test,
            selected_predictions,
            labels=["No", "Yes"],
        ).tolist(),

        # Both models comparison
        "comparison": comparison,

        # Feature importance
        "feature_importance": ranked[:12],

        "trained_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "dataset_quality": {
            "missing_values": int(missing),
            "duplicate_rows": duplicates,
        },

        "feature_count": len(FEATURES),

        "removed_columns": REMOVED_COLUMNS,
    }

    # ========================================================
    # SAVE FILES
    # ========================================================

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # IMPORTANT:
    # Save the actual winning model
    joblib.dump(
        selected_model,
        MODEL_PATH,
    )

    # Save metrics
    METRICS_PATH.write_text(
        json.dumps(
            metrics,
            indent=2,
        ),
        encoding="utf-8",
    )

    # Save dataset statistics
    DATASET_STATS_PATH.write_text(
        json.dumps(
            build_dataset_stats(frame),
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\nTraining completed successfully!")

    print(
        f"Model saved to: {MODEL_PATH}"
    )

    print(
        f"Selected model: {model_name}"
    )

    print(
        f"F1 Score: {selected['f1_score']}"
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    train()