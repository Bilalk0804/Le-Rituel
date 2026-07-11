"""Claude vision-based skin analysis. Photo is analyzed in-memory and never stored."""
import os
import json
import re
import base64
import logging
from typing import Optional

from emergentintegrations.llm.chat import (
    LlmChat, UserMessage, ImageContent, TextDelta, StreamDone,
)

logger = logging.getLogger("le-rituel.skin")

ALLOWED_SKIN_TYPES = {"oily", "dry", "combination", "normal", "sensitive"}
ALLOWED_CONCERNS = {"acne", "dark spots", "fine lines", "redness", "dullness", "large pores"}

SYSTEM_PROMPT = (
    "You are a dermatology-savvy skincare assistant. You will look at a single "
    "user-submitted photo of their face and produce a short, non-diagnostic "
    "skin assessment. You are NOT a doctor and you must not diagnose medical "
    "conditions. Your job is only to observe surface-level skin appearance and "
    "map it to two things: (1) a single skin_type, and (2) up to three visible "
    "concerns.\n\n"
    "Return ONLY strict JSON — no prose, no code fences, no commentary — with "
    "exactly this shape:\n"
    "{\n"
    '  "skin_type": "oily" | "dry" | "combination" | "normal" | "sensitive",\n'
    '  "concerns": ["acne" | "dark spots" | "fine lines" | "redness" | "dullness" | "large pores"],\n'
    '  "notes": "one calm, encouraging sentence tying your observations to the routine — no diagnosis"\n'
    "}\n\n"
    "Rules:\n"
    "- 'concerns' must be a subset of the allowed values above, maximum 3 items.\n"
    "- If the image is unclear, not a face, or unusable, still return valid JSON with your best guess "
    "  and put 'Image was unclear — please confirm answers manually.' in notes.\n"
    "- Never invent medical terms outside the allowed lists.\n"
    "- Never mention that you are an AI, an LLM, or Claude. Keep the tone warm and simple."
)

USER_PROMPT = (
    "Please look at this photo and return the JSON described in your instructions. "
    "Focus on the visible skin surface: overall oiliness, dryness, redness, texture, "
    "pore size, dark marks, and fine lines. Then map to the allowed values."
)


def _strip_data_url(image_base64: str) -> str:
    if image_base64.startswith("data:"):
        # data:image/jpeg;base64,XXXX
        _, _, payload = image_base64.partition(",")
        return payload
    return image_base64


def _extract_json_block(text: str) -> Optional[dict]:
    """Try to parse strict JSON, then fall back to the first {...} block."""
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None
    return None


def _sanitize(result: dict) -> dict:
    st = str(result.get("skin_type", "")).strip().lower()
    if st not in ALLOWED_SKIN_TYPES:
        st = "normal"
    concerns_raw = result.get("concerns") or []
    if not isinstance(concerns_raw, list):
        concerns_raw = []
    concerns = []
    for c in concerns_raw:
        c_clean = str(c).strip().lower()
        if c_clean in ALLOWED_CONCERNS and c_clean not in concerns:
            concerns.append(c_clean)
    concerns = concerns[:3]
    notes = str(result.get("notes", "")).strip()
    if len(notes) > 240:
        notes = notes[:237] + "..."
    return {"skin_type": st, "concerns": concerns, "notes": notes}


async def analyze_skin_photo(image_base64: str, session_id: str) -> dict:
    """Analyze a face photo and return a sanitized dict {skin_type, concerns, notes}.
    Photo is discarded after this call; nothing is persisted."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured")

    payload = _strip_data_url(image_base64)
    # Validate base64
    try:
        base64.b64decode(payload, validate=True)
    except Exception as e:
        raise ValueError(f"Invalid base64 image payload: {e}")

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    img = ImageContent(image_base64=payload)
    msg = UserMessage(text=USER_PROMPT, file_contents=[img])

    buffer = []
    try:
        async for ev in chat.stream_message(msg):
            if isinstance(ev, TextDelta):
                buffer.append(ev.content)
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.exception("LLM stream failed: %s", e)
        raise

    raw = "".join(buffer).strip()
    parsed = _extract_json_block(raw)
    if not parsed:
        logger.warning("LLM returned non-JSON: %r", raw[:200])
        raise ValueError("LLM did not return valid JSON")
    return _sanitize(parsed)
