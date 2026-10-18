
from app.schemas.intake import IntakeRequest
from app.services.intake_service import process_intake


def test_intake_with_all_fields():
    request = IntakeRequest(
        description="I have had a headache since this morning.",
        language="en",
        duration="Since this morning",
        severity="moderate",
        age_years=19,
        relevant_history="No additional history provided",
    )

    response = process_intake(request)

    assert response.status == "received"
    assert "headache" in response.summary
    assert "Since this morning" in response.summary
    assert "moderate" in response.summary
    assert "19 years" in response.summary
    assert "No additional history provided" in response.summary
    assert response.needs_clinician_review is True


def test_intake_with_only_required_fields():
    request = IntakeRequest(
        description="I have had a headache since this morning.",
        language="en",
    )

    response = process_intake(request)

    assert response.status == "received"
    assert "headache" in response.summary
    assert response.needs_clinician_review is True


def test_invalid_short_description():
    try:
        IntakeRequest(description="Hi")
        assert False, "Expected validation to reject a short description"
    except ValueError:
        pass


def test_invalid_severity():
    try:
        IntakeRequest(
            description="I have a headache today.",
            severity="critical",
        )
        assert False, "Expected validation to reject an invalid severity"
    except ValueError:
        pass
