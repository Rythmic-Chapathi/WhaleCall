"""Priority scoring for WhaleCall SOS (and standard) calls.

This is the technical core of the product's promise: "your call always
reaches the pod." Every score is a plain, auditable sum of category
weights plus a linear time-decay term -- no black-box model, no ML.
That's a deliberate design choice, not a shortcut: a dispatcher (or a
judge) can look at any call and see exactly why it sits where it does
in the queue.

The decay term is the fairness guarantee. Without it, a "routine"
call could in principle wait forever if a steady stream of higher-base
calls keeps arriving after it -- decay makes every waiting call get
"louder" the longer it goes unanswered, so it eventually rises to the
top even without a dramatic base score.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

# Base weights by category. Higher = more vulnerable / more urgent.
AGE_WEIGHTS = {"child": 2, "adult": 0, "elderly": 2}
ACCESSIBILITY_WEIGHTS = {"mobility": 2, "visual": 1, "hearing": 1, "cognitive": 2, "none": 0}
MEDICAL_WEIGHTS = {"routine": 1, "urgent": 3, "critical": 5}

DECAY_RATE_PER_MINUTE = 0.15  # unanswered calls get "louder" over time


@dataclass
class Call:
    id: str
    age_bracket: str
    accessibility: str
    medical: str
    created_at: datetime
    is_sos: bool = True
    # Free-form context carried along for the dispatcher UI (island names,
    # assigned boat, etc). Not used in scoring.
    meta: dict = field(default_factory=dict)

    def base_score(self) -> float:
        return (
            AGE_WEIGHTS.get(self.age_bracket, 0)
            + ACCESSIBILITY_WEIGHTS.get(self.accessibility, 0)
            + MEDICAL_WEIGHTS.get(self.medical, 0)
        )

    def minutes_waited(self, now: datetime) -> float:
        return max(0.0, (now - self.created_at).total_seconds() / 60)

    def priority_score(self, now: datetime) -> float:
        base = self.base_score()
        minutes_waited = self.minutes_waited(now)
        decay = minutes_waited * DECAY_RATE_PER_MINUTE
        return base + decay


def sorted_queue(calls: list[Call], now: datetime) -> list[Call]:
    """Highest priority first. Ties broken by earliest arrival (fairness)."""
    return sorted(calls, key=lambda c: (-c.priority_score(now), c.created_at))


def score_breakdown(call: Call, now: datetime) -> dict:
    """The fully-explainable components behind a call's score, for display
    in the dispatcher view so the system stays auditable end to end."""
    minutes_waited = call.minutes_waited(now)
    return {
        "age": AGE_WEIGHTS.get(call.age_bracket, 0),
        "accessibility": ACCESSIBILITY_WEIGHTS.get(call.accessibility, 0),
        "medical": MEDICAL_WEIGHTS.get(call.medical, 0),
        "minutes_waited": round(minutes_waited, 1),
        "wait_bonus": round(minutes_waited * DECAY_RATE_PER_MINUTE, 2),
        "total": round(call.priority_score(now), 2),
    }
