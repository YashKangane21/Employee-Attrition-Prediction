"""Smart Employee Retention Recommendation and What-If Risk Analysis Module.

Provides explainable HR retention recommendations, individual what-if simulations,
and combined scenario simulations using the trained scikit-learn ML pipeline.
All simulations run through the actual trained model without hardcoded values.
"""

from __future__ import annotations

from typing import Any, Callable, Literal
from pydantic import BaseModel, Field


# ============================================================
# SCHEMAS
# ============================================================

class RecommendationItem(BaseModel):
    id: str
    title: str
    category: str
    current_condition: str
    suggested_action: str
    suggested_change: str
    modified_fields: dict[str, Any]
    priority: Literal["High", "Medium", "Low"]
    priority_reason: str
    simulated_prediction: str
    simulated_probability: float | None = None
    simulated_risk_level: str
    risk_difference: float | None = None
    risk_difference_percentage_points: float | None = None


class SimulationSummary(BaseModel):
    applied_recommendation_ids: list[str]
    applied_changes: dict[str, Any]
    simulated_prediction: str
    simulated_probability: float | None = None
    simulated_risk_level: str
    risk_difference: float | None = None
    risk_difference_percentage_points: float | None = None


class RetentionRecommendationsResponse(BaseModel):
    current_prediction: str
    current_probability: float | None = None
    current_risk_level: str
    model_used: str
    supports_probability: bool
    probability_notes: str
    recommendations: list[RecommendationItem]
    combined_simulation: SimulationSummary
    disclaimer: str


class SimulateCombinedRequest(BaseModel):
    employee: dict[str, Any]
    selected_recommendation_ids: list[str] = Field(default_factory=list)


class BulkEmployeeRetentionItem(BaseModel):
    EmployeeID: str
    EmployeeName: str
    Department: str
    JobRole: str
    current_prediction: str
    current_probability: float | None = None
    current_risk_level: str
    recommendations_count: int
    top_recommendations: list[str]
    recommendations: list[RecommendationItem]
    combined_simulation: SimulationSummary
    simulated_probability: float | None = None
    risk_difference_percentage_points: float | None = None
    employee_inputs: dict[str, Any]


class BulkRetentionSummary(BaseModel):
    total_analyzed: int
    employees_with_recommendations: int
    high_risk_count: int
    average_risk_reduction_percentage_points: float | None = None


class BulkRetentionRecommendationsResponse(BaseModel):
    summary: BulkRetentionSummary
    employees: list[BulkEmployeeRetentionItem]
    supports_probability: bool
    probability_notes: str
    disclaimer: str



# ============================================================
# PROBABILITY SUPPORT CHECK
# ============================================================

def check_probability_support(model: Any) -> tuple[bool, str]:
    """Check whether the model supports reliable probability predictions."""
    if not hasattr(model, "predict_proba"):
        return (
            False,
            "The trained model does not implement predict_proba. Predictions are categorical only.",
        )

    classifier = model
    if hasattr(model, "named_steps") and "model" in model.named_steps:
        classifier = model.named_steps["model"]

    if classifier.__class__.__name__ == "SVC":
        if getattr(classifier, "probability", False):
            return (
                True,
                "Calibrated probability predictions are supported using Platt scaling (SVC probability=True).",
            )
        return (
            False,
            "The SVM model was fitted with probability=False; reliable calibrated probabilities are not available.",
        )

    return (
        True,
        f"Calibrated probabilities supported by {classifier.__class__.__name__}.",
    )


# ============================================================
# RECOMMENDATION RULES DEFINITION
# ============================================================

class RetentionRule:
    def __init__(
        self,
        rule_id: str,
        title: str,
        category: str,
        check_fn: Callable[[dict[str, Any]], bool],
        current_fn: Callable[[dict[str, Any]], str],
        action: str,
        change_fn: Callable[[dict[str, Any]], str],
        mods_fn: Callable[[dict[str, Any]], dict[str, Any]],
        base_priority_fn: Callable[[dict[str, Any]], Literal["High", "Medium", "Low"]],
        priority_reason_fn: Callable[[dict[str, Any]], str],
    ):
        self.rule_id = rule_id
        self.title = title
        self.category = category
        self.check_fn = check_fn
        self.current_fn = current_fn
        self.action = action
        self.change_fn = change_fn
        self.mods_fn = mods_fn
        self.base_priority_fn = base_priority_fn
        self.priority_reason_fn = priority_reason_fn


