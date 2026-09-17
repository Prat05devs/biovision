from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.schemas import Signal

Sex = Literal["female", "male"]

# Mean absolute error of the pinned checkpoint's haemoglobin head (model card).
MODEL_HB_MAE_GDL = 1.515
# NiADA re-captures when the two eyes disagree by more than this.
MAX_INTER_EYE_HB_DIFFERENCE_GDL = 2.5
# CP-AnemiC, the checkpoint's only training set, enrolled children aged 6-59 months.
TRAINING_MAX_AGE_YEARS = 5


@dataclass(frozen=True)
class ScreeningProfile:
    """Details the person enters before the scan. Nothing here is inferred from images."""

    age_years: int
    sex: Sex
    pregnant: bool


@dataclass(frozen=True)
class HemoglobinReference:
    group: str
    threshold_gdl: float


@dataclass(frozen=True)
class HemoglobinInterpretation:
    signal: Signal
    reference: HemoglobinReference
    observations: tuple[str, ...]


def who_reference(profile: ScreeningProfile) -> HemoglobinReference:
    """WHO 2024 haemoglobin cut-offs for anaemia at sea level (g/dL).

    Pregnancy uses 11.0, the first- and third-trimester cut-off, because the
    trimester is not collected; the second-trimester cut-off is 10.5.
    """
    if profile.pregnant:
        return HemoglobinReference("pregnant", 11.0)
    if profile.age_years < 2:
        return HemoglobinReference("child_6_23_months", 10.5)
    if profile.age_years < 5:
        return HemoglobinReference("child_24_59_months", 11.0)
    if profile.age_years < 12:
        return HemoglobinReference("child_5_11_years", 11.5)
    if profile.age_years < 15:
        return HemoglobinReference("adolescent_12_14_years", 12.0)
    if profile.sex == "female":
        return HemoglobinReference("non_pregnant_female_15_plus", 12.0)
    return HemoglobinReference("male_15_plus", 13.0)


def interpret_hemoglobin(estimated_hb_gdl: float, profile: ScreeningProfile) -> HemoglobinInterpretation:
    """Band the estimate against the person's own reference, allowing for model error.

    An estimate within one MAE of the cut-off cannot be separated from it, so it is
    reported as `moderate` (confirm with a CBC) rather than forced to either side.
    """
    reference = who_reference(profile)
    margin = estimated_hb_gdl - reference.threshold_gdl
    signal: Signal = (
        "elevated" if margin <= -MODEL_HB_MAE_GDL else "low" if margin >= MODEL_HB_MAE_GDL else "moderate"
    )
    observations = [f"hb_reference_{reference.group}"]
    if profile.age_years >= TRAINING_MAX_AGE_YEARS:
        observations.append("model_trained_on_children_under_5")
    return HemoglobinInterpretation(signal, reference, tuple(observations))


def eyes_disagree(left_hb_gdl: float | None, right_hb_gdl: float | None) -> bool:
    if left_hb_gdl is None or right_hb_gdl is None:
        return False
    return abs(left_hb_gdl - right_hb_gdl) > MAX_INTER_EYE_HB_DIFFERENCE_GDL
