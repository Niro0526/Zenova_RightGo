"""Domain enums for RightGo logistics system."""

from enum import Enum

class UserRole(str, Enum):
    DISPATCHER = "dispatcher"
    LOADER = "loader"
    DRIVER = "driver"
    STORE_MANAGER = "store_manager"
    ADMIN = "admin"

class Brand(str, Enum):
    FRESH = "Fresh"
    STYLE = "Style"
    TECH = "Tech"

class TempRequirement(str, Enum):
    AMBIENT = "ambient"
    CHILLED = "chilled"

class DockType(str, Enum):
    STREET = "street"
    REAR_DOCK = "rear_dock"
    MALL_BAY = "mall_bay"

class ParkingConstraint(str, Enum):
    NORMAL = "normal"
    VAN_ONLY = "van_only"
    MALL_DOCK = "mall_dock"

class VehicleType(str, Enum):
    TRUCK = "truck"
    VAN = "van"

class VehicleTemp(str, Enum):
    AMBIENT = "ambient"
    REEFER = "reefer"

class FleetStatusValue(str, Enum):
    AVAILABLE = "available"
    IN_WORKSHOP = "in_workshop"

class OrderDecision(str, Enum):
    UNRESOLVED = "unresolved"
    SERVED = "served"
    DEFERRED = "deferred"

class DeferReasonCode(str, Enum):
    CAPACITY = "capacity"
    VEHICLE_UNAVAILABLE = "vehicle_unavailable"
    ACCESS_CONSTRAINT = "access_constraint"
    OUTLET_CLOSED = "outlet_closed"
    TIME_BUDGET = "time_budget"
    OTHER = "other"
    CANCELLED = "cancelled"

class OrderStatus(str, Enum):
    AWAITING_PLANNING = "awaiting_planning"
    PLANNED = "planned"
    LOADING = "loading"
    LOADED = "loaded"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    DELIVERED_SHORT = "delivered_short"
    NOT_DELIVERED = "not_delivered"
    DEFERRED = "deferred"
    CANCELLED = "cancelled"

class ShortfallPolicy(str, Enum):
    SHIP_GOOD_TELL_STORE = "ship_good_tell_store"
    WAIT_FOR_DISPATCHER = "wait_for_dispatcher"

class LoadingStatus(str, Enum):
    PLANNED = "planned"
    LOADING = "loading"
    READY = "ready"
    DEPARTED = "departed"
    COMPLETED = "completed"

class LoadingIssueType(str, Enum):
    MISSING = "missing"
    DAMAGED = "damaged"
    SHORT = "short"
    VEHICLE_PROBLEM = "vehicle_problem"

class LoadingIssueStatus(str, Enum):
    OPEN = "open"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    UNDONE = "undone"

class LoadingIssueAction(str, Enum):
    REPLACE_FROM_STOCK = "replace_from_stock"
    SEND_TO_DISPATCHER = "send_to_dispatcher"
    APPLY_POLICY = "apply_policy"
    UNDO = "undo"

class DriverIssueCategory(str, Enum):
    ACCESS_BLOCKED = "access_blocked"
    STORE_CLOSED = "store_closed"
    DELIVERY_DISCREPANCY = "delivery_discrepancy"
    VEHICLE_PROBLEM = "vehicle_problem"
    DELAY = "delay"
    OTHER = "other"

class DeliveryOutcome(str, Enum):
    FULL = "full"
    DISCREPANCY = "discrepancy"
    NONE = "none"
    # Aliases
    DELIVERED_FULL = "DELIVERED_FULL"
    DELIVERED_WITH_DISCREPANCY = "DELIVERED_WITH_DISCREPANCY"
    NOT_DELIVERED = "NOT_DELIVERED"

class ReceiptIssueType(str, Enum):
    SHORT = "short"
    DAMAGED = "damaged"
    TEMPERATURE = "temperature"
    LATE = "late"
    OTHER = "other"

class SyncEventStatus(str, Enum):
    APPLIED = "applied"
    DUPLICATE = "duplicate"
    REJECTED = "rejected"

class NotificationKind(str, Enum):
    PLAN_RELEASED = "plan_released"
    DEFERRED = "deferred"
    FLEET_CONFLICT = "fleet_conflict"
    OTP_ISSUED = "otp_issued"
    LOADING_COMPLETE = "loading_complete"
    TRIP_UNLOCKED = "trip_unlocked"
    LOAD_PROBLEM = "load_problem"
    ARRIVING_SHORT = "arriving_short"
    DEPARTURE = "departure"
    DELIVERY = "delivery"
    FIELD_WINS = "field_wins"
    DEFERRAL_ACK = "deferral_ack"
    ORDER_PLACED = "order_placed"
    CANCEL_REFUSED = "cancel_refused"
    ORDER_CANCELLED = "order_cancelled"
    CORRECTION = "correction"
    RECEIPT_ISSUE = "receipt_issue"