RULES: list[RetentionRule] = [
    # 1. Overtime
    RetentionRule(
        rule_id="rec_overtime",
        title="Reduce Excessive Overtime",
        category="Workload & Schedule",
        check_fn=lambda e: str(e.get("OverTime", "")).strip().lower() == "yes",
        current_fn=lambda e: "Currently assigned to regular overtime (OverTime: Yes)",
        action="Reduce excessive overtime, rebalance project workload, and establish manageable delivery deadlines.",
        change_fn=lambda e: "OverTime: Yes → No",
        mods_fn=lambda e: {"OverTime": "No"},
        base_priority_fn=lambda e: "High",
        priority_reason_fn=lambda e: "Overtime is the highest-weighted feature contributing to attrition risk in the trained model.",
    ),
    # 2. Job Satisfaction
    RetentionRule(
        rule_id="rec_job_satisfaction",
        title="Improve Job Satisfaction",
        category="Engagement & Fulfillment",
        check_fn=lambda e: int(e.get("JobSatisfaction", 4)) <= 2,
        current_fn=lambda e: f"Low job satisfaction reported (Rating: {e.get('JobSatisfaction')}/4)",
        action="Conduct 1-on-1 employee feedback sessions, address workplace pain points, and align responsibilities with career interests.",
        change_fn=lambda e: f"JobSatisfaction: {e.get('JobSatisfaction')} → 3 (Satisfied)",
        mods_fn=lambda e: {"JobSatisfaction": 3},
        base_priority_fn=lambda e: "High" if int(e.get("JobSatisfaction", 4)) == 1 else "Medium",
        priority_reason_fn=lambda e: "Low job satisfaction directly undermines daily engagement and organizational commitment.",
    ),
    # 3. Work-Life Balance
    RetentionRule(
        rule_id="rec_work_life_balance",
        title="Enhance Work-Life Balance",
        category="Work-Life Balance",
        check_fn=lambda e: int(e.get("WorkLifeBalance", 4)) <= 2,
        current_fn=lambda e: f"Poor work-life balance reported (Rating: {e.get('WorkLifeBalance')}/4)",
        action="Discuss flexible working arrangements, remote/hybrid schedules, and enforce healthy work-life boundaries.",
        change_fn=lambda e: f"WorkLifeBalance: {e.get('WorkLifeBalance')} → 3 (Good Balance)",
        mods_fn=lambda e: {"WorkLifeBalance": 3},
        base_priority_fn=lambda e: "High" if int(e.get("WorkLifeBalance", 4)) == 1 else "Medium",
        priority_reason_fn=lambda e: "Poor work-life balance leads to chronic fatigue and elevated resignation likelihood.",
    ),
    # 4. Promotion & Career Growth
    RetentionRule(
        rule_id="rec_promotion",
        title="Review Promotion & Growth Opportunities",
        category="Career & Progression",
        check_fn=lambda e: int(e.get("YearsSinceLastPromotion", 0)) >= 4,
        current_fn=lambda e: f"{e.get('YearsSinceLastPromotion')} years elapsed since the last promotion",
        action="Review promotion roadmap, outline clear milestone criteria, and evaluate advancement or leadership opportunities.",
        change_fn=lambda e: f"YearsSinceLastPromotion: {e.get('YearsSinceLastPromotion')} → 0 (Promotion/Reset)",
        mods_fn=lambda e: {"YearsSinceLastPromotion": 0},
        base_priority_fn=lambda e: "High" if int(e.get("YearsSinceLastPromotion", 0)) >= 7 else "Medium",
        priority_reason_fn=lambda e: "Tenure stagnation without advancement significantly increases external job search activity.",
    ),
    # 5. Environment Satisfaction
    RetentionRule(
        rule_id="rec_environment_satisfaction",
        title="Improve Workplace Environment",
        category="Workplace Conditions",
        check_fn=lambda e: int(e.get("EnvironmentSatisfaction", 4)) <= 2,
        current_fn=lambda e: f"Low workplace environment satisfaction (Rating: {e.get('EnvironmentSatisfaction')}/4)",
        action="Improve physical and digital workspace conditions, foster team collaboration, and resolve workplace friction.",
        change_fn=lambda e: f"EnvironmentSatisfaction: {e.get('EnvironmentSatisfaction')} → 3 (Satisfied)",
        mods_fn=lambda e: {"EnvironmentSatisfaction": 3},
        base_priority_fn=lambda e: "Medium" if int(e.get("EnvironmentSatisfaction", 4)) == 1 else "Low",
        priority_reason_fn=lambda e: "Suboptimal work environment degrades day-to-day employee comfort and productivity.",
    ),
    # 6. Job Involvement
    RetentionRule(
        rule_id="rec_job_involvement",
        title="Increase Job Involvement & Engagement",
        category="Engagement & Fulfillment",
        check_fn=lambda e: int(e.get("JobInvolvement", 4)) <= 2,
        current_fn=lambda e: f"Low job involvement reported (Rating: {e.get('JobInvolvement')}/4)",
        action="Discuss employee engagement, delegate ownership of high-impact initiatives, and ensure role suitability.",
        change_fn=lambda e: f"JobInvolvement: {e.get('JobInvolvement')} → 3 (High Involvement)",
        mods_fn=lambda e: {"JobInvolvement": 3},
        base_priority_fn=lambda e: "Medium" if int(e.get("JobInvolvement", 4)) == 1 else "Low",
        priority_reason_fn=lambda e: "Low role involvement indicates detachment from team goals and reduced organizational loyalty.",
    ),
    # 7. Business Travel Frequency
    RetentionRule(
        rule_id="rec_business_travel",
        title="Moderate Business Travel Frequency",
        category="Workload & Schedule",
        check_fn=lambda e: str(e.get("BusinessTravel", "")).strip() == "Travel_Frequently",
        current_fn=lambda e: "Requires frequent business travel (BusinessTravel: Travel_Frequently)",
        action="Evaluate necessity of frequent travel, substitute with remote conferencing, and rotate travel assignments.",
        change_fn=lambda e: "BusinessTravel: Travel_Frequently → Travel_Rarely",
        mods_fn=lambda e: {"BusinessTravel": "Travel_Rarely"},
        base_priority_fn=lambda e: "Medium",
        priority_reason_fn=lambda e: "Business travel frequency is among the top 5 model features influencing attrition risk.",
    ),
    # 8. Training & Professional Upskilling
    RetentionRule(
        rule_id="rec_training",
        title="Provide Upskilling & Professional Training",
        category="Career & Progression",
        check_fn=lambda e: int(e.get("TrainingTimesLastYear", 0)) <= 1,
        current_fn=lambda e: f"Only {e.get('TrainingTimesLastYear')} training opportunity completed in the past year",
        action="Enroll employee in specialized skills development, technical workshops, and sponsored certification programs.",
        change_fn=lambda e: f"TrainingTimesLastYear: {e.get('TrainingTimesLastYear')} → 3 sessions",
        mods_fn=lambda e: {"TrainingTimesLastYear": 3},
        base_priority_fn=lambda e: "Low",
        priority_reason_fn=lambda e: "Continuous learning programs foster professional growth and long-term retention.",
    ),
    # 9. Relationship Satisfaction
    RetentionRule(
        rule_id="rec_relationship_satisfaction",
        title="Foster Managerial & Peer Relationships",
        category="Workplace Conditions",
        check_fn=lambda e: int(e.get("RelationshipSatisfaction", 4)) <= 2,
        current_fn=lambda e: f"Low relationship satisfaction reported (Rating: {e.get('RelationshipSatisfaction')}/4)",
        action="Facilitate peer mentoring, encourage cross-team collaboration, and conduct constructive feedback check-ins.",
        change_fn=lambda e: f"RelationshipSatisfaction: {e.get('RelationshipSatisfaction')} → 3 (Satisfied)",
        mods_fn=lambda e: {"RelationshipSatisfaction": 3},
        base_priority_fn=lambda e: "Low",
        priority_reason_fn=lambda e: "Healthy workplace relationships provide psychological safety and positive team dynamics.",
    ),
    # 10. Stock Option Incentives
    RetentionRule(
        rule_id="rec_stock_option",
        title="Review Equity & Stock Option Incentives",
        category="Compensation & Retention",
        check_fn=lambda e: int(e.get("StockOptionLevel", 0)) == 0,
        current_fn=lambda e: "No stock options allocated (StockOptionLevel: 0)",
        action="Assess eligibility for long-term equity participation or retention-linked stock grant programs.",
        change_fn=lambda e: "StockOptionLevel: 0 → 1 (Tier-1 Equity Participation)",
        mods_fn=lambda e: {"StockOptionLevel": 1},
        base_priority_fn=lambda e: "Low",
        priority_reason_fn=lambda e: "Stock options align long-term employee incentives with organizational performance.",
    ),
]

