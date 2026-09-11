"""FastAPI application for the employee attrition prediction system."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent

MODEL_PATH = ROOT / "models" / "attrition_model.pkl"
METRICS_PATH = ROOT / "models" / "metrics.json"
DATASET_STATS_PATH = ROOT / "models" / "dataset_stats.json"


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Employee Attrition Prediction API",
    description=(
        "Employee attrition prediction using the trained machine "
        "learning pipeline."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# INPUT SCHEMA
# ============================================================

class EmployeeInput(BaseModel):
    Age: Annotated[int, Field(ge=18, le=75)]

    BusinessTravel: Literal[
        "Non-Travel",
        "Travel_Rarely",
        "Travel_Frequently",
    ]

    Department: Literal[
        "Sales",
        "Research & Development",
        "Human Resources",
    ]

    DistanceFromHome: Annotated[int, Field(ge=1, le=100)]

    Education: Annotated[int, Field(ge=1, le=5)]

    EducationField: Literal[
        "Life Sciences",
        "Medical",
        "Marketing",
        "Technical Degree",
        "Human Resources",
        "Other",
    ]

    EnvironmentSatisfaction: Annotated[int, Field(ge=1, le=4)]

    Gender: Literal[
        "Female",
        "Male",
    ]

    JobInvolvement: Annotated[int, Field(ge=1, le=4)]

    JobLevel: Annotated[int, Field(ge=1, le=5)]

    JobRole: Literal[
        "Sales Executive",
        "Research Scientist",
        "Laboratory Technician",
        "Manufacturing Director",
        "Healthcare Representative",
        "Manager",
        "Sales Representative",
        "Research Director",
        "Human Resources",
    ]

    JobSatisfaction: Annotated[int, Field(ge=1, le=4)]

    MaritalStatus: Literal[
        "Single",
        "Married",
        "Divorced",
    ]

    MonthlyIncome: Annotated[int, Field(ge=100, le=20000)]

    NumCompaniesWorked: Annotated[int, Field(ge=0, le=20)]

    OverTime: Literal[
        "Yes",
        "No",
    ]

    PercentSalaryHike: Annotated[int, Field(ge=10, le=30)]

    PerformanceRating: Annotated[int, Field(ge=1, le=5)]

    RelationshipSatisfaction: Annotated[int, Field(ge=1, le=4)]

    StockOptionLevel: Annotated[int, Field(ge=0, le=3)]

    TotalWorkingYears: Annotated[int, Field(ge=0, le=50)]

    TrainingTimesLastYear: Annotated[int, Field(ge=0, le=20)]

    WorkLifeBalance: Annotated[int, Field(ge=1, le=4)]

    YearsAtCompany: Annotated[int, Field(ge=0, le=50)]

    YearsInCurrentRole: Annotated[int, Field(ge=0, le=20)]

    YearsSinceLastPromotion: Annotated[int, Field(ge=0, le=20)]

    YearsWithCurrManager: Annotated[int, Field(ge=0, le=20)]


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
@app.get("/api/healthz")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/dashboard")
@app.get("/api/dashboard")
def dashboard() -> dict[str, object]:
    if not DATASET_STATS_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "Train the model before requesting dashboard data."
            ),
        )

    return json.loads(
        DATASET_STATS_PATH.read_text(
            encoding="utf-8"
        )
    )


# ============================================================
# MODEL METRICS
# ============================================================

@app.get("/model-metrics")
@app.get("/api/model-metrics")
def model_metrics() -> dict[str, object]:
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "Train the model before requesting metrics."
            ),
        )

    return json.loads(
        METRICS_PATH.read_text(
            encoding="utf-8"
        )
    )


# ============================================================
# FEATURE ENGINEERING
# ============================================================

def engineer_features(row: pd.DataFrame) -> pd.DataFrame:
    """
    Create the same engineered features used during model training.
    """

    # 1. Company experience ratio
    row["CompanyExperienceRatio"] = np.where(
        row["TotalWorkingYears"] > 0,
        row["YearsAtCompany"] / row["TotalWorkingYears"],
        0,
    )

    # 2. Promotion frequency
    row["PromotionFrequency"] = np.where(
        row["YearsAtCompany"] > 0,
        row["YearsSinceLastPromotion"] / row["YearsAtCompany"],
        0,
    )

    # 3. Income per year of experience
    row["IncomePerYearExperience"] = np.where(
        row["TotalWorkingYears"] > 0,
        row["MonthlyIncome"] / row["TotalWorkingYears"],
        row["MonthlyIncome"],
    )

    # 4. Overall satisfaction score
    row["SatisfactionScore"] = (
        row["JobSatisfaction"]
        + row["EnvironmentSatisfaction"]
        + row["RelationshipSatisfaction"]
        + row["WorkLifeBalance"]
    ) / 4

    # 5. Role tenure ratio
    row["RoleTenureRatio"] = np.where(
        row["YearsAtCompany"] > 0,
        row["YearsInCurrentRole"] / row["YearsAtCompany"],
        0,
    )

    return row


# ============================================================
# PREDICTION
# ============================================================

@app.post("/predict")
@app.post("/api/predict")
def predict(employee: EmployeeInput) -> dict[str, object]:

    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "Train the model before requesting predictions."
            ),
        )

    # --------------------------------------------------------
    # Load trained pipeline
    # --------------------------------------------------------

    try:
        model = joblib.load(MODEL_PATH)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load trained model: {exc}",
        ) from exc

    # --------------------------------------------------------
    # Convert request to DataFrame
    # --------------------------------------------------------

    row = pd.DataFrame(
        [employee.model_dump()]
    )

    # --------------------------------------------------------
    # Apply feature engineering
    # --------------------------------------------------------

    row = engineer_features(row)

    # --------------------------------------------------------
    # Make sure the input matches training features
    # --------------------------------------------------------

    if not hasattr(model, "feature_names_in_"):
        raise HTTPException(
            status_code=500,
            detail=(
                "The trained model does not contain feature metadata."
            ),
        )

    expected_features = list(
        model.feature_names_in_
    )

    missing_features = [
        feature
        for feature in expected_features
        if feature not in row.columns
    ]

    if missing_features:
        raise HTTPException(
            status_code=500,
            detail=(
                "Missing features required by the model: "
                + ", ".join(missing_features)
            ),
        )

    row = row[expected_features]

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    try:
        prediction = model.predict(row)[0]
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {exc}",
        ) from exc

    # --------------------------------------------------------
    # Prediction probability
    # --------------------------------------------------------

    try:
        probabilities = model.predict_proba(row)[0]

        classes = list(model.classes_)

        if "Yes" in classes:
            yes_index = classes.index("Yes")
            probability = float(
                probabilities[yes_index]
            )
        else:
            # Fallback in case the classifier uses numeric labels.
            probability = float(
                probabilities[-1]
            )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "The trained model does not provide "
                f"prediction probabilities: {exc}"
            ),
        ) from exc

    # --------------------------------------------------------
    # Normalize prediction
    # --------------------------------------------------------

    if isinstance(prediction, str):
        prediction_label = prediction
    else:
        prediction_label = (
            "Yes"
            if int(prediction) == 1
            else "No"
        )

    # --------------------------------------------------------
    # Risk level
    # --------------------------------------------------------

    if probability >= 0.60:
        risk_level = "High"
    elif probability >= 0.35:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # --------------------------------------------------------
    # Get actual model name
    # --------------------------------------------------------

    model_used = "Unknown Model"

    if METRICS_PATH.exists():
        try:
            metrics = json.loads(
                METRICS_PATH.read_text(
                    encoding="utf-8"
                )
            )

            model_used = metrics.get(
                "model_used",
                "Unknown Model",
            )

        except Exception:
            pass

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "prediction": (
            "Yes"
            if prediction_label == "Yes"
            else "No"
        ),
        "attrition_probability": round(
            probability,
            4,
        ),
        "risk_level": risk_level,
        "model_used": model_used,
    }