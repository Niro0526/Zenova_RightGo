"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DriverReportPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/driver/history?tab=reports");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 text-sm">
      Redirecting to Report History...
    </div>
  );
}