RULE_MAP: dict[str, RetentionRule] = {rule.rule_id: rule for rule in RULES}

DISCLAIMER_TEXT = (
    "Recommendations and simulated risk changes are generated using the existing trained "
    "machine-learning pipeline for HR decision-support exploration. These are model-based "
    "simulations and do not guarantee a real-world reduction in employee turnover or represent "
    "proven causal effects. The system does not make automated employment decisions."
)


# ============================================================
# RECOMMENDATION & SIMULATION ENGINE
# ============================================================

def evaluate_applicable_rules(employee_dict: dict[str, Any]) -> list[RetentionRule]:
    """Return only the rules applicable to the given employee profile."""
    applicable: list[RetentionRule] = []
    for rule in RULES:
        try:
            if rule.check_fn(employee_dict):
                applicable.append(rule)
        except Exception:
            # Safely skip rules if values cannot be parsed
            continue
    return applicable


def build_recommendations_and_simulations(
    employee_dict: dict[str, Any],
    score_fn: Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
    model: Any,
    model_used: str,
) -> RetentionRecommendationsResponse:
    """Generate explainable retention recommendations and simulated what-if impacts.

    All simulations use the actual trained model pipeline passed via `score_fn`.
    """
    supports_prob, prob_notes = check_probability_support(model)

    # 1. Score the original employee record
    base_scores = score_fn([employee_dict])
    base_score = base_scores[0]

    current_prediction = str(base_score.get("prediction", "No"))
    current_risk_level = str(base_score.get("risk_level", "Low"))
    current_probability = (
        float(base_score["attrition_probability"])
        if supports_prob and "attrition_probability" in base_score
        else None
    )

    applicable_rules = evaluate_applicable_rules(employee_dict)

    if not applicable_rules:
        # No applicable recommendations needed
        return RetentionRecommendationsResponse(
            current_prediction=current_prediction,
            current_probability=current_probability,
            current_risk_level=current_risk_level,
            model_used=model_used,
            supports_probability=supports_prob,
            probability_notes=prob_notes,
            recommendations=[],
            combined_simulation=SimulationSummary(
                applied_recommendation_ids=[],
                applied_changes={},
                simulated_prediction=current_prediction,
                simulated_probability=current_probability,
                simulated_risk_level=current_risk_level,
                risk_difference=0.0 if supports_prob else None,
                risk_difference_percentage_points=0.0 if supports_prob else None,
            ),
            disclaimer=DISCLAIMER_TEXT,
        )

    # 2. Build individual what-if records
    sim_records: list[dict[str, Any]] = []
    for rule in applicable_rules:
        mod_record = dict(employee_dict)
        mod_record.update(rule.mods_fn(employee_dict))
        sim_records.append(mod_record)

    # 3. Build default combined record (applying all applicable recommendations)
    combined_record = dict(employee_dict)
    all_combined_changes: dict[str, Any] = {}
    for rule in applicable_rules:
        mods = rule.mods_fn(employee_dict)
        combined_record.update(mods)
        all_combined_changes.update(mods)

    # 4. Score all simulation records in a single batch through the ML model
    all_batch = sim_records + [combined_record]
    batch_scores = score_fn(all_batch)

    individual_scores = batch_scores[: len(sim_records)]
    combined_score = batch_scores[-1]

    # 5. Format individual recommendations
    recommendations: list[RecommendationItem] = []
    for rule, sim_score in zip(applicable_rules, individual_scores):
        sim_prediction = str(sim_score.get("prediction", "No"))
        sim_risk_level = str(sim_score.get("risk_level", "Low"))
        sim_probability: float | None = None
        risk_diff: float | None = None
        risk_diff_pct_points: float | None = None

        if supports_prob and "attrition_probability" in sim_score and current_probability is not None:
            sim_probability = float(sim_score["attrition_probability"])
            risk_diff = round(current_probability - sim_probability, 4)
            risk_diff_pct_points = round(risk_diff * 100, 2)

        base_priority = rule.base_priority_fn(employee_dict)

        # Refine priority based on model-simulated difference if probabilities are available
        final_priority = base_priority
        if supports_prob and risk_diff_pct_points is not None:
            if risk_diff_pct_points >= 5.0 or base_priority == "High":
                final_priority = "High"
            elif risk_diff_pct_points >= 1.5 or base_priority == "Medium":
                final_priority = "Medium"
            else:
                final_priority = "Low"

        recommendations.append(
            RecommendationItem(
                id=rule.rule_id,
                title=rule.title,
                category=rule.category,
                current_condition=rule.current_fn(employee_dict),
                suggested_action=rule.action,
                suggested_change=rule.change_fn(employee_dict),
                modified_fields=rule.mods_fn(employee_dict),
                priority=final_priority,
                priority_reason=rule.priority_reason_fn(employee_dict),
                simulated_prediction=sim_prediction,
                simulated_probability=sim_probability,
                simulated_risk_level=sim_risk_level,
                risk_difference=risk_diff,
                risk_difference_percentage_points=risk_diff_pct_points,
            )
        )

    # Sort recommendations: High priority first, then descending by simulated risk reduction
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    recommendations.sort(
        key=lambda r: (
            priority_order.get(r.priority, 3),
            -(r.risk_difference_percentage_points or 0.0),
        )
    )

    # 6. Format combined simulation summary
    comb_prediction = str(combined_score.get("prediction", "No"))
    comb_risk_level = str(combined_score.get("risk_level", "Low"))
    comb_probability: float | None = None
    comb_diff: float | None = None
    comb_diff_pct_points: float | None = None

    if supports_prob and "attrition_probability" in combined_score and current_probability is not None:
        comb_probability = float(combined_score["attrition_probability"])
        comb_diff = round(current_probability - comb_probability, 4)
        comb_diff_pct_points = round(comb_diff * 100, 2)

    combined_summary = SimulationSummary(
        applied_recommendation_ids=[r.rule_id for r in applicable_rules],
        applied_changes=all_combined_changes,
        simulated_prediction=comb_prediction,
        simulated_probability=comb_probability,
        simulated_risk_level=comb_risk_level,
        risk_difference=comb_diff,
        risk_difference_percentage_points=comb_diff_pct_points,
    )

    return RetentionRecommendationsResponse(
        current_prediction=current_prediction,
        current_probability=current_probability,
        current_risk_level=current_risk_level,
        model_used=model_used,
        supports_probability=supports_prob,
        probability_notes=prob_notes,
        recommendations=recommendations,
        combined_simulation=combined_summary,
        disclaimer=DISCLAIMER_TEXT,
    )


