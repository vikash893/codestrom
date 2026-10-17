from app.services.providers.base import BaseAIProvider, ProviderIntakeOutput


class LocalRuleBasedProvider(BaseAIProvider):
    """
    High-reliability, deterministic local provider.
    Guarantees consistent, prompt execution with zero external network dependencies.
    """

    def generate_intake_summary(
        self,
        description: str,
        duration: str | None,
        severity: str,
        age_years: int | None,
        relevant_history: str | None,
        detected_language: str,
    ) -> ProviderIntakeOutput:
        summary_parts = [
            f"Patient description: {description}",
        ]

        if duration:
            summary_parts.append(f"Duration: {duration}")

        if severity and severity != "unknown":
            summary_parts.append(f"Patient-reported severity: {severity}")

        if age_years is not None:
            summary_parts.append(f"Age: {age_years} years")

        if relevant_history:
            summary_parts.append(f"Relevant history: {relevant_history}")

        summary_parts.append(f"Language: {detected_language}")

        # Basic specialty inference heuristics
        desc_lower = description.lower()
        suggested_specialty = "General Physician"
        if any(w in desc_lower for w in ["heart", "chest", "cardiac"]):
            suggested_specialty = "Cardiology"
        elif any(w in desc_lower for w in ["skin", "rash", "itch", "khujli"]):
            suggested_specialty = "Dermatology"
        elif any(w in desc_lower for w in ["child", "baby", "pediatric"]):
            suggested_specialty = "Pediatrics"

        return ProviderIntakeOutput(
            structured_summary="\n".join(summary_parts),
            suggested_specialty=suggested_specialty,
            follow_up_questions=[
                "Are symptoms getting better, worse, or staying the same?",
                "Have you taken any medication for these symptoms?",
            ],
        )
