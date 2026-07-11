"""Seed skincare products into MongoDB. Idempotent."""
from datetime import datetime, timezone


PRODUCTS = [
    # ---------- CLEANSERS ----------
    {
        "name": "CeraVe Hydrating Cleanser",
        "brand": "CeraVe",
        "category": "cleanser",
        "skin_types": ["dry", "normal", "sensitive", "combination"],
        "concerns": ["dullness", "redness"],
        "budget_tier": "drugstore",
        "description": "Gentle, non-foaming cleanser with ceramides and hyaluronic acid.",
    },
    {
        "name": "La Roche-Posay Toleriane Purifying Foaming Cleanser",
        "brand": "La Roche-Posay",
        "category": "cleanser",
        "skin_types": ["oily", "combination", "normal"],
        "concerns": ["acne", "large pores"],
        "budget_tier": "mid-range",
        "description": "Soap-free foaming cleanser that removes excess oil without stripping.",
    },
    {
        "name": "Fresh Soy Face Cleanser",
        "brand": "Fresh",
        "category": "cleanser",
        "skin_types": ["dry", "normal", "sensitive", "combination", "oily"],
        "concerns": ["dullness", "redness"],
        "budget_tier": "premium",
        "description": "pH-balanced gel cleanser with amino acids and rosewater.",
    },
    {
        "name": "The Ordinary Squalane Cleanser",
        "brand": "The Ordinary",
        "category": "cleanser",
        "skin_types": ["dry", "sensitive", "normal"],
        "concerns": ["dullness", "fine lines"],
        "budget_tier": "drugstore",
        "description": "Balm-to-oil cleanser that dissolves makeup while nourishing skin.",
    },
    {
        "name": "Paula's Choice CLEAR Pore Normalizing Cleanser",
        "brand": "Paula's Choice",
        "category": "cleanser",
        "skin_types": ["oily", "combination"],
        "concerns": ["acne", "large pores"],
        "budget_tier": "mid-range",
        "description": "Salicylic acid cleanser targeting breakouts and clogged pores.",
    },

    # ---------- TREATMENTS (serums / actives) ----------
    {
        "name": "The Ordinary Niacinamide 10% + Zinc 1%",
        "brand": "The Ordinary",
        "category": "treatment",
        "skin_types": ["oily", "combination", "normal"],
        "concerns": ["acne", "large pores", "dullness"],
        "budget_tier": "drugstore",
        "description": "Reduces excess oil, minimizes pores and balances congestion.",
    },
    {
        "name": "The Ordinary Alpha Arbutin 2% + HA",
        "brand": "The Ordinary",
        "category": "treatment",
        "skin_types": ["dry", "normal", "combination", "oily", "sensitive"],
        "concerns": ["dark spots", "dullness"],
        "budget_tier": "drugstore",
        "description": "Fades pigmentation and evens tone with alpha arbutin.",
    },
    {
        "name": "Paula's Choice 2% BHA Liquid Exfoliant",
        "brand": "Paula's Choice",
        "category": "treatment",
        "skin_types": ["oily", "combination", "normal"],
        "concerns": ["acne", "large pores", "dullness"],
        "budget_tier": "mid-range",
        "description": "Salicylic acid exfoliant that unclogs pores and smooths texture.",
    },
    {
        "name": "SkinCeuticals C E Ferulic",
        "brand": "SkinCeuticals",
        "category": "treatment",
        "skin_types": ["dry", "normal", "combination"],
        "concerns": ["dark spots", "fine lines", "dullness"],
        "budget_tier": "premium",
        "description": "Antioxidant vitamin C serum that brightens and firms.",
    },
    {
        "name": "The Inkey List Retinol",
        "brand": "The Inkey List",
        "category": "treatment",
        "skin_types": ["normal", "combination", "oily"],
        "concerns": ["fine lines", "dark spots"],
        "budget_tier": "drugstore",
        "description": "Encapsulated retinol to smooth fine lines with minimal irritation.",
    },
    {
        "name": "Avene Antirougeurs Fort Concentrate",
        "brand": "Avene",
        "category": "treatment",
        "skin_types": ["sensitive", "dry", "normal"],
        "concerns": ["redness"],
        "budget_tier": "mid-range",
        "description": "Soothes visible redness and calms reactive skin.",
    },
    {
        "name": "Drunk Elephant A-Passioni Retinol Cream",
        "brand": "Drunk Elephant",
        "category": "treatment",
        "skin_types": ["normal", "combination", "dry"],
        "concerns": ["fine lines", "dullness"],
        "budget_tier": "premium",
        "description": "1% retinol blend with soothing botanicals.",
    },

    # ---------- MOISTURIZERS ----------
    {
        "name": "CeraVe Moisturizing Cream",
        "brand": "CeraVe",
        "category": "moisturizer",
        "skin_types": ["dry", "normal", "sensitive"],
        "concerns": ["redness", "dullness"],
        "budget_tier": "drugstore",
        "description": "Rich cream with ceramides for barrier repair.",
    },
    {
        "name": "Neutrogena Hydro Boost Water Gel",
        "brand": "Neutrogena",
        "category": "moisturizer",
        "skin_types": ["oily", "combination", "normal"],
        "concerns": ["dullness", "large pores"],
        "budget_tier": "drugstore",
        "description": "Lightweight gel with hyaluronic acid for oil-free hydration.",
    },
    {
        "name": "La Roche-Posay Toleriane Double Repair Face Moisturizer",
        "brand": "La Roche-Posay",
        "category": "moisturizer",
        "skin_types": ["sensitive", "normal", "dry", "combination"],
        "concerns": ["redness", "dullness"],
        "budget_tier": "mid-range",
        "description": "Fragrance-free moisturizer that restores barrier.",
    },
    {
        "name": "Kiehl's Ultra Facial Cream",
        "brand": "Kiehl's",
        "category": "moisturizer",
        "skin_types": ["dry", "normal", "combination"],
        "concerns": ["dullness", "fine lines"],
        "budget_tier": "mid-range",
        "description": "24-hour hydration with squalane and glycerin.",
    },
    {
        "name": "Tatcha The Water Cream",
        "brand": "Tatcha",
        "category": "moisturizer",
        "skin_types": ["oily", "combination", "normal"],
        "concerns": ["large pores", "dullness"],
        "budget_tier": "premium",
        "description": "Oil-free water gel with Japanese botanicals.",
    },

    # ---------- SPF ----------
    {
        "name": "EltaMD UV Clear Broad-Spectrum SPF 46",
        "brand": "EltaMD",
        "category": "spf",
        "skin_types": ["sensitive", "combination", "oily", "normal"],
        "concerns": ["acne", "redness", "dark spots"],
        "budget_tier": "mid-range",
        "description": "Lightweight sunscreen with niacinamide, safe for reactive skin.",
    },
    {
        "name": "La Roche-Posay Anthelios Melt-in Milk SPF 60",
        "brand": "La Roche-Posay",
        "category": "spf",
        "skin_types": ["dry", "normal", "combination"],
        "concerns": ["dark spots", "fine lines"],
        "budget_tier": "mid-range",
        "description": "Broad-spectrum protection with a lightweight, non-greasy finish.",
    },
    {
        "name": "CeraVe Hydrating Mineral Sunscreen SPF 30",
        "brand": "CeraVe",
        "category": "spf",
        "skin_types": ["sensitive", "dry", "normal"],
        "concerns": ["redness"],
        "budget_tier": "drugstore",
        "description": "100% mineral SPF with ceramides.",
    },
    {
        "name": "Supergoop! Unseen Sunscreen SPF 40",
        "brand": "Supergoop!",
        "category": "spf",
        "skin_types": ["oily", "combination", "normal"],
        "concerns": ["large pores", "dullness"],
        "budget_tier": "premium",
        "description": "Invisible, weightless gel sunscreen with a smoothing finish.",
    },
]


async def seed_products(db):
    """Insert products if collection is empty. Idempotent."""
    count = await db.products.count_documents({})
    if count == 0:
        docs = []
        for p in PRODUCTS:
            docs.append({**p, "created_at": datetime.now(timezone.utc).isoformat()})
        await db.products.insert_many(docs)