def simulate_selected_recommendations(
    employee_dict: dict[str, Any],
    selected_ids: list[str],
    score_fn: Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
    model: Any,
) -> SimulationSummary:
    """Simulate a custom subset of recommendations selected by the user."""
    supports_prob, _ = check_probability_support(model)

    # If no recommendations are selected, simulated equals current
    if not selected_ids:
        base_score = score_fn([employee_dict])[0]
        cur_pred = str(base_score.get("prediction", "No"))
        cur_prob = (
            float(base_score["attrition_probability"])
            if supports_prob and "attrition_probability" in base_score
            else None
        )
        cur_risk = str(base_score.get("risk_level", "Low"))
        return SimulationSummary(
            applied_recommendation_ids=[],
            applied_changes={},
            simulated_prediction=cur_pred,
            simulated_probability=cur_prob,
            simulated_risk_level=cur_risk,
            risk_difference=0.0 if supports_prob else None,
            risk_difference_percentage_points=0.0 if supports_prob else None,
        )

    # Apply selected changes
    mod_record = dict(employee_dict)
    applied_changes: dict[str, Any] = {}
    valid_selected_ids: list[str] = []

    for rec_id in selected_ids:
        rule = RULE_MAP.get(rec_id)
        if rule:
            mods = rule.mods_fn(employee_dict)
            mod_record.update(mods)
            applied_changes.update(mods)
            valid_selected_ids.append(rec_id)

    # Score base and combined modified records together
    scores = score_fn([employee_dict, mod_record])
    base_score, sim_score = scores[0], scores[1]

    sim_pred = str(sim_score.get("prediction", "No"))
    sim_risk = str(sim_score.get("risk_level", "Low"))
    sim_prob: float | None = None
    diff: float | None = None
    diff_pct: float | None = None

    if supports_prob and "attrition_probability" in sim_score and "attrition_probability" in base_score:
        base_prob = float(base_score["attrition_probability"])
        sim_prob = float(sim_score["attrition_probability"])
        diff = round(base_prob - sim_prob, 4)
        diff_pct = round(diff * 100, 2)

    return SimulationSummary(
        applied_recommendation_ids=valid_selected_ids,
        applied_changes=applied_changes,
        simulated_prediction=sim_pred,
        simulated_probability=sim_prob,
        simulated_risk_level=sim_risk,
        risk_difference=diff,
        risk_difference_percentage_points=diff_pct,
    )


