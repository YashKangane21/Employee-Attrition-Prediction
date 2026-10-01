"""FastAPI application for the employee attrition prediction system."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator


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


def _friendly_validation_message(exc: RequestValidationError) -> str:
    missing_columns: list[str] = []
    other_errors: list[str] = []

    for error in exc.errors():
        loc = [str(part) for part in error.get("loc", []) if part != "body"]
        field = loc[-1] if loc else "input"
        error_type = error.get("type", "")
        if error_type in {"missing", "value_error.missing"}:
            missing_columns.append(field)
            continue

        employee_index = None
        if "employees" in loc:
            try:
                employee_index = int(loc[loc.index("employees") + 1]) + 1
            except (ValueError, IndexError):
                employee_index = None

        prefix = f"Row {employee_index}: " if employee_index else ""
        other_errors.append(f"{prefix}{field} is invalid.")

    if missing_columns:
        unique_missing = list(dict.fromkeys(missing_columns))
        return "Missing required columns:\n" + "\n".join(
            f"* {name}" for name in unique_missing
        )

    if other_errors:
        unique_errors = list(dict.fromkeys(other_errors))
        return "Please correct the following issues:\n" + "\n".join(
            f"* {item}" for item in unique_errors[:12]
        )

    return "The submitted employee data is invalid. Please review the values and try again."


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: object,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": _friendly_validation_message(exc)},
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


class BulkEmployeeRecord(EmployeeInput):
    EmployeeName: Annotated[str, Field(min_length=1, max_length=200)]
    EmployeeID: Annotated[str, Field(min_length=1, max_length=100)]

    @field_validator("EmployeeName", "EmployeeID", mode="before")
    @classmethod
    def strip_identifier(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class BulkPredictRequest(BaseModel):
    employees: Annotated[
        list[BulkEmployeeRecord],
        Field(min_length=1, max_length=500),
    ]


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


ENGINEERED_FIELDS = [
    "CompanyExperienceRatio",
    "PromotionFrequency",
    "IncomePerYearExperience",
    "SatisfactionScore",
    "RoleTenureRatio",
]


def load_trained_model():
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Train the model before requesting predictions.",
        )

    try:
        return joblib.load(MODEL_PATH)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="The trained model could not be loaded. Please try again later.",
        ) from exc


def get_model_used() -> str:
    model_used = "Unknown Model"

    if METRICS_PATH.exists():
        try:
            metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
            model_used = metrics.get("model_used", "Unknown Model")
        except Exception:
            pass

    return model_used


def risk_from_probability(probability: float) -> str:
    if probability >= 0.60:
        return "High"
    if probability >= 0.35:
        return "Medium"
    return "Low"


def normalize_prediction_label(prediction: object) -> str:
    if isinstance(prediction, str):
        return "Yes" if prediction == "Yes" else "No"
    return "Yes" if int(prediction) == 1 else "No"


def yes_probability(model, probabilities: np.ndarray) -> float:
    classes = list(model.classes_)
    if "Yes" in classes:
        return float(probabilities[classes.index("Yes")])
    return float(probabilities[-1])


def score_model_inputs(records: list[dict[str, object]]) -> list[dict[str, object]]:
    """Score one or more employees with the existing pipeline.

    `records` must contain only the original model input features.
    EmployeeName and EmployeeID must never be included.
    """

    model = load_trained_model()
    model_used = get_model_used()
    frame = pd.DataFrame(records)
    frame = engineer_features(frame)

    if not hasattr(model, "feature_names_in_"):
        raise HTTPException(
            status_code=500,
            detail="The trained model does not contain feature metadata.",
        )

    expected_features = list(model.feature_names_in_)
    missing_features = [
        feature for feature in expected_features if feature not in frame.columns
    ]
    if missing_features:
        raise HTTPException(
            status_code=500,
            detail="The prediction pipeline is missing required model features.",
        )

    model_frame = frame[expected_features]

    try:
        predictions = model.predict(model_frame)
        probability_rows = model.predict_proba(model_frame)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Prediction could not be completed. Please review the employee data and try again.",
        ) from exc

    results: list[dict[str, object]] = []
    for index, record in enumerate(records):
        probability = round(yes_probability(model, probability_rows[index]), 4)
        prediction_label = normalize_prediction_label(predictions[index])
        engineered = {
            field: float(frame.iloc[index][field]) for field in ENGINEERED_FIELDS
        }
        results.append(
            {
                **record,
                **engineered,
                "prediction": prediction_label,
                "attrition_probability": probability,
                "risk_level": risk_from_probability(probability),
                "model_used": model_used,
            }
        )

    return results


# ============================================================
# PREDICTION
# ============================================================

@app.post("/predict")
@app.post("/api/predict")
def predict(employee: EmployeeInput) -> dict[str, object]:
    scored = score_model_inputs([employee.model_dump()])[0]
    return {
        "prediction": scored["prediction"],
        "attrition_probability": scored["attrition_probability"],
        "risk_level": scored["risk_level"],
        "model_used": scored["model_used"],
    }


@app.post("/predict-bulk")
@app.post("/api/predict-bulk")
def predict_bulk(payload: BulkPredictRequest) -> dict[str, object]:
    seen_ids: dict[str, int] = {}
    duplicates: list[str] = []
    for index, employee in enumerate(payload.employees):
        employee_id = employee.EmployeeID
        if employee_id in seen_ids:
            duplicates.append(employee_id)
        else:
            seen_ids[employee_id] = index

    if duplicates:
        unique_duplicates = list(dict.fromkeys(duplicates))
        raise HTTPException(
            status_code=400,
            detail=(
                "Duplicate employee IDs are not allowed: "
                + ", ".join(unique_duplicates)
            ),
        )

    model_records = [
        employee.model_dump(exclude={"EmployeeName", "EmployeeID"})
        for employee in payload.employees
    ]
    scored_rows = score_model_inputs(model_records)

    results = []
    for employee, scored in zip(payload.employees, scored_rows):
        results.append(
            {
                "EmployeeName": employee.EmployeeName,
                "EmployeeID": employee.EmployeeID,
                **scored,
            }
        )

    return {"results": results}