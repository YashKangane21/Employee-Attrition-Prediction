"""FastAPI application for the employee attrition prediction system."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "attrition_model.pkl"
METRICS_PATH = ROOT / "models" / "metrics.json"
DATASET_STATS_PATH = ROOT / "models" / "dataset_stats.json"

app = FastAPI(
    title="Employee Attrition Prediction API",
    description="Actual IBM HR dataset analytics and model-backed attrition predictions.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmployeeInput(BaseModel):
    Age: Annotated[int, Field(ge=18, le=75)]
    BusinessTravel: Literal["Non-Travel", "Travel_Rarely", "Travel_Frequently"]
    Department: Literal["Sales", "Research & Development", "Human Resources"]
    DistanceFromHome: Annotated[int, Field(ge=1, le=100)]
    Education: Annotated[int, Field(ge=1, le=5)]
    EducationField: Literal["Life Sciences", "Medical", "Marketing", "Technical Degree", "Human Resources", "Other"]
    EnvironmentSatisfaction: Annotated[int, Field(ge=1, le=4)]
    Gender: Literal["Female", "Male"]
    JobInvolvement: Annotated[int, Field(ge=1, le=4)]
    JobLevel: Annotated[int, Field(ge=1, le=5)]
    JobRole: Literal[
        "Sales Executive", "Research Scientist", "Laboratory Technician",
        "Manufacturing Director", "Healthcare Representative", "Manager",
        "Sales Representative", "Research Director", "Human Resources"
    ]
    JobSatisfaction: Annotated[int, Field(ge=1, le=4)]
    MaritalStatus: Literal["Single", "Married", "Divorced"]
    MonthlyIncome: Annotated[int, Field(ge=100, le=20000)]
    NumCompaniesWorked: Annotated[int, Field(ge=0, le=20)]
    OverTime: Literal["Yes", "No"]
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


@app.get("/health")
@app.get("/api/healthz")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/dashboard")
@app.get("/api/dashboard")
def dashboard() -> dict[str, object]:
    if not DATASET_STATS_PATH.exists():
        raise HTTPException(status_code=503, detail="Train the model before requesting dashboard data.")
    return json.loads(DATASET_STATS_PATH.read_text(encoding="utf-8"))


@app.get("/model-metrics")
@app.get("/api/model-metrics")
def model_metrics() -> dict[str, object]:
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=503, detail="Train the model before requesting metrics.")
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


@app.post("/predict")
@app.post("/api/predict")
@app.post("/predict")
@app.post("/api/predict")
def predict(employee: EmployeeInput) -> dict[str, object]:
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Train the model before requesting predictions."
        )

    # Load trained model
    model = joblib.load(MODEL_PATH)

    # Convert UI input into DataFrame
    row = pd.DataFrame([employee.model_dump()])

    # Feature Engineering
    row["CompanyExperienceRatio"] = np.where(
        row["TotalWorkingYears"] > 0,
        row["YearsAtCompany"] / row["TotalWorkingYears"],
        0
    )

    row["PromotionFrequency"] = np.where(
        row["YearsAtCompany"] > 0,
        row["YearsSinceLastPromotion"] / row["YearsAtCompany"],
        0
    )

    row["IncomePerYearExperience"] = np.where(
        row["TotalWorkingYears"] > 0,
        row["MonthlyIncome"] / row["TotalWorkingYears"],
        row["MonthlyIncome"]
    )

    row["SatisfactionScore"] = (
        row["JobSatisfaction"]
        + row["EnvironmentSatisfaction"]
        + row["RelationshipSatisfaction"]
        + row["WorkLifeBalance"]
    ) / 4

    row["RoleTenureRatio"] = np.where(
        row["YearsAtCompany"] > 0,
        row["YearsInCurrentRole"] / row["YearsAtCompany"],
        0
    )

    # Keep exactly the features expected by the trained model
    row = row[model.feature_names_in_]

    # Prediction
    prediction = int(model.predict(row)[0])

    # Attrition probability
    probability = float(model.predict_proba(row)[0][1])

    # Risk level
    if probability >= 0.60:
        risk_level = "High"
    elif probability >= 0.35:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "prediction": "Yes" if prediction == 1 else "No",
        "attrition_probability": round(probability, 4),
        "risk_level": risk_level,
        "model_used": "Logistic Regression",
    }