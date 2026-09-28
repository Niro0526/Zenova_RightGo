"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CameraIcon,
  RouteIcon,
  NavigationIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@/components/driver/today-run/icons";

export const ISSUE_TYPES = [
  { id: "shortfall", label: "Shortfall / Stock Discrepancy", icon: "📦" },
  { id: "damaged", label: "Damaged Goods at Unloading", icon: "⚠️" },
  { id: "access", label: "Outlet Closed / Access Restricted", icon: "🚪" },
  { id: "vehicle", label: "Vehicle Issue / Delay", icon: "🚚" },
  { id: "other", label: "Other Issue", icon: "📝" },
] as const;

export function DriverReportWorkflow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string>("shortfall");
  const [description, setDescription] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAttachedFile({ name: file.name, url });
    }
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 500);
  };

  const handleProceedNextStop = () => {
    router.push("/driver/today-run");
  };

  return (
    <>
      {/* Hidden File Input for Evidence Photo - mounted at root */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ══════════════════════════════════════════
          DESKTOP layout  (md+) — fluid, full-width
          ══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-6 p-6 lg:p-8 min-h-full">
        {/* Navigation / Header Row */}
        <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <Link
              href="/driver/current-stop"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#202D2D] hover:bg-[#E2E8F0] transition-colors"
              aria-label="Back to Current Stop"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#F59E0B] font-bold text-xs uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  {isSubmitted ? "Stop Recorded" : "Report Issue"}
                </span>
                <span className="text-[#485563] font-bold text-sm">OUT001 / Colpetty Retailer</span>
              </div>
              <h1 className="text-[#202D2D] font-extrabold text-2xl lg:text-3xl mt-1">
                {isSubmitted ? "Report Submitted Successfully" : "Report Delivery Issue"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-[#CBD5E1] rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#22C55E] font-semibold text-xs">Online</span>
          </div>
        </div>

        {/* ── DESKTOP REPORT SUBMITTED VIEW ── */}
        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-12 border border-[#E2E8F0] shadow-sm text-center gap-6 max-w-2xl mx-auto w-full my-auto">
            <div className="w-20 h-20 rounded-full bg-[#ECFDF5] border-2 border-[#22C55E] flex items-center justify-center shadow-lg">
              <CheckIcon className="w-10 h-10 text-[#22C55E]" />
            </div>

            <div className="bg-[rgba(34,197,94,0.09)] border border-[rgba(34,197,94,0.37)] rounded-xl p-8 w-full flex flex-col gap-2">
              <h2 className="text-[#22C55E] font-extrabold text-3xl">
                Report Submitted
              </h2>
              <p className="text-[#202D2D]/80 font-semibold text-base mt-1">
                Issue report logged for OUT001 / Colpetty Retailer
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedNextStop}
              className="flex items-center justify-center gap-2 w-full max-w-sm py-4 bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-base rounded-xl transition-all shadow-lg cursor-pointer border-none"
            >
              <span>Proceed to Next Stop</span>
              <ArrowRightIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          /* ── DESKTOP FORM CONTAINER ── */
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Column (Issue Category Selection) - 6 cols */}
            <div className="lg:col-span-6 flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]">
              <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                SELECT ISSUE CATEGORY
              </span>

              <div className="flex flex-col gap-3">
                {ISSUE_TYPES.map((issue) => {
                  const isSelected = selectedIssue === issue.id;
                  return (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => setSelectedIssue(issue.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#FFF4ED] border-[#F97316]"
                          : "bg-white border-[#CBD5E1] hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{issue.icon}</span>
                        <span
                          className={`font-semibold text-sm ${
                            isSelected ? "text-[#202D2D]" : "text-[#485563]"
                          }`}
                        >
                          {issue.label}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          isSelected
                            ? "border-[#F97316] bg-[#F97316]"
                            : "border-[#CBD5E1] bg-white"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column (Description, Photo & Submit) - 6 cols */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1] flex flex-col gap-4">
                <span className="text-[#485563] font-bold text-xs uppercase tracking-wider">
                  ISSUE DETAILS & ATTACHMENT
                </span>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="issue-description" className="text-xs font-semibold text-[#485563]">
                    Description / Notes
                  </label>
                  <textarea
                    id="issue-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue, damage, or discrepancy in detail..."
                    className="w-full p-3 bg-[#F9FAFB] border border-[#CBD5E1] rounded-xl text-sm text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                {attachedFile ? (
                  <div className="flex items-center justify-between p-3.5 bg-green-50 border border-green-400 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={attachedFile.url}
                        alt="Photo evidence preview"
                        className="w-10 h-10 rounded-lg object-cover border border-green-300 shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-green-800 truncate">
                          {attachedFile.name}
                        </span>
                        <span className="text-[11px] text-green-600 font-semibold">
                          Photo Attached ✓
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 bg-white border border-red-200 rounded-md shrink-0 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F9FAFB] hover:bg-slate-100 text-[#485563] transition-colors cursor-pointer"
                  >
                    <CameraIcon className="w-5 h-5 text-[#485563]" />
                    <span className="text-sm font-semibold">Attach Photo Evidence (Upload File)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/driver/current-stop"
                  className="flex-1 py-3.5 rounded-xl border-2 border-[#202D2D] text-[#202D2D] font-bold text-center text-sm hover:bg-[#202D2D] hover:text-white transition-all no-underline"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-bold text-sm shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <AlertTriangleIcon className="w-4 h-4 text-white" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Issue Report"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE layout  (< md) — Figma exact canvas
          ══════════════════════════════════════════ */}
      <div className="md:hidden flex items-start justify-center min-h-full bg-[#E2E8F0] py-4">
        <MobileReportCanvas
          selectedIssue={selectedIssue}
          onSelectIssue={(id) => setSelectedIssue(id)}
          description={description}
          onChangeDescription={(val) => setDescription(val)}
          attachedFile={attachedFile}
          onSelectFile={() => fileInputRef.current?.click()}
          onRemoveFile={() => setAttachedFile(null)}
          isSubmitting={isSubmitting}
          isSubmitted={isSubmitted}
          onSubmit={handleSubmit}
          onProceedNextStop={handleProceedNextStop}
        />
      </div>
    </>
  );
}

/* ─── Mobile Report Canvas Component ─── */
function MobileReportCanvas({
  selectedIssue,
  onSelectIssue,
  description,
  onChangeDescription,
  attachedFile,
  onSelectFile,
  onRemoveFile,
  isSubmitting,
  isSubmitted,
  onSubmit,
  onProceedNextStop,
}: {
  selectedIssue: string;
  onSelectIssue: (id: string) => void;
  description: string;
  onChangeDescription: (val: string) => void;
  attachedFile: { name: string; url: string } | null;
  onSelectFile: () => void;
  onRemoveFile: () => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onProceedNextStop: () => void;
}) {
  return (
    <div
      id="driver-report-mobile-canvas"
      className="relative bg-white overflow-hidden shadow-2xl"
      style={{
        width: 412,
        height: 917,
        fontFamily: "'Poppins', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* ── 1. screen-header (top: 0, height: 55/60) ── */}
      <header
        id="screen-header"
        className="absolute left-0 top-0 flex flex-row justify-between items-center bg-[#202D2D]"
        style={{
          width: 412,
          height: isSubmitted ? 55 : 60,
          padding: "14px 16px",
          boxSizing: "border-box",
        }}
      >
        <div className="flex flex-row items-center" style={{ gap: 8 }}>
          {!isSubmitted && (
            <Link
              href="/driver/current-stop"
              className="flex items-center justify-center rounded-md hover:bg-white/10"
              style={{ width: 32, height: 32, padding: 6, boxSizing: "border-box" }}
              aria-label="Back to Current Stop"
            >
              <ArrowLeftIcon className="w-[20px] h-[20px] text-white" />
            </Link>
          )}
          <span className="text-white font-bold" style={{ fontSize: 18, lineHeight: "27px" }}>
            {isSubmitted ? "Stop Recorded" : "Report Issue"}
          </span>
        </div>

        {!isSubmitted && (
          <div
            id="connectivity-pill"
            className="flex flex-row items-center bg-white border border-[#CBD5E1] rounded-full"
            style={{ width: 67, height: 25, padding: "4px 8px", gap: 6, boxSizing: "border-box" }}
          >
            <span className="rounded-full bg-[#22C55E]" style={{ width: 8, height: 8 }} />
            <span className="text-[#22C55E] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
              Online
            </span>
          </div>
        )}
      </header>

      {/* ── REPORT SUBMITTED SUCCESS VIEW ── */}
      {isSubmitted ? (
        <>
          {/* Rectangle 3: Report Submitted Banner (top: 154, left: 16, 379x268) */}
          <div
            id="rectangle-3-report-submitted"
            className="absolute bg-[rgba(34,197,94,0.09)] border border-[rgba(34,197,94,0.37)] rounded-[8px]"
            style={{ top: 154, left: 16, width: 379, height: 268, boxSizing: "border-box" }}
          >
            {/* Report Submitted text */}
            <span
              className="absolute font-extrabold text-[#22C55E]"
              style={{ top: 36, left: 63, width: 257, height: 42, fontSize: 28, lineHeight: "42px" }}
            >
              Report Submitted
            </span>
          </div>

          {/* success-circle (top: 267, left: 161, 80x80) */}
          <div
            id="success-circle"
            className="absolute flex flex-col justify-center items-center bg-[#ECFDF5] border-2 border-[#22C55E] rounded-[36px]"
            style={{ top: 267, left: 161, width: 80, height: 80, boxSizing: "border-box" }}
          >
            <CheckIcon className="w-[32px] h-[32px] text-[#22C55E]" />
          </div>

          {/* Primary Button: button-Proceed to Next Stop (top: 756, left: 11, 390x52) */}
          <div
            id="action-buttons-frame"
            className="absolute flex flex-col items-center"
            style={{ top: 756, left: 11, width: 390, height: 52 }}
          >
            <button
              id="btn-proceed-next-stop"
              type="button"
              onClick={onProceedNextStop}
              className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
              style={{ width: 390, height: 52, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
            >
              <ArrowRightIcon className="w-[18px] h-[18px] text-[#F9FAFB]" />
              <span className="text-[#F9FAFB] font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                Proceed to Next Stop
              </span>
            </button>
          </div>

          {/* Bottom Navigation frame (top: 833 / 837) */}
          <nav
            id="bottom-nav-canvas"
            aria-label="Driver navigation"
            className="absolute flex flex-row items-center"
            style={{ top: 833, left: 0, width: 412, height: 64, boxSizing: "border-box" }}
          >
            <Link
              id="tab-my-run"
              href="/driver/today-run"
              className="absolute flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
              style={{ top: 4, left: 0, width: 112, height: 43, gap: 4 }}
            >
              <RouteIcon className="w-[22px] h-[22px] text-[#202D2D]" />
              <span className="text-[#202D2D] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                My Run
              </span>
            </Link>

            <Link
              id="tab-current-stop"
              href="/driver/current-stop"
              className="absolute flex flex-col justify-center items-center border-none bg-transparent cursor-pointer no-underline"
              style={{ top: 0, left: 149, width: 114, height: 43, gap: 4 }}
            >
              <NavigationIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Current Stop
              </span>
            </Link>

            {/* Tab 3: Report (ACTIVE) */}
            <div
              id="tab-report"
              className="absolute flex flex-col justify-center items-center"
              style={{ top: 0, left: 300, width: 112, height: 52, gap: 4 }}
            >
              <AlertTriangleIcon className="w-[22px] h-[22px] text-[#485563]" />
              <span className="text-[#485563] font-semibold" style={{ fontSize: 11, lineHeight: "16px" }}>
                Report
              </span>
              <span
                className="block bg-[#1D4ED8]"
                style={{ width: 38, height: 3, borderRadius: 1.5 }}
              />
            </div>
          </nav>

          {/* Home indicator pill (top: 909, left: 131, width: 150) */}
          <div
            aria-hidden="true"
            className="absolute bg-[#202D2D] rounded-full"
            style={{ width: 150, height: 5, left: 131, top: 909 }}
          />
        </>
      ) : (
        /* ── REPORT ISSUE FORM VIEW ── */
        <>
          <div
            className="absolute flex flex-col items-start"
            style={{ top: 72, left: 16, width: 380, gap: 2 }}
          >
            <span className="text-[#485563] font-bold" style={{ fontSize: 12, lineHeight: "18px" }}>
              REPORT ISSUE FOR CURRENT STOP
            </span>
            <span className="text-[#202D2D] font-extrabold truncate" style={{ fontSize: 18, lineHeight: "26px", width: 380 }}>
              OUT001 / Colpetty Retailer
            </span>
          </div>

          <form onSubmit={onSubmit}>
            <div
              className="absolute flex flex-col items-start"
              style={{ top: 130, left: 16, width: 380, gap: 8 }}
            >
              <span className="text-[#485563] font-bold" style={{ fontSize: 12, lineHeight: "18px" }}>
                CATEGORY
              </span>

              <div className="flex flex-col items-start" style={{ width: 380, gap: 8 }}>
                {ISSUE_TYPES.map((issue) => {
                  const isSelected = selectedIssue === issue.id;
                  return (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => onSelectIssue(issue.id)}
                      className="flex flex-row justify-between items-center rounded-[12px] cursor-pointer transition-all border-none text-left"
                      style={{
                        width: 380,
                        height: 48,
                        padding: "10px 14px",
                        boxSizing: "border-box",
                        background: isSelected ? "rgba(249, 115, 22, 0.06)" : "#FFFFFF",
                        border: isSelected ? "1px solid #F97316" : "1px solid #CBD5E1",
                      }}
                    >
                      <div className="flex flex-row items-center" style={{ gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{issue.icon}</span>
                        <span
                          className="font-semibold"
                          style={{ fontSize: 13, lineHeight: "18px", color: isSelected ? "#202D2D" : "#485563" }}
                        >
                          {issue.label}
                        </span>
                      </div>
                      <div
                        className="box-border rounded-full"
                        style={{
                          width: 16,
                          height: 16,
                          background: isSelected ? "#F97316" : "#FFFFFF",
                          border: isSelected ? "2px solid #F97316" : "2px solid #CBD5E1",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="absolute flex flex-col items-start"
              style={{ top: 450, left: 16, width: 380, gap: 10 }}
            >
              <span className="text-[#485563] font-bold" style={{ fontSize: 12, lineHeight: "18px" }}>
                DETAILS & EVIDENCE
              </span>

              <textarea
                rows={3}
                value={description}
                onChange={(e) => onChangeDescription(e.target.value)}
                placeholder="Add specific details or notes..."
                className="w-full p-3 bg-[#F9FAFB] border border-[#CBD5E1] rounded-[12px] text-xs text-[#202D2D] focus:outline-none focus:border-[#F97316]"
                style={{ width: 380, boxSizing: "border-box" }}
              />

              {attachedFile ? (
                <div
                  className="flex flex-row items-center justify-between bg-green-50 border border-green-400 rounded-[12px]"
                  style={{ width: 380, height: 48, padding: "8px 12px", boxSizing: "border-box" }}
                >
                  <div className="flex flex-row items-center min-w-0" style={{ gap: 8 }}>
                    <img
                      src={attachedFile.url}
                      alt="Photo preview"
                      className="w-8 h-8 rounded object-cover border border-green-300 shrink-0"
                    />
                    <span className="text-green-800 font-bold text-xs truncate" style={{ maxWidth: 220 }}>
                      {attachedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveFile}
                    className="text-xs font-bold text-red-600 bg-white border border-red-200 rounded px-2 py-1 cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSelectFile}
                  className="flex flex-row justify-center items-center bg-[#F9FAFB] border border-dashed border-[#CBD5E1] text-[#485563] rounded-[12px] cursor-pointer transition-colors"
                  style={{ width: 380, height: 44, gap: 8, boxSizing: "border-box" }}
                >
                  <CameraIcon className="w-[18px] h-[18px]" />
                  <span className="font-semibold" style={{ fontSize: 12, lineHeight: "18px" }}>
                    Attach Photo Evidence (Upload File)
                  </span>
                </button>
              )}
            </div>

            <div
              className="absolute flex flex-col items-center"
              style={{ top: 720, left: 16, width: 380, gap: 10 }}
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-row justify-center items-center bg-[#F97316] hover:bg-[#ea6c0a] active:scale-[0.98] rounded-[12px] border-none cursor-pointer transition-all duration-200"
                style={{ width: 380, height: 52, padding: "0 16px", gap: 8, boxSizing: "border-box" }}
              >
                <AlertTriangleIcon className="w-[18px] h-[18px] text-white" />
                <span className="text-white font-bold" style={{ fontSize: 15, lineHeight: "22px" }}>
                  {isSubmitting ? "Submitting..." : "Submit Issue Report"}
                </span>
              </button>

              <Link
                href="/driver/current-stop"
                className="flex flex-row justify-center items-center border-2 border-[#202D2D] hover:bg-[#202D2D] hover:text-white rounded-[12px] cursor-pointer transition-all duration-200 no-underline"
                style={{ width: 380, height: 48, padding: "0 16px", boxSizing: "border-box" }}
              >
                <span className="text-[#202D2D] hover:text-white font-bold" style={{ fontSize: 14, lineHeight: "20px" }}>
                  Cancel
                </span>
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
