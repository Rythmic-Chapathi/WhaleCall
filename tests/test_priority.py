"""Unit tests for the priority scoring algorithm -- the technical core of
WhaleCall's SOS flow. These are intentionally standalone (no FastAPI, no
network) so the logic can be verified in isolation, per the build spec."""
from datetime import datetime, timedelta, timezone

from priority import Call, sorted_queue, score_breakdown


def make_call(id_, age="adult", accessibility="none", medical="routine", minutes_ago=0, is_sos=True):
    now = datetime.now(timezone.utc)
    return Call(
        id=id_,
        age_bracket=age,
        accessibility=accessibility,
        medical=medical,
        created_at=now - timedelta(minutes=minutes_ago),
        is_sos=is_sos,
    )


def test_base_score_sums_category_weights():
    call = make_call("c1", age="elderly", accessibility="mobility", medical="critical")
    # elderly(2) + mobility(2) + critical(5) = 9
    assert call.base_score() == 9


def test_adult_none_routine_is_lowest_base():
    call = make_call("c1", age="adult", accessibility="none", medical="routine")
    assert call.base_score() == 1  # 0 + 0 + 1


def test_priority_score_includes_time_decay():
    now = datetime.now(timezone.utc)
    call = Call(id="c1", age_bracket="adult", accessibility="none", medical="routine",
                created_at=now - timedelta(minutes=10))
    # base 1 + 10 * 0.15 = 2.5
    assert round(call.priority_score(now), 2) == 2.5


def test_priority_score_with_no_wait_equals_base_score():
    now = datetime.now(timezone.utc)
    call = Call(id="c1", age_bracket="elderly", accessibility="none", medical="urgent", created_at=now)
    assert call.priority_score(now) == call.base_score()


def test_sorted_queue_orders_highest_priority_first():
    critical = make_call("critical", age="elderly", accessibility="mobility", medical="critical", minutes_ago=0)
    routine = make_call("routine", age="adult", accessibility="none", medical="routine", minutes_ago=0)
    now = datetime.now(timezone.utc)
    ordered = sorted_queue([routine, critical], now)
    assert [c.id for c in ordered] == ["critical", "routine"]


def test_decay_lets_a_waiting_call_eventually_overtake_a_fresher_higher_priority_one():
    """This is the fairness guarantee: a routine call that has waited long
    enough must be able to catch up to a fresh, higher-base-score call."""
    now = datetime.now(timezone.utc)
    # base score 9 (elderly + mobility + critical), just arrived.
    fresh_critical = Call(id="fresh", age_bracket="elderly", accessibility="mobility",
                           medical="critical", created_at=now)
    # base score 1 (adult, none, routine), but waited a long time.
    # Needs (9 - 1) / 0.15 = ~53.3 minutes of wait to catch up.
    old_routine = Call(id="old", age_bracket="adult", accessibility="none",
                        medical="routine", created_at=now - timedelta(minutes=60))

    ordered = sorted_queue([fresh_critical, old_routine], now)
    assert ordered[0].id == "old"


def test_score_breakdown_is_fully_explainable_and_sums_to_total():
    now = datetime.now(timezone.utc)
    call = Call(id="c1", age_bracket="child", accessibility="visual", medical="urgent",
                created_at=now - timedelta(minutes=4))
    breakdown = score_breakdown(call, now)
    expected_total = breakdown["age"] + breakdown["accessibility"] + breakdown["medical"] + breakdown["wait_bonus"]
    assert round(expected_total, 2) == breakdown["total"]


def test_ties_broken_by_earliest_arrival():
    now = datetime.now(timezone.utc)
    earlier = Call(id="earlier", age_bracket="adult", accessibility="none", medical="routine",
                    created_at=now - timedelta(minutes=10))
    later = Call(id="later", age_bracket="adult", accessibility="none", medical="routine",
                 created_at=now - timedelta(minutes=5))
    # Same base score; "earlier" has waited longer so it must sort first
    # even though it wasn't first in the input list.
    ordered = sorted_queue([later, earlier], now)
    assert [c.id for c in ordered] == ["earlier", "later"]
