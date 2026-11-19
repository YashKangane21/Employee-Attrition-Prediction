"""Unit and integration tests for the Smart Employee Retention Recommendation System."""

import pytest
from fastapi.testclient import TestClient

try:
    from backend.main import app, score_model_inputs, load_trained_model, get_model_used
    from backend.recommendations import (
        check_probability_support,
        evaluate_applicable_rules,
        build_recommendations_and_simulations,
        simulate_selected_recommendations,
    )
except ModuleNotFoundError:
    from main import app, score_model_inputs, load_trained_model, get_model_used
    from recommendations import (
        check_probability_support,
        evaluate_applicable_rules,
        build_recommendations_and_simulations,
        simulate_selected_recommendations,
    )

client = TestClient(app)

SAMPLE_HEALTHY_EMPLOYEE = {
    "Age": 42,
    "BusinessTravel": "Travel_Rarely",
    "Department": "Research & Development",
    "DistanceFromHome": 2,
    "Education": 3,
    "EducationField": "Life Sciences",
    "EnvironmentSatisfaction": 4,
    "Gender": "Female",
    "JobInvolvement": 3,
    "JobLevel": 3,
    "JobRole": "Research Director",
    "JobSatisfaction": 4,
    "MaritalStatus": "Married",
    "MonthlyIncome": 11000,
    "NumCompaniesWorked": 1,
    "OverTime": "No",
    "PercentSalaryHike": 15,
    "PerformanceRating": 3,
    "RelationshipSatisfaction": 4,
    "StockOptionLevel": 1,
    "TotalWorkingYears": 18,
    "TrainingTimesLastYear": 3,
    "WorkLifeBalance": 4,
    "YearsAtCompany": 10,
    "YearsInCurrentRole": 7,
    "YearsSinceLastPromotion": 1,
    "YearsWithCurrManager": 7,
}

SAMPLE_AT_RISK_EMPLOYEE = {
    "Age": 26,
    "BusinessTravel": "Travel_Frequently",
    "Department": "Sales",
    "DistanceFromHome": 24,
    "Education": 2,
    "EducationField": "Marketing",
    "EnvironmentSatisfaction": 1,
    "Gender": "Male",
    "JobInvolvement": 1,
    "JobLevel": 1,
    "JobRole": "Sales Representative",
    "JobSatisfaction": 1,
    "MaritalStatus": "Single",
    "MonthlyIncome": 2200,
    "NumCompaniesWorked": 4,
    "OverTime": "Yes",
    "PercentSalaryHike": 11,
    "PerformanceRating": 3,
    "RelationshipSatisfaction": 1,
    "StockOptionLevel": 0,
    "TotalWorkingYears": 3,
    "TrainingTimesLastYear": 0,
    "WorkLifeBalance": 1,
    "YearsAtCompany": 2,
    "YearsInCurrentRole": 1,
    "YearsSinceLastPromotion": 5,
    "YearsWithCurrManager": 1,
}


def test_model_probability_support():
    model = load_trained_model()
    supports_prob, explanation = check_probability_support(model)
    assert supports_prob is True
    assert "Platt scaling" in explanation or "SVC" in explanation


