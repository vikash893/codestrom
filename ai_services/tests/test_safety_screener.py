import time
from app.services.safety_screener import screen_emergency


def test_cardiovascular_emergency_english():
    result = screen_emergency("I have crushing chest pain radiating to my left arm.")
    assert result.is_emergency is True
    assert "CARDIOVASCULAR_WARNING" in result.emergency_flags
    assert "112" in (result.guidance or "")


def test_cardiovascular_emergency_hindi():
    result = screen_emergency("सीने में तेज दर्द हो रहा है और घबराहट है।")
    assert result.is_emergency is True
    assert "CARDIOVASCULAR_WARNING" in result.emergency_flags


def test_cardiovascular_emergency_hinglish():
    result = screen_emergency("seene mein bahut tez dard ho raha hai heart attack lag raha")
    assert result.is_emergency is True
    assert "CARDIOVASCULAR_WARNING" in result.emergency_flags


def test_respiratory_distress_multilingual():
    # English
    res_en = screen_emergency("Patient cannot breathe and has severe shortness of breath.")
    assert res_en.is_emergency is True
    assert "RESPIRATORY_DISTRESS" in res_en.emergency_flags

    # Hindi
    res_hi = screen_emergency("मरीज को सांस नहीं आ रही है और दम घुट रहा है।")
    assert res_hi.is_emergency is True
    assert "RESPIRATORY_DISTRESS" in res_hi.emergency_flags

    # Hinglish
    res_hing = screen_emergency("saans lene mein bahut problem ho rahi hai dam ghut raha")
    assert res_hing.is_emergency is True
    assert "RESPIRATORY_DISTRESS" in res_hing.emergency_flags


def test_stroke_fast_warning_signs():
    result = screen_emergency("Sudden facial droop and slurred speech on right side.")
    assert result.is_emergency is True
    assert "STROKE_OR_NEURO_EMERGENCY" in result.emergency_flags


def test_uncontrolled_hemorrhage():
    result = screen_emergency("Deep wound with uncontrolled bleeding.")
    assert result.is_emergency is True
    assert "SEVERE_TRAUMA_OR_HEMORRHAGE" in result.emergency_flags


def test_anaphylaxis_warning():
    result = screen_emergency("Allergic reaction, throat closing up and swollen tongue.")
    assert result.is_emergency is True
    assert "ANAPHYLAXIS_OR_POISONING" in result.emergency_flags


def test_non_emergency_routine_symptoms():
    result = screen_emergency("Mild headache and slight cough for two days.")
    assert result.is_emergency is False
    assert len(result.emergency_flags) == 0
    assert result.guidance is None
    assert result.urgency_level == "routine"


def test_sub_5ms_performance_guarantee():
    start_time = time.perf_counter()
    for _ in range(100):
        screen_emergency("Severe crushing chest pain radiating to left arm.")
    elapsed = (time.perf_counter() - start_time) / 100
    # Average time per execution should be well under 5ms (0.005 seconds)
    assert elapsed < 0.005
