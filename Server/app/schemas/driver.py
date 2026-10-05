"""Driver domain schemas matching Client/src/lib/driver."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class OTPVerifyRequest(BaseModel):
    trip_id: str
    vehicle_id: str
    otp_code: str

class DiscrepancyDetails(BaseModel):
    type: str
    expectedQty: int
    deliveredQty: int
    notes: str
    photoName: Optional[str] = None
    photoUrl: Optional[str] = None

class NotDeliveredDetails(BaseModel):
    reason: str
    notes: str
    photoName: Optional[str] = None
    photoUrl: Optional[str] = None

class PodDetails(BaseModel):
    photoName: Optional[str] = None
    photoUrl: Optional[str] = None
    signerName: Optional[str] = None
    hasSignature: Optional[bool] = False
    signatureUrl: Optional[str] = None

class LocalDeliveryRecordSchema(BaseModel):
    id: str # e.g. "DEL-S1-T001-001"
    stopId: str
    stopName: str
    vehicleId: str
    outcome: str # "full", "discrepancy", "none"
    discrepancyDetails: Optional[DiscrepancyDetails] = None
    notDeliveredDetails: Optional[NotDeliveredDetails] = None
    podDetails: Optional[PodDetails] = None
    status: str = "Pending Sync"
    offlineCreated: bool = False
    createdAt: str
    syncedAt: Optional[str] = None
    tripId: Optional[str] = None  # the run this outcome belongs to (filled in by the server)

class IssueCategoryItem(BaseModel):
    id: str
    label: str
    icon: str

class IssueReportRecordSchema(BaseModel):
    id: str # e.g. "REP-S1-T001-001"
    tripId: str
    vehicleId: str
    categoryId: str
    categoryLabel: str
    categoryIcon: str
    categories: Optional[List[IssueCategoryItem]] = None
    relatedScope: str = "stop"
    orderId: Optional[str] = None
    stopCode: Optional[str] = None
    outletName: str
    description: str
    photo: Optional[Dict[str, str]] = None
    status: str = "Pending Sync"
    offlineCreated: bool = False
    createdAt: str
    syncedAt: Optional[str] = None

class DriverRunProgressResponse(BaseModel):
    tripId: str
    vehicleId: str
    totalStops: int
    completedStops: int
    remainingStops: int
    progressPercentage: float
    currentStopIndex: int
    isCompleted: bool
    status: str
