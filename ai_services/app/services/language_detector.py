import re

# Devanagari Unicode Block: U+0900 to U+097F
DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")

# Common Hinglish lexical markers and phonetic transliterations
HINGLISH_KEYWORDS = {
    "dard", "bukhar", "khansi", "saas", "sans", "sine", "chhati",
    "pet", "sir", "sar", "ulti", "chakkar", "kamzori", "dawa", "goli",
    "bhookh", "neend", "jalan", "sujan", "khujli", "thakan", "thakavat",
    "bahut", "bohot", "jyada", "kam", "lag", "raha", "rahi", "hai",
    "tha", "thi", "gaya", "gayi", "hona", "hota", "hoti", "se", "me",
    "mein", "aur", "ya", "nahi", "nahin", "kya", "kyun", "kaise",
    "doctor", "hospital", "dawai", "tabiyat", "kharab", "theek", "aaj",
    "kal", "subah", "shaam", "raat", "din", "ghante", "mahine", "hafte"
}

WORD_BOUNDARY_PATTERN = re.compile(r"[^\w\s]")


def detect_language(text: str, user_hint: str = "en") -> str:
    """
    Detects whether the input text is Hindi (Devanagari), Hinglish (Hindi in Latin script),
    or English.

    Returns: 'hi' | 'hinglish' | 'en'
    """
    if not text or not text.strip():
        return user_hint if user_hint in {"en", "hi", "hinglish"} else "en"

    cleaned = text.strip()

    # 1. Check for Devanagari characters
    devanagari_chars = len(DEVANAGARI_PATTERN.findall(cleaned))
    total_letters = len(re.findall(r"\w", cleaned))

    if total_letters > 0 and (devanagari_chars / total_letters) > 0.25:
        return "hi"

    # 2. Check for Hinglish markers in Latin words
    normalized = WORD_BOUNDARY_PATTERN.sub(" ", cleaned.lower())
    words = [w for w in normalized.split() if len(w) > 1]

    if words:
        hinglish_match_count = sum(1 for w in words if w in HINGLISH_KEYWORDS)
        hinglish_ratio = hinglish_match_count / len(words)

        # If at least 2 Hinglish keywords match or ratio is >= 15%
        if hinglish_match_count >= 2 or (hinglish_match_count >= 1 and hinglish_ratio >= 0.15):
            return "hinglish"

    # 3. If user explicitly provided a recognized hint, respect it if text doesn't contradict
    if user_hint in {"hi", "hinglish"}:
        return user_hint

    return "en"
