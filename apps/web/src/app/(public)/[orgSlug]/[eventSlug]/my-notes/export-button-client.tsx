"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function ExportButtonClient() {
  const [showToast, setShowToast] = useState(false);

  function handleExport() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        type="button"
      >
        <Download className="h-4 w-4" />
        Export
      </button>
      {showToast && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border bg-card px-4 py-2 text-sm shadow-lg whitespace-nowrap">
          Export coming soon
        </div>
      )}
    </div>
  );
}
