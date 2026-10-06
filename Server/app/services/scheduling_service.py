"""4 PM confirmation cutoff and operating-calendar logic (Asia/Colombo).

An order confirmed before 4 PM Asia/Colombo time is eligible for the next
operating day's planning run. An order confirmed at/after 4 PM, or on a day
the operating calendar marks closed, rolls forward to the next day the
calendar marks as operating (Waypoint operates Mon-Sat).
"""

from datetime import datetime, date, timedelta, timezone
from typing import Dict, Optional
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.models.reference import OperatingCalendarDay

COLOMBO_TZ = ZoneInfo("Asia/Colombo")
CUTOFF_HOUR = 16  # 4 PM


def colombo_now() -> datetime:
    return datetime.now(COLOMBO_TZ)


def load_operating_calendar(db: Session) -> Dict[date, bool]:
    """Map of date -> is_operating for every seeded calendar row."""
    rows = db.query(OperatingCalendarDay).all()
    return {r.date: r.is_operating for r in rows}


def is_operating_day(d: date, calendar: Dict[date, bool]) -> bool:
    """Days outside the seeded calendar range are treated as operating
    (Mon-Sat) so the system degrades gracefully rather than silently
    deferring everything when calendar data runs out."""
    if d in calendar:
        return calendar[d]
    return d.weekday() != 6  # Sunday closed by default (booklet: Waypoint operates Mon-Sat)


def next_operating_day(d: date, calendar: Dict[date, bool], max_lookahead: int = 14) -> date:
    for i in range(max_lookahead):
        candidate = d + timedelta(days=i)
        if is_operating_day(candidate, calendar):
            return candidate
    return d  # fallback - should not happen with a well-formed calendar


def compute_run_date(confirmed_at_utc: datetime, calendar: Dict[date, bool]) -> date:
    """Given a UTC confirmation timestamp, return the operating-calendar date
    (Asia/Colombo) this order is eligible to be planned on.
    Cutoff rule:
    - Before 4 PM cutoff: eligible for the current operating day's planning run.
    - At or after 4 PM cutoff: rolls to the next operating day.
    """
    if confirmed_at_utc.tzinfo is None:
        confirmed_at_utc = confirmed_at_utc.replace(tzinfo=timezone.utc)
    local = confirmed_at_utc.astimezone(COLOMBO_TZ)
    offset = 1 if local.hour >= CUTOFF_HOUR else 0
    candidate_day = local.date() + timedelta(days=offset)
    return next_operating_day(candidate_day, calendar)


def current_run_date(db: Session) -> date:
    """The operating day targeted by the current planning run."""
    calendar = load_operating_calendar(db)
    local = colombo_now()
    offset = 1 if local.hour >= CUTOFF_HOUR else 0
    target_day = local.date() + timedelta(days=offset)
    return next_operating_day(target_day, calendar)
