"""Rule-based skincare recommendation engine. Fully swappable — depends only on
the quiz answers dict and a list of product docs from Mongo.

Output: a flat list of ordered steps
    { time_of_day, step_order, product_category, product_name, why, suggestions[] }

AM order: cleanser → moisturizer → sunscreen
PM order: cleanser → serum → moisturizer  (+ retinol when appropriate)
"""
from typing import Dict, List


AM_TEMPLATE = ["cleanser", "moisturizer", "sunscreen"]
PM_TEMPLATE_BASE = ["cleanser", "serum", "moisturizer"]

# Map user-facing routine categories → the raw product `category` field in Mongo.
DB_CATEGORY_FOR = {
    "cleanser": "cleanser",
    "moisturizer": "moisturizer",
    "sunscreen": "spf",
    "serum": "treatment",
    "retinol": "treatment",  # filtered further by name/description keyword
}

RETINOL_QUALIFYING_AGES = {"30-39", "40-49", "50-plus"}


def _budget_score(product_tier: str, user_tier: str) -> int:
    tier_rank = {"drugstore": 0, "mid-range": 1, "premium": 2}
    diff = abs(tier_rank.get(product_tier, 1) - tier_rank.get(user_tier, 1))
    return {0: 3, 1: 1, 2: 0}[diff]


def _has_allergy_conflict(product: dict, allergies: List[str]) -> bool:
    if not allergies:
        return False
    text = (product.get("description", "") + " " + product.get("name", "")).lower()
    for a in allergies:
        a_clean = a.strip().lower()
        if a_clean and a_clean in text:
            return True
    return False


def _is_retinol_product(product: dict) -> bool:
    haystack = (product.get("name", "") + " " + product.get("description", "")).lower()
    return "retinol" in haystack or "retinoid" in haystack


def score_product(product: dict, profile: Dict) -> int:
    skin_type = profile.get("skin_type", "")
    concerns = profile.get("concerns", []) or []
    budget = profile.get("budget", "mid-range")

    score = 0
    if skin_type in (product.get("skin_types") or []):
        score += 5
    product_concerns = product.get("concerns") or []
    overlap = len(set(concerns) & set(product_concerns))
    score += overlap * 3
    score += _budget_score(product.get("budget_tier", "mid-range"), budget)
    return score


def _reason_for(category: str, profile: Dict) -> str:
    skin_type = profile.get("skin_type", "your skin type")
    concerns = profile.get("concerns", []) or []
    top = concerns[0] if concerns else None
    if category == "cleanser":
        return f"A gentle cleanser matched to {skin_type} skin so you start fresh without stripping your barrier."
    if category == "serum":
        if top:
            return f"Targets {top} — your top concern — with active ingredients suited to {skin_type} skin."
        return f"A supportive serum to keep {skin_type} skin balanced and healthy."
    if category == "moisturizer":
        return f"Locks in hydration and reinforces the moisture barrier of {skin_type} skin."
    if category == "sunscreen":
        return "Daily UV protection is the #1 anti-aging step — non-negotiable, every morning."
    if category == "retinol":
        return "A gentle retinol at night to renew cell turnover and soften fine lines over time."
    return ""


def _should_include_retinol(profile: Dict) -> bool:
    """Retinol is appropriate for users 30+ or with fine lines/dark spots,
    who already have at least a basic routine, and whose skin isn't reactive."""
    skin_type = profile.get("skin_type", "")
    concerns = set(profile.get("concerns", []) or [])
    age_range = profile.get("age_range", "")
    routine_level = profile.get("current_routine_level", "none")

    if skin_type == "sensitive":
        return False
    if routine_level == "none":
        return False
    if age_range in RETINOL_QUALIFYING_AGES:
        return True
    if concerns & {"fine lines", "dark spots"}:
        return True
    return False


def _pick_products(
    products: List[dict],
    profile: Dict,
    routine_category: str,
    exclude_names: set,
) -> List[dict]:
    db_category = DB_CATEGORY_FOR[routine_category]
    candidates = [p for p in products if p.get("category") == db_category]

    if routine_category == "retinol":
        candidates = [p for p in candidates if _is_retinol_product(p)]
    elif routine_category == "serum":
        # A non-retinol serum for the base PM treatment slot.
        candidates = [p for p in candidates if not _is_retinol_product(p)]

    candidates = [p for p in candidates if p.get("name") not in exclude_names]
    candidates.sort(key=lambda p: score_product(p, profile), reverse=True)
    return candidates


def _make_step(
    time_of_day: str,
    step_order: int,
    routine_category: str,
    picks: List[dict],
    profile: Dict,
) -> dict:
    top = picks[:2]
    suggestions = [
        {
            "id": str(p.get("_id")) if p.get("_id") is not None else p.get("id"),
            "name": p.get("name"),
            "brand": p.get("brand"),
            "budget_tier": p.get("budget_tier"),
            "description": p.get("description"),
            "image_url": p.get("image_url"),
        }
        for p in top
    ]
    return {
        "time_of_day": time_of_day,
        "step_order": step_order,
        "product_category": routine_category,
        "product_name": suggestions[0]["name"] if suggestions else "",
        "why": _reason_for(routine_category, profile),
        "suggestions": suggestions,
    }


def build_routine(products: List[dict], profile: Dict) -> Dict:
    """Return {"steps": [ordered AM steps then ordered PM steps]}."""
    allergies_raw = profile.get("allergies", "") or ""
    allergies = [a.strip() for a in allergies_raw.replace(";", ",").split(",") if a.strip()]
    filtered = [p for p in products if not _has_allergy_conflict(p, allergies)]

    pm_template = list(PM_TEMPLATE_BASE)
    if _should_include_retinol(profile):
        pm_template.append("retinol")

    steps: List[dict] = []
    order = 1
    for cat in AM_TEMPLATE:
        picks = _pick_products(filtered, profile, cat, exclude_names=set())
        steps.append(_make_step("am", order, cat, picks, profile))
        order += 1

    order = 1
    used_serum_names: set = set()
    for cat in pm_template:
        exclude = used_serum_names if cat == "retinol" else set()
        picks = _pick_products(filtered, profile, cat, exclude_names=exclude)
        if cat == "serum":
            used_serum_names.add(picks[0]["name"]) if picks else None
        steps.append(_make_step("pm", order, cat, picks, profile))
        order += 1

    return {"steps": steps}
