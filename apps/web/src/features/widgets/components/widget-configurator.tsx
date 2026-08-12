"use client";

import { useState, useMemo } from "react";
import { Button, Card, Input } from "@attendly/ui/components";
import { toast } from "sonner";
import { Copy, Check, ExternalLink } from "lucide-react";

type Toggle = {
  key: string;
  label: string;
  defaultOn: boolean;
};

type WidgetConfiguratorProps = {
  eventId: string;
  widgetType: "agenda" | "speakers" | "register";
  title: string;
  description: string;
  toggles: Toggle[];
  extraControls?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
};

export function WidgetConfigurator({
  eventId,
  widgetType,
  title,
  description,
  toggles,
  extraControls,
}: WidgetConfiguratorProps) {
  const [accent, setAccent] = useState("3b82f6");
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  const [toggleState, setToggleState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(toggles.map((t) => [t.key, t.defaultOn]))
  );
  const [extraState, setExtraState] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (extraControls ?? []).map((c) => [c.key, c.options[0]?.value ?? ""])
    )
  );
  const [copied, setCopied] = useState(false);

  const embedUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    params.set("accent", accent);
    params.set("theme", theme);
    for (const toggle of toggles) {
      params.set(toggle.key, toggleState[toggle.key] ? "1" : "0");
    }
    for (const control of extraControls ?? []) {
      params.set(control.key, extraState[control.key] ?? "");
    }
    return `${window.location.origin}/embed/${eventId}/${widgetType}?${params.toString()}`;
  }, [accent, theme, toggleState, extraState, eventId, widgetType, toggles, extraControls]);

  const embedCode = useMemo(() => {
    return `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border: none; border-radius: 8px;"\n  title="${title}"\n></iframe>`;
  }, [embedUrl, title]);

  function handleCopy() {
    navigator.clipboard.writeText(embedCode).then(() => {
      toast("Embed code copied!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleAccentInput(value: string) {
    const cleaned = value.replace(/^#/, "");
    if (/^[0-9a-fA-F]{0,6}$/.test(cleaned)) {
      setAccent(cleaned);
    }
  }

  const activeClass = "border-primary bg-primary/10 text-primary font-medium";
  const inactiveClass = "hover:bg-muted";

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: Controls panel */}
        <div className="space-y-4">
          {/* Accent color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={`#${accent}`}
                onChange={(e) => setAccent(e.target.value.replace("#", ""))}
                className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <Input
                value={`#${accent}`}
                onChange={(e) => handleAccentInput(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Theme</label>
            <div className="flex gap-1">
              {(["light", "dark", "auto"] as const).map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  className={theme === t ? activeClass : inactiveClass}
                  onClick={() => setTheme(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          {toggles.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Display Options
              </label>
              <div className="space-y-2">
                {toggles.map((toggle) => (
                  <label
                    key={toggle.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={toggleState[toggle.key] ?? false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setToggleState((prev) => ({
                          ...prev,
                          [toggle.key]: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    {toggle.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Extra controls */}
          {extraControls?.map((control) => (
            <div key={control.key}>
              <label className="mb-1.5 block text-sm font-medium">
                {control.label}
              </label>
              <div className="flex gap-1">
                {control.options.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    className={
                      extraState[control.key] === option.value
                        ? activeClass
                        : inactiveClass
                    }
                    onClick={() =>
                      setExtraState((prev) => ({
                        ...prev,
                        [control.key]: option.value,
                      }))
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Live preview */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Open in new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <iframe
              src={embedUrl}
              className="h-[500px] w-full rounded"
              title={`${title} preview`}
            />
          </div>
        </div>
      </div>

      {/* Bottom: Embed code section */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Embed Code</span>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border bg-muted/30 p-4 font-mono text-sm">
          {embedCode}
        </pre>
      </div>
    </Card>
  );
}
