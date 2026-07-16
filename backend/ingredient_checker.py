"""Static ingredient conflict lookup. Deliberately small and rule-based —
easy to extend by editing the CONFLICTS list."""
from typing import Optional


# Canonical ingredient names mapped to common aliases. Lookup is case-insensitive
# and substring-based, so "Salicylic Acid 2%" resolves to BHA.
INGREDIENTS = {
    "Vitamin C": ["vitamin c", "ascorbic acid", "l-ascorbic acid", "vit c", "ascorbyl"],
    "Retinol": ["retinol", "retinoid", "retinoids", "tretinoin", "retin-a", "retinaldehyde"],
    "Niacinamide": ["niacinamide", "nicotinamide", "vitamin b3"],
    "AHA": ["aha", "alpha hydroxy", "glycolic acid", "lactic acid", "mandelic acid", "citric acid"],
    "BHA": ["bha", "beta hydroxy", "salicylic acid"],
    "Benzoyl Peroxide": ["benzoyl peroxide", "bpo"],
    "Azelaic Acid": ["azelaic acid", "azeloyl"],
    "Hyaluronic Acid": ["hyaluronic acid", "sodium hyaluronate"],
    "Peptides": ["peptide", "peptides", "matrixyl", "argireline"],
    "Ceramides": ["ceramide", "ceramides"],
    "Vitamin E": ["vitamin e", "tocopherol"],
    "PHA": ["pha", "polyhydroxy", "gluconolactone", "lactobionic acid"],
    "Centella": ["centella", "cica", "madecassoside"],
}


# Symmetric conflict list. Order of pair does not matter.
CONFLICTS = [
    (
        "Vitamin C", "Benzoyl Peroxide",
        "Benzoyl peroxide oxidizes vitamin C — combining them cancels both actives.",
    ),
    (
        "Retinol", "AHA",
        "Retinol layered with an AHA over-exfoliates the barrier — expect redness, peeling and irritation.",
    ),
    (
        "Retinol", "BHA",
        "Retinol with BHA (salicylic acid) is a fast track to a compromised barrier. Alternate them on different nights.",
    ),
    (
        "Retinol", "Vitamin C",
        "Their optimal pH ranges clash — the combo dulls effectiveness and irritates. Vitamin C in the morning, retinol at night.",
    ),
    (
        "Niacinamide", "Vitamin C",
        "At high concentrations they can neutralize each other into niacin. Space them by 15+ minutes or use in AM/PM.",
    ),
    (
        "AHA", "BHA",
        "Two acids at once over-exfoliate — rotate on different days rather than stacking.",
    ),
    (
        "Retinol", "Benzoyl Peroxide",
        "Benzoyl peroxide deactivates most retinols. Use them at different times of day or on different nights.",
    ),
]

# A short reassurance sentence for well-known synergistic pairs.
SYNERGIES = {
    frozenset({"Vitamin C", "Vitamin E"}):
        "Vitamin C and vitamin E stabilize each other — a classic pairing.",
    frozenset({"Retinol", "Peptides"}):
        "Peptides support the barrier while retinol works — a smart pairing.",
    frozenset({"Retinol", "Hyaluronic Acid"}):
        "Hyaluronic acid buffers retinol dryness — safe and often ideal together.",
    frozenset({"Niacinamide", "Hyaluronic Acid"}):
        "Both are gentle hydrators — perfectly compatible.",
    frozenset({"Ceramides", "Retinol"}):
        "Ceramides help repair the barrier that retinol accelerates.",
    frozenset({"Azelaic Acid", "Niacinamide"}):
        "Both calm redness and even tone — a soothing combo.",
}


def resolve(name: str) -> Optional[str]:
    """Resolve free-text input to a canonical ingredient. Returns None if unknown."""
    if not name:
        return None
    needle = name.strip().lower()
    if not needle:
        return None
    for canonical, aliases in INGREDIENTS.items():
        for alias in aliases:
            if alias in needle:
                return canonical
    return None


def known_ingredients() -> list:
    return sorted(INGREDIENTS.keys())


def check_pair(a: str, b: str) -> dict:
    """Return a verdict dict:
        { status: 'safe' | 'avoid' | 'unknown',
          verdict: str, reason: str,
          canonical_a: str|None, canonical_b: str|None,
          input_a: str, input_b: str }"""
    ca = resolve(a)
    cb = resolve(b)

    if not ca or not cb:
        missing = []
        if not ca:
            missing.append(a)
        if not cb:
            missing.append(b)
        return {
            "status": "unknown",
            "verdict": "We don't recognise that ingredient yet",
            "reason": f"Couldn't identify: {', '.join(missing)}. Try a canonical name like 'Vitamin C' or 'Retinol'.",
            "canonical_a": ca,
            "canonical_b": cb,
            "input_a": a,
            "input_b": b,
        }

    if ca == cb:
        return {
            "status": "safe",
            "verdict": "Safe to combine",
            "reason": f"You picked the same ingredient twice ({ca}) — nothing to conflict with.",
            "canonical_a": ca, "canonical_b": cb, "input_a": a, "input_b": b,
        }

    pair = frozenset({ca, cb})
    for x, y, reason in CONFLICTS:
        if frozenset({x, y}) == pair:
            return {
                "status": "avoid",
                "verdict": "Avoid combining",
                "reason": reason,
                "canonical_a": ca, "canonical_b": cb, "input_a": a, "input_b": b,
            }

    synergy = SYNERGIES.get(pair)
    reason = synergy or (
        f"{ca} and {cb} have no known conflict — you can layer them in the same routine."
    )
    return {
        "status": "safe",
        "verdict": "Safe to combine",
        "reason": reason,
        "canonical_a": ca, "canonical_b": cb, "input_a": a, "input_b": b,
    }
