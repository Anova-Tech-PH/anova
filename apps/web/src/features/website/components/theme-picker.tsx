"use client";

import type { WebsiteTheme } from "../types";

interface ThemePickerProps {
  theme: WebsiteTheme;
  onChange: (theme: WebsiteTheme) => void;
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "system-ui", label: "System UI" },
  { value: "ui-monospace", label: "Monospace" },
];

export function ThemePicker({ theme, onChange }: ThemePickerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Theme</h3>
      <div className="flex items-center gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.primary_color}
              onChange={(e) =>
                onChange({ ...theme, primary_color: e.target.value })
              }
              className="h-9 w-12 cursor-pointer rounded border p-0.5"
            />
            <span className="font-mono text-xs text-muted-foreground">
              {theme.primary_color}
            </span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Font
          </label>
          <select
            value={theme.font}
            onChange={(e) => onChange({ ...theme, font: e.target.value })}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
