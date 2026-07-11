"""Rule-based skincare recommendation engine. Fully swappable — depends only on
the quiz answers dict and a list of product docs from Mongo."""
from typing import Dict, List


CATEGORIES_ORDER = ["cleanser", "treatment", "moisturizer", "spf"]


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
    if category == "treatment":
        if top:
            return f"Targets {top} — your top concern — with active ingredients suited to {skin_type} skin."
        return f"A supportive serum to keep {skin_type} skin balanced and healthy."
    if category == "moisturizer":
        return f"Locks in hydration and reinforces the moisture barrier of {skin_type} skin."
    if category == "spf":
        return "Daily UV protection is the #1 anti-aging step — non-negotiable, every morning."
    return ""


def build_routine(products: List[dict], profile: Dict) -> Dict:
    """Return {am_steps: [...], pm_steps: [...]} matched from products."""
    allergies_raw = profile.get("allergies", "") or ""
    allergies = [a.strip() for a in allergies_raw.replace(";", ",").split(",") if a.strip()]

    filtered = [p for p in products if not _has_allergy_conflict(p, allergies)]

    by_cat: Dict[str, List[dict]] = {c: [] for c in CATEGORIES_ORDER}
    for p in filtered:
        cat = p.get("category")
        if cat in by_cat:
            by_cat[cat].append(p)

    for cat in by_cat:
        by_cat[cat].sort(key=lambda p: score_product(p, profile), reverse=True)

    def _step(category: str) -> dict:
        top = by_cat[category][:2]
        examples = [
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
            "step": category,
            "label": category.replace("spf", "SPF").title(),
            "why": _reason_for(category, profile),
            "examples": examples,
        }

    am_steps = [_step("cleanser"), _step("treatment"), _step("moisturizer"), _step("spf")]
    pm_steps = [_step("cleanser"), _step("treatment"), _step("moisturizer")]

    return {"am_steps": am_steps, "pm_steps": pm_steps}