def build_bulk_retention_recommendations(
    employees: list[dict[str, Any]],
    score_fn: Callable[[list[dict[str, Any]]], list[dict[str, Any]]],
    model: Any,
    model_used: str,
) -> BulkRetentionRecommendationsResponse:
    supports_prob, prob_notes = check_probability_support(model)

    items: list[BulkEmployeeRetentionItem] = []
    reduction_deltas: list[float] = []

    for emp in employees:
        emp_id = str(emp.get("EmployeeID", "Unknown"))
        emp_name = str(emp.get("EmployeeName", "Unknown Employee"))
        dept = str(emp.get("Department", "General"))
        role = str(emp.get("JobRole", "General"))

        model_input = {
            k: v for k, v in emp.items() if k not in {"EmployeeName", "EmployeeID"}
        }

        single_resp = build_recommendations_and_simulations(
            model_input, score_fn, model, model_used
        )

        comb_sim = single_resp.combined_simulation
        sim_prob = comb_sim.simulated_probability
        diff_pct = comb_sim.risk_difference_percentage_points

        if diff_pct is not None and diff_pct > 0:
            reduction_deltas.append(diff_pct)

        top_recs = [r.title for r in single_resp.recommendations[:2]]

        items.append(
            BulkEmployeeRetentionItem(
                EmployeeID=emp_id,
                EmployeeName=emp_name,
                Department=dept,
                JobRole=role,
                current_prediction=single_resp.current_prediction,
                current_probability=single_resp.current_probability,
                current_risk_level=single_resp.current_risk_level,
                recommendations_count=len(single_resp.recommendations),
                top_recommendations=top_recs,
                recommendations=single_resp.recommendations,
                combined_simulation=comb_sim,
                simulated_probability=sim_prob,
                risk_difference_percentage_points=diff_pct,
                employee_inputs=model_input,
            )
        )

    total_analyzed = len(employees)
    with_recs = sum(1 for item in items if item.recommendations_count > 0)
    high_risk = sum(1 for item in items if item.current_risk_level == "High")
    avg_reduction = (
        round(sum(reduction_deltas) / len(reduction_deltas), 2)
        if reduction_deltas
        else None
    )

    summary = BulkRetentionSummary(
        total_analyzed=total_analyzed,
        employees_with_recommendations=with_recs,
        high_risk_count=high_risk,
        average_risk_reduction_percentage_points=avg_reduction,
    )

    return BulkRetentionRecommendationsResponse(
        summary=summary,
        employees=items,
        supports_probability=supports_prob,
        probability_notes=prob_notes,
        disclaimer=DISCLAIMER_TEXT,
    )
