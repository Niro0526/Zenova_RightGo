"""Manifest schemas for published versions and trips."""

from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

class ManifestTripSnapshotSchema(BaseModel):
    releasedTripId: Optional[int] = None
    vehicleId: str
    tripNo: int
    tripId: Optional[str] = None
    brand: Optional[str] = None
    district: Optional[str] = None
    depot: Optional[str] = None
    plannedDepartureTime: Optional[str] = None
    leaveByTime: Optional[str] = None
    stopOutletIds: List[str]
    orderRefs: List[str]
    loadingStatus: Optional[str] = "planned"
    otpUnlocked: Optional[bool] = False

class ManifestResponseSchema(BaseModel):
    id: int
    version: int
    scenario: str
    publishedAt: str
    decisionMaker: str
    shortfallPolicy: str
    acknowledgement: str
    trips: List[ManifestTripSnapshotSchema]

class AcknowledgeManifestRequest(BaseModel):
    version: Optional[int] = None
    acknowledged_by: Optional[str] = "Rizwan (Loader)"

class ShortfallEventSchema(BaseModel):
    id: str
    orderRef: str
    outletId: str
    reportedAt: str
    manifestVersionAtReport: Optional[int] = None
    resolution: Optional[str] = None # replace, defer
    resolvedNote: Optional[str] = None

class ShortfallResolutionRequest(BaseModel):
    resolution: str # replace, defer
    note: Optional[str] = None
