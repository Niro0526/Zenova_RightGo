"use client";

import React from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
} from "@/components/driver/today-run/icons";

import type { IssueCategoryItem, IssueReportRecord } from "@/lib/driver/driver-offline-db";
export type { IssueCategoryItem, IssueReportRecord };

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: IssueReportRecord | null;
}

export function ReportDetailsModal({
  isOpen,
  onClose,
  report,
}: ReportDetailsModalProps) {
  if (!isOpen || !report) return null;

  const formattedTime = new Date(report.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = new Date(report.createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const categoriesList = report.categories && report.categories.length > 0
    ? report.categories
    : [
        {
          id: report.categoryId,
          label: report.categoryLabel,
          icon: report.categoryIcon,
        },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-[#F8FAFC] rounded-t-2xl">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-200/70 px-2 py-0.5 rounded">
                Issue Report Record
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {report.id}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-[#202D2D] m-0 flex items-center gap-2">
              <span>{report.categoryIcon}</span>
              <span>{report.categoryLabel}</span>
            </h3>
            <p className="text-xs text-[#485563] m-0">
              Reported on {formattedDate} at {formattedTime}
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
          {/* Status & Sync Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoriesList.map((cat) => (
                <span
                  key={cat.id}
                  className="text-xs font-bold text-[#F97316] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 flex items-center gap-1.5"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
              ))}
            </div>

            {/* Cloud Sync Status */}
            <div>
              {report.status === "Synced" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-bold">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-[#15803D]" />
                  Cloud Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Saved Locally (Pending Sync)
                </span>
              )}
            </div>
          </div>

          {/* Scope & Outlet Info */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Target Outlet &amp; Scope
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-[#202D2D] text-base">
                {report.outletName}
              </span>
              <span className="text-xs font-bold text-[#F97316] bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 inline-block w-fit">
                {report.relatedScope}
              </span>
            </div>
          </div>

          {/* Trip & Vehicle Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Assigned Trip
              </span>
              <span className="font-bold text-slate-800 text-sm">{report.tripId}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Vehicle
              </span>
              <span className="font-bold text-slate-800 text-sm">{report.vehicleId}</span>
            </div>
          </div>

          {/* Driver Description / Observations */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Description &amp; Observations
            </span>
            <p className="text-xs font-medium text-slate-800 m-0 leading-relaxed whitespace-pre-wrap">
              {report.description || "No additional text notes provided."}
            </p>
          </div>

          {/* Attached Photo Evidence */}
          {report.photo && (
            <div className="flex flex-col gap-2 bg-orange-50/50 rounded-xl p-4 border border-orange-200">
              <span className="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📷</span> Photo Evidence Attached
              </span>
              <div className="flex items-center gap-3">
                <img
                  src={report.photo.url}
                  alt="Issue photo evidence"
                  className="w-16 h-16 rounded-lg object-cover border border-orange-300 shadow-sm shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                    {report.photo.name}
                  </span>
                  <span className="text-[11px] font-semibold text-green-700">
                    Captured on Driver device ✓
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Read-only Security Banner */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
            <span className="text-sm">🔒</span>
            <span>
              This report is recorded on the official trip log and cannot be edited.
            </span>
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
