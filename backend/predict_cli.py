"""Small JSON-in/JSON-out adapter used by the local preview API."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent

MODEL_PATH = ROOT / "models" / "attrition_model.pkl"
METRICS_PATH = ROOT / "models" / "metrics.json"


def main() -> None:
    # Get employee data from command-line argument
    payload = json.loads(sys.argv[1])

    # Load the trained model
    model = joblib.load(MODEL_PATH)

    # Convert employee data into a DataFrame
    row = pd.DataFrame([payload])

    # Make prediction
    prediction = str(model.predict(row)[0])

    # Get probability of attrition
    probabilities = model.predict_proba(row)[0]
    classes = list(model.classes_)

    probability = float(
        probabilities[classes.index("Yes")]
    )

    # Decide risk level
    if probability >= 0.60:
        risk_level = "High"
    elif probability >= 0.35:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Load information about the selected model
    metrics = json.loads(
        METRICS_PATH.read_text(encoding="utf-8")
    )

    # Return result as JSON
    print(
        json.dumps(
            {
                "prediction": prediction,
                "attrition_probability": round(probability, 4),
                "risk_level": risk_level,
                "model_used": metrics["model_used"],
            }
        )
    )


if __name__ == "__main__":
    main()