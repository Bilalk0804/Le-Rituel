"""AI skincare chat assistant. Scoped strictly to skincare via system prompt,
personalized with the user's quiz answers + current routine."""
import os
import logging
from typing import List, Optional

from emergentintegrations.llm.chat import (
    LlmChat, UserMessage, TextDelta, StreamDone,
)

logger = logging.getLogger("le-rituel.chat")


BASE_SYSTEM = (
    "You are Le Rituel's in-app skincare assistant. Your ONLY topic is skincare — "
    "products, ingredients, routines, skin concerns, application order, timing, "
    "and gentle general guidance. Keep answers short (2–5 sentences unless the user "
    "asks for depth), warm, non-diagnostic, and free of medical claims.\n\n"
    "STRICT RULES:\n"
    "- If a message is NOT about skincare (e.g. news, coding, relationships, "
    "  finance, general chit-chat, medicine, other beauty topics like hair or "
    "  makeup unless they intersect with facial skin), reply with ONE short "
    "  polite sentence explaining you can only help with skincare, and suggest a "
    "  skincare question they could ask instead. Do NOT answer the off-topic part.\n"
    "- Never diagnose medical conditions. If the user describes something serious "
    "  (cystic acne, severe rash, allergic reaction, wounds), recommend they see "
    "  a dermatologist and give only mild supportive advice.\n"
    "- Ground every answer in what you know about the user (below). Reference their "
    "  routine steps and quiz answers when relevant — but don't robotically repeat "
    "  the whole profile.\n"
    "- Never mention that you are an AI, an LLM, Anthropic, or Claude.\n"
    "- Never invent brand-specific claims. Speak in general skincare terms.\n"
    "- Avoid emojis. Keep the tone calm and simple.\n"
)


def _format_user_context(profile: Optional[dict], routine: Optional[dict]) -> str:
    lines: List[str] = []
    if profile:
        lines.append("USER'S SKIN QUIZ:")
        lines.append(f"- Skin type: {profile.get('skin_type', 'unknown')}")
        concerns = profile.get("concerns") or []
        lines.append(f"- Concerns: {', '.join(concerns) if concerns else 'none listed'}")
        allergies = profile.get("allergies") or ""
        if allergies:
            lines.append(f"- Avoiding ingredients: {allergies}")
        lines.append(f"- Age range: {profile.get('age_range', 'unknown')}")
        lines.append(f"- Budget preference: {profile.get('budget', 'unknown')}")
        lines.append(f"- Current routine level: {profile.get('current_routine_level', 'unknown')}")
    else:
        lines.append("USER'S SKIN QUIZ: not completed yet.")

    if routine and (routine.get("steps") or []):
        lines.append("")
        lines.append("USER'S CURRENT ROUTINE:")
        for s in routine["steps"]:
            tod = "Morning" if s.get("time_of_day") == "am" else "Evening"
            cat = s.get("product_category", "").title()
            name = s.get("product_name") or "(no product chosen)"
            lines.append(f"- {tod} step {s.get('step_order', 0)} · {cat}: {name}")
    else:
        lines.append("")
        lines.append("USER'S CURRENT ROUTINE: not generated yet.")
    return "\n".join(lines)


def build_system_prompt(profile: Optional[dict], routine: Optional[dict]) -> str:
    return f"{BASE_SYSTEM}\n\n{_format_user_context(profile, routine)}"


async def chat_reply(
    session_id: str,
    system_prompt: str,
    history: List[dict],
    user_text: str,
) -> str:
    """Return the assistant reply for the given user message.

    `history` is a list of {role: 'user'|'assistant', content: str} previous turns.
    They are concatenated into a single prompt so the assistant has short context
    without the platform having to persist a session server-side."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Fold prior turns into a single readable transcript before the current message.
    transcript = []
    for turn in history[-8:]:  # cap context to the last 8 turns to control cost
        role = turn.get("role", "user")
        content = str(turn.get("content", "")).strip()
        if not content:
            continue
        label = "USER" if role == "user" else "ASSISTANT"
        transcript.append(f"{label}: {content}")

    if transcript:
        composed = "\n\n".join(transcript) + "\n\nUSER: " + user_text
    else:
        composed = user_text

    msg = UserMessage(text=composed)

    buffer = []
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            buffer.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(buffer).strip()
