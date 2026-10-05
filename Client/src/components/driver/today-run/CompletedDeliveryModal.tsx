"use client";

import React from "react";
import {
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PhoneIcon,
} from "@/components/driver/today-run/icons";
import { type LocalDeliveryRecord } from "@/lib/driver/driver-offline-db";
import { getOutletContact } from "@/lib/driver/outlet-service";

interface CompletedDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LocalDeliveryRecord | null;
}

export function CompletedDeliveryModal({
  isOpen,
  onClose,
  record,
}: CompletedDeliveryModalProps) {
  if (!isOpen || !record) return null;

  const storeContact = getOutletContact(record.stopId);
  const formattedTime = new Date(record.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = new Date(record.createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-[#F8FAFC] rounded-t-2xl">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200/70 px-2 py-0.5 rounded">
                Delivery Record
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {record.id}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-[#202D2D] m-0">
              {record.stopName}
            </h3>
            <p className="text-xs text-[#485563] m-0">
              Completed on {formattedDate} at {formattedTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center border-none cursor-pointer transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Status & Sync Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {/* Outcome Badge */}
            <div>
              {record.outcome === "full" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-bold">
                  <CheckIcon className="w-3.5 h-3.5 text-[#15803D]" />
                  Delivered in Full
                </span>
              )}
              {record.outcome === "discrepancy" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-xs font-bold">
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-[#B45309]" />
                  Delivered with Discrepancy
                </span>
              )}
              {record.outcome === "none" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-xs font-bold">
                  <XIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                  Not Delivered
                </span>
              )}
            </div>

            {/* Sync Badge */}
            <div>
              {record.status === "Synced" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Synced to Cloud
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Pending Sync (Stored Locally)
                </span>
              )}
            </div>
          </div>

          {/* Store Contact & Quick Call Store (Requirement 1 & 2) */}
          {storeContact && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Store Contact
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {storeContact.managerName || "Store Manager"}
                </span>
                {storeContact.address && (
                  <span className="text-[11px] text-slate-500">
                    {storeContact.address}
                  </span>
                )}
              </div>
              {/* Native Quick Call Store button */}
              {storeContact.phone && (
                <a
                  href={`tel:${storeContact.phone.replace(/[^+\d]/g, "")}`}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] text-xs font-bold transition-all shadow-sm no-underline active:scale-95 shrink-0"
                  title={`Call Store: ${storeContact.phone}`}
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>Call Store ({storeContact.phone})</span>
                </a>
              )}
            </div>
          )}

          {/* Outcome Details Section */}
          {record.outcome === "discrepancy" && record.discrepancyDetails && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Discrepancy Details
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  {record.discrepancyDetails.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-amber-900">
                <span>Expected: {record.discrepancyDetails.expectedQty} units</span>
                <span>•</span>
                <span>Delivered: {record.discrepancyDetails.deliveredQty} units</span>
                <span>•</span>
                <span className="text-red-700">
                  Shortfall: {record.discrepancyDetails.expectedQty - record.discrepancyDetails.deliveredQty} units
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-amber-200">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  Driver Notes:
                </span>
                <p className="text-xs text-slate-800 m-0 leading-relaxed font-medium">
                  {record.discrepancyDetails.notes || "No additional notes recorded."}
                </p>
              </div>
              {record.discrepancyDetails.photoName && (
                <div className="flex flex-col gap-2 bg-white p-2.5 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-xs text-amber-800 font-semibold">
                    <span>📷 Discrepancy Photo:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[180px]">
                      {record.discrepancyDetails.photoName}
                    </span>
                    <span className="ml-auto text-[11px] text-green-700 font-bold">Attached ✓</span>
                  </div>
                  {record.discrepancyDetails.photoUrl && (
                    <div className="flex items-center justify-center max-h-40 overflow-hidden bg-slate-50 rounded border border-amber-100 p-1">
                      <img
                        src={record.discrepancyDetails.photoUrl}
                        alt="Discrepancy Evidence"
                        className="max-h-36 max-w-full object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {record.outcome === "none" && record.notDeliveredDetails && (
            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 uppercase tracking-wider">
                  Non-Delivery Reason
                </span>
                <span className="text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                  {record.notDeliveredDetails.reason}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-red-200">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  Driver Explanation / Notes:
                </span>
                <p className="text-xs text-slate-800 m-0 leading-relaxed font-medium">
                  {record.notDeliveredDetails.notes || "No explanation provided."}
                </p>
              </div>
              {record.notDeliveredDetails.photoName && (
                <div className="flex flex-col gap-2 bg-white p-2.5 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-xs text-red-800 font-semibold">
                    <span>📷 Proof of Non-Delivery:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[180px]">
                      {record.notDeliveredDetails.photoName}
                    </span>
                    <span className="ml-auto text-[11px] text-green-700 font-bold">Attached ✓</span>
                  </div>
                  {record.notDeliveredDetails.photoUrl && (
                    <div className="flex items-center justify-center max-h-40 overflow-hidden bg-slate-50 rounded border border-red-100 p-1">
                      <img
                        src={record.notDeliveredDetails.photoUrl}
                        alt="Non-Delivery Evidence"
                        className="max-h-36 max-w-full object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {record.outcome === "full" && (
            <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#166534]">
                  Full Consignment Delivered
                </span>
                <span className="text-[11px] text-[#15803D]">
                  All planned crates and ambient/chilled units received with verified POD.
                </span>
              </div>
            </div>
          )}

          {/* Proof of Delivery (POD) Details */}
          {record.outcome !== "none" && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col gap-3">
              <span className="text-xs font-bold text-[#202D2D] uppercase tracking-wider">
                Proof of Delivery (POD)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <CheckCircleIcon className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-800">
                      Store Signature
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      {record.podDetails?.signerName || "Store Manager (Verified)"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <CheckCircleIcon className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-800">
                      Goods Photo
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      {record.podDetails?.photoName || "Photo Captured ✓"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Image Preview */}
              {record.podDetails?.signatureUrl && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <span>✍️</span> Store Manager Signature Preview
                  </span>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-200 flex items-center justify-center min-h-[90px] max-h-36 overflow-hidden">
                    <img
                      src={record.podDetails.signatureUrl}
                      alt="Recipient Signature"
                      className="max-h-28 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-blue-700 font-semibold px-1">
                    <span>Signer: {record.podDetails.signerName || "Store Manager"}</span>
                    <span>Digitally Captured ✓</span>
                  </div>
                </div>
              )}

              {/* Goods Photo Preview */}
              {record.podDetails?.photoUrl && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-green-50/50 border border-green-200">
                  <span className="text-[11px] font-bold text-green-900 flex items-center gap-1.5">
                    <span>📷</span> Goods Delivery Photo Evidence
                  </span>
                  <div className="bg-white p-2 rounded-lg border border-green-200 flex items-center justify-center max-h-48 overflow-hidden">
                    <img
                      src={record.podDetails.photoUrl}
                      alt="Goods Photo Evidence"
                      className="max-h-44 max-w-full object-contain rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dispatch & Fleet Metadata */}
          <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Vehicle
              </span>
              <span className="font-bold text-slate-800">{record.vehicleId}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Trip Plan
              </span>
              <span className="font-bold text-slate-800">{record.tripId || "-"}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Storage
              </span>
              <span className="font-bold text-slate-800">
                {record.offlineCreated ? "Local DB" : "Cloud"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-[#F8FAFC] flex justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#202D2D] hover:bg-slate-800 text-white font-bold text-xs cursor-pointer border-none transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
