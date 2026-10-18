from app.services.language_detector import detect_language


def test_detect_english():
    text = "I have a sore throat, mild cough, and running nose since yesterday."
    lang = detect_language(text)
    assert lang == "en"


def test_detect_hindi_devanagari():
    text = "मुझे पिछले दो दिनों से तेज बुखार और खांसी है।"
    lang = detect_language(text)
    assert lang == "hi"


def test_detect_hinglish():
    text = "mujhe kal se bukhar aur gale me dard ho raha hai"
    lang = detect_language(text)
    assert lang == "hinglish"


def test_detect_hinglish_symptoms():
    text = "pet me bahut dard hai aur ulti jaisa lag raha hai"
    lang = detect_language(text)
    assert lang == "hinglish"


def test_fallback_on_empty():
    assert detect_language("", "en") == "en"
    assert detect_language("   ", "hi") == "hi"
