"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { ReadinessCheck } from "../queries";

const statusIcons = {
  pass: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  fail: <XCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
};

const statusLabels = {
  pass: "Done",
  fail: "Required",
  warning: "Recommended",
};

export function ReadinessChecklist({
  checks,
  requiredPassed,
  requiredTotal,
}: {
  checks: ReadinessCheck[];
  requiredPassed: number;
  requiredTotal: number;
}) {
  const allRequiredPassed = requiredPassed === requiredTotal;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {requiredPassed} of {requiredTotal} required checks passed
            </span>
            {allRequiredPassed && (
              <span className="text-xs text-emerald-600 font-medium">Ready to publish</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                allRequiredPassed ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${(requiredPassed / requiredTotal) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {checks.map((check) => (
          <div key={check.id} className="flex items-center gap-3 p-4">
            {statusIcons[check.status]}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{check.name}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    check.status === "pass"
                      ? "bg-emerald-50 text-emerald-700"
                      : check.status === "fail"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {statusLabels[check.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
            </div>
            {check.status !== "pass" && (
              <Link
                href={check.fixHref}
                className="text-xs font-medium text-[oklch(0.445_0.107_195)] hover:underline shrink-0"
              >
                Fix
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
