import pytest

from app.rules.hemoglobin import (
    ScreeningProfile,
    eyes_disagree,
    interpret_hemoglobin,
    who_reference,
)


@pytest.mark.parametrize(
    ("profile", "threshold"),
    [
        (ScreeningProfile(age_years=1, sex="male", pregnant=False), 10.5),
        (ScreeningProfile(age_years=3, sex="female", pregnant=False), 11.0),
        (ScreeningProfile(age_years=8, sex="male", pregnant=False), 11.5),
        (ScreeningProfile(age_years=13, sex="female", pregnant=False), 12.0),
        (ScreeningProfile(age_years=30, sex="female", pregnant=False), 12.0),
        (ScreeningProfile(age_years=30, sex="female", pregnant=True), 11.0),
        (ScreeningProfile(age_years=30, sex="male", pregnant=False), 13.0),
    ],
)
def test_who_reference_depends_on_entered_profile(profile: ScreeningProfile, threshold: float) -> None:
    assert who_reference(profile).threshold_gdl == threshold


def test_same_estimate_is_read_against_each_persons_own_cut_off() -> None:
    adult_male = ScreeningProfile(age_years=40, sex="male", pregnant=False)
    child = ScreeningProfile(age_years=3, sex="male", pregnant=False)
    assert interpret_hemoglobin(11.0, adult_male).signal == "elevated"
    assert interpret_hemoglobin(11.0, child).signal == "moderate"


def test_estimates_within_model_error_of_the_cut_off_are_not_forced_to_a_side() -> None:
    profile = ScreeningProfile(age_years=30, sex="female", pregnant=False)
    assert interpret_hemoglobin(12.4, profile).signal == "moderate"
    assert interpret_hemoglobin(14.0, profile).signal == "low"
    assert interpret_hemoglobin(10.0, profile).signal == "elevated"


def test_adults_are_flagged_as_outside_the_training_population() -> None:
    adult = interpret_hemoglobin(13.0, ScreeningProfile(age_years=30, sex="female", pregnant=False))
    child = interpret_hemoglobin(13.0, ScreeningProfile(age_years=2, sex="female", pregnant=False))
    assert "model_trained_on_children_under_5" in adult.observations
    assert "model_trained_on_children_under_5" not in child.observations


def test_large_inter_eye_difference_requires_recapture() -> None:
    assert eyes_disagree(9.0, 12.0) is True
    assert eyes_disagree(9.0, 11.0) is False
    assert eyes_disagree(9.0, None) is False


def test_second_trimester_uses_the_lower_who_cut_off() -> None:
    """Plasma volume expansion dilutes haemoglobin, so WHO sets 10.5 rather than 11.0."""
    second = ScreeningProfile(age_years=27, sex="female", pregnant=True, trimester="second")
    assert who_reference(second).threshold_gdl == 10.5
    for trimester in ("first", "third"):
        other = ScreeningProfile(age_years=27, sex="female", pregnant=True, trimester=trimester)
        assert who_reference(other).threshold_gdl == 11.0

    # The bands move with the cut-off. Both estimates sit between the two thresholds once the
    # model's error is allowed for, so each is called differently depending on the trimester.
    first = ScreeningProfile(age_years=27, sex="female", pregnant=True, trimester="first")
    assert interpret_hemoglobin(9.2, second).signal == "moderate"
    assert interpret_hemoglobin(9.2, first).signal == "elevated"
    assert interpret_hemoglobin(12.2, second).signal == "low"
    assert interpret_hemoglobin(12.2, first).signal == "moderate"


def test_pregnancy_without_a_trimester_keeps_the_safer_cut_off() -> None:
    unknown = ScreeningProfile(age_years=27, sex="female", pregnant=True)
    assert who_reference(unknown).threshold_gdl == 11.0