def test_original_endpoints_remain_intact():
    # 1. Health
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

    # 2. Dashboard
    res = client.get("/dashboard")
    assert res.status_code == 200
    assert "total_employees" in res.json()

    # 3. Model metrics (check seven algorithms comparison)
    res = client.get("/model-metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["model_used"] == "SVM"
    assert len(metrics.get("comparison", [])) == 7

    # 4. Predict
    res = client.post("/predict", json=SAMPLE_HEALTHY_EMPLOYEE)
    assert res.status_code == 200
    pred = res.json()
    assert "prediction" in pred
    assert "attrition_probability" in pred
    assert "risk_level" in pred
    assert pred["prediction"] == "No"


def test_healthy_employee_recommendations():
    model = load_trained_model()
    model_used = get_model_used()
    response = build_recommendations_and_simulations(
        SAMPLE_HEALTHY_EMPLOYEE, score_model_inputs, model, model_used
    )
    assert response.current_prediction == "No"
    assert response.supports_probability is True
    # For a healthy employee, no urgent recommendations should trigger
    assert len(response.recommendations) == 0


def test_at_risk_employee_recommendations_and_simulations():
    model = load_trained_model()
    model_used = get_model_used()

    # Original copy to check data preservation
    original_copy = dict(SAMPLE_AT_RISK_EMPLOYEE)

    response = build_recommendations_and_simulations(
        SAMPLE_AT_RISK_EMPLOYEE, score_model_inputs, model, model_used
    )

    # 1. Check data was not mutated
    assert SAMPLE_AT_RISK_EMPLOYEE == original_copy

    # 2. Predictions & probabilities
    assert response.current_prediction in {"Yes", "No"}
    assert response.current_probability is not None
    assert 0.0 <= response.current_probability <= 1.0

    # 3. Applicable recommendations
    assert len(response.recommendations) > 0
    rec_ids = {r.id for r in response.recommendations}
    assert "rec_overtime" in rec_ids
    assert "rec_job_satisfaction" in rec_ids
    assert "rec_work_life_balance" in rec_ids
    assert "rec_promotion" in rec_ids

    # 4. Check each recommendation has simulated fields
    for r in response.recommendations:
        assert r.priority in {"High", "Medium", "Low"}
        assert len(r.priority_reason) > 0
        assert r.simulated_probability is not None
        assert r.risk_difference_percentage_points is not None

    # 5. Combined simulation
    comb = response.combined_simulation
    assert comb.simulated_probability is not None
    assert comb.risk_difference_percentage_points is not None
    # Combined simulation should show risk reduction
    assert comb.simulated_probability < response.current_probability


def test_simulate_selected_subset():
    model = load_trained_model()

    # Simulate only OverTime change
    res_ot = simulate_selected_recommendations(
        SAMPLE_AT_RISK_EMPLOYEE, ["rec_overtime"], score_model_inputs, model
    )
    assert res_ot.applied_recommendation_ids == ["rec_overtime"]
    assert res_ot.applied_changes == {"OverTime": "No"}
    assert res_ot.simulated_probability is not None

    # Simulate empty selection
    res_none = simulate_selected_recommendations(
        SAMPLE_AT_RISK_EMPLOYEE, [], score_model_inputs, model
    )
    assert res_none.applied_recommendation_ids == []
    assert res_none.risk_difference == 0.0


def test_api_recommendations_endpoints():
    # POST /api/recommendations
    res = client.post("/api/recommendations", json=SAMPLE_AT_RISK_EMPLOYEE)
    assert res.status_code == 200
    data = res.json()
    assert "recommendations" in data
    assert "combined_simulation" in data
    assert data["supports_probability"] is True

    # POST /api/recommendations/simulate
    res_sim = client.post(
        "/api/recommendations/simulate",
        json={
            "employee": SAMPLE_AT_RISK_EMPLOYEE,
            "selected_recommendation_ids": ["rec_overtime", "rec_work_life_balance"],
        },
    )
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert len(sim_data["applied_recommendation_ids"]) == 2
    assert "OverTime" in sim_data["applied_changes"]
    assert "WorkLifeBalance" in sim_data["applied_changes"]


def test_bulk_recommendations_endpoint():
    emp1 = dict(SAMPLE_AT_RISK_EMPLOYEE, EmployeeName="High Risk User", EmployeeID="EMP101")
    emp2 = dict(SAMPLE_HEALTHY_EMPLOYEE, EmployeeName="Retained User", EmployeeID="EMP102")

    payload = {"employees": [emp1, emp2]}
    res = client.post("/api/recommendations/bulk", json=payload)
    assert res.status_code == 200, f"Status {res.status_code}: {res.text}"

    data = res.json()
    assert "summary" in data
    assert "employees" in data
    assert data["summary"]["total_analyzed"] == 2
    assert data["summary"]["employees_with_recommendations"] == 1

    emps = data["employees"]
    assert len(emps) == 2
    # Check that each employee's recommendations use their own data
    at_risk_item = next(e for e in emps if e["EmployeeID"] == "EMP101")
    assert at_risk_item["current_prediction"] == "Yes"
    assert at_risk_item["recommendations_count"] > 0
    assert at_risk_item["simulated_probability"] < at_risk_item["current_probability"]

    healthy_item = next(e for e in emps if e["EmployeeID"] == "EMP102")
    assert healthy_item["current_prediction"] == "No"
    assert healthy_item["recommendations_count"] == 0

