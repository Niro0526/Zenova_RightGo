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
    (Asia/Colombo) this order is eligible to be planned on."""
    if confirmed_at_utc.tzinfo is None:
        confirmed_at_utc = confirmed_at_utc.replace(tzinfo=timezone.utc)
    local = confirmed_at_utc.astimezone(COLOMBO_TZ)
    candidate_day = local.date()
    if local.hour >= CUTOFF_HOUR:
        candidate_day = candidate_day + timedelta(days=1)
    return next_operating_day(candidate_day, calendar)


def current_run_date(db: Session) -> date:
    """The run date that an order confirmed right now would join - i.e. the
    boundary used to decide which already-placed orders are eligible for the
    *current* planning draft."""
    calendar = load_operating_calendar(db)
    return compute_run_date(datetime.now(timezone.utc), calendar)
