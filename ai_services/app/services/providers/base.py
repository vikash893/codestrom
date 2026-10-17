from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ProviderIntakeOutput:
    structured_summary: str
    suggested_specialty: str | None = None
    follow_up_questions: list[str] | None = None


class BaseAIProvider(ABC):
    """
    Abstract interface for AI intelligence providers.
    Decouples business logic from external LLM vendors.
    """

    @abstractmethod
    def generate_intake_summary(
        self,
        description: str,
        duration: str | None,
        severity: str,
        age_years: int | None,
        relevant_history: str | None,
        detected_language: str,
    ) -> ProviderIntakeOutput:
        pass
