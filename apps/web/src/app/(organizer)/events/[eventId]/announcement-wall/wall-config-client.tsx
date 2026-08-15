"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Plus, Trash2, Loader2, Pencil, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Textarea,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import {
  upsertWallConfig,
  createCustomSlide,
  updateCustomSlide,
  deleteCustomSlide,
} from "@/features/announcement-wall/actions";
import type { WallConfig, CustomSlide } from "@/features/announcement-wall/queries";

type Defaults = Omit<WallConfig, "id" | "event_id" | "created_at" | "updated_at">;

interface Props {
  eventId: string;
  config: WallConfig | null;
  defaults: Defaults;
  customSlides: CustomSlide[];
  wallUrl: string | null;
  streamUrl: string | null;
}

const SLIDE_TYPES = [
  {
    key: "show_event_overview" as const,
    label: "Event Overview",
    description: "Event name, dates, location with QR code",
  },
  {
    key: "show_announcements" as const,
    label: "Announcements",
    description: "Sent announcements displayed as slides",
  },
  {
    key: "show_upcoming_sessions" as const,
    label: "Upcoming Sessions",
    description: "Sessions starting within the next 2 hours",
  },
  {
    key: "show_sponsors" as const,
    label: "Sponsors",
    description: "Sponsor logos and names by tier",
  },
  {
    key: "show_polls" as const,
    label: "Live Polls",
    description: "Active polls with voting QR code",
  },
  {
    key: "show_custom_slides" as const,
    label: "Custom Slides",
    description: "Your own custom content slides",
  },
];

export function WallConfigClient({
  eventId,
  config,
  defaults,
  customSlides: initialSlides,
  wallUrl,
  streamUrl,
}: Props) {
  // Merge defaults with saved config
  const merged = { ...defaults, ...config };

  const [rotationSpeed, setRotationSpeed] = useState(merged.rotation_speed);
  const [theme, setTheme] = useState<"dark" | "light">(merged.theme);
  const [slideToggles, setSlideToggles] = useState<Record<string, boolean>>(() => {
    const toggles: Record<string, boolean> = {};
    for (const st of SLIDE_TYPES) {
      toggles[st.key] = merged[st.key];
    }
    return toggles;
  });

  const [activityStreamEnabled, setActivityStreamEnabled] = useState(
    merged.activity_stream_enabled ?? false
  );

  const [slides, setSlides] = useState<CustomSlide[]>(initialSlides);
  const [isSaving, startSaveTransition] = useTransition();
  const [isSlideAction, startSlideTransition] = useTransition();

  // Slide form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<CustomSlide | null>(null);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideBody, setSlideBody] = useState("");
  const [slideBgColor, setSlideBgColor] = useState("#1e293b");

  const { confirm, dialog: confirmDialog } = useConfirm();

  function openCreateModal() {
    setEditingSlide(null);
    setSlideTitle("");
    setSlideBody("");
    setSlideBgColor("#1e293b");
    setModalOpen(true);
  }

  function openEditModal(slide: CustomSlide) {
    setEditingSlide(slide);
    setSlideTitle(slide.title);
    setSlideBody(slide.body ?? "");
    setSlideBgColor(slide.bg_color || "#1e293b");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSlide(null);
  }

  function handleSaveSettings() {
    startSaveTransition(async () => {
      try {
        await upsertWallConfig(eventId, {
          rotation_speed: rotationSpeed,
          theme,
          ...slideToggles,
          activity_stream_enabled: activityStreamEnabled,
        });
        toast.success("Wall settings saved");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save settings"
        );
      }
    });
  }

  function handleSlideSubmit() {
    if (!slideTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    startSlideTransition(async () => {
      try {
        if (editingSlide) {
          await updateCustomSlide(editingSlide.id, eventId, {
            title: slideTitle.trim(),
            body: slideBody.trim() || undefined,
            bg_color: slideBgColor,
          });
          setSlides((prev) =>
            prev.map((s) =>
              s.id === editingSlide.id
                ? { ...s, title: slideTitle.trim(), body: slideBody.trim() || null, bg_color: slideBgColor }
                : s
            )
          );
          toast.success("Slide updated");
        } else {
          const newSlide = await createCustomSlide(eventId, {
            title: slideTitle.trim(),
            body: slideBody.trim() || undefined,
            bg_color: slideBgColor,
          });
          setSlides((prev) => [...prev, newSlide as CustomSlide]);
          toast.success("Slide created");
        }
        closeModal();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save slide"
        );
      }
    });
  }

  async function handleDeleteSlide(slide: CustomSlide) {
    const ok = await confirm({
      title: "Delete Slide",
      description: `Delete "${slide.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    startSlideTransition(async () => {
      try {
        await deleteCustomSlide(slide.id, eventId);
        setSlides((prev) => prev.filter((s) => s.id !== slide.id));
        toast.success("Slide deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete slide"
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Announcement Wall</h2>
          <p className="text-sm text-muted-foreground">
            Configure a live display wall for your event with rotating slides
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wallUrl && (
            <Button variant="outline" asChild>
              <a href={wallUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview Wall
              </a>
            </Button>
          )}
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>

      {/* Display Settings */}
      <section className="space-y-4 rounded-lg border p-6">
        <h3 className="text-lg font-medium">Display Settings</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Rotation Speed (seconds)
            </label>
            <Input
              type="number"
              min={5}
              max={120}
              value={rotationSpeed}
              onChange={(e) =>
                setRotationSpeed(
                  Math.max(5, Math.min(120, Number(e.target.value) || 5))
                )
              }
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              How long each slide is shown (5-120 seconds)
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "dark" | "light")}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </section>

      {/* Slide Types */}
      <section className="space-y-4 rounded-lg border p-6">
        <h3 className="text-lg font-medium">Slide Types</h3>
        <p className="text-sm text-muted-foreground">
          Choose which slide types to include in the rotation
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SLIDE_TYPES.map((st) => (
            <label
              key={st.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
            >
              <input
                type="checkbox"
                checked={slideToggles[st.key] ?? true}
                onChange={(e) =>
                  setSlideToggles((prev) => ({
                    ...prev,
                    [st.key]: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <div>
                <span className="text-sm font-medium">{st.label}</span>
                <p className="text-xs text-muted-foreground">
                  {st.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Custom Slides */}
      <section className="space-y-4 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Custom Slides</h3>
            <p className="text-sm text-muted-foreground">
              Add your own content slides to the rotation
            </p>
          </div>
          <Button onClick={openCreateModal} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Slide
          </Button>
        </div>

        {slides.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No custom slides yet. Add slides for WiFi info, keynote
              highlights, or any custom content.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <div
                  className="h-10 w-10 shrink-0 rounded"
                  style={{ backgroundColor: slide.bg_color || "#1e293b" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{slide.title}</p>
                  {slide.body && (
                    <p className="truncate text-xs text-muted-foreground">
                      {slide.body}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(slide)}
                    disabled={isSlideAction}
                    aria-label={`Edit ${slide.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSlide(slide)}
                    disabled={isSlideAction}
                    aria-label={`Delete ${slide.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity Stream */}
      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h3 className="text-lg font-medium">Activity Stream</h3>
          <p className="text-sm text-muted-foreground">
            Embeddable real-time feed for your event website
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={activityStreamEnabled}
            onChange={(e) => setActivityStreamEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div>
            <span className="text-sm font-medium">Enable Activity Stream</span>
            <p className="text-xs text-muted-foreground">
              Show a scrollable feed of event activity that can be embedded on
              external websites
            </p>
          </div>
        </label>

        {activityStreamEnabled && streamUrl && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a href={streamUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview Stream
                </a>
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">Embed Code</label>
              <p className="mb-2 text-xs text-muted-foreground">
                Paste this into your event website HTML
              </p>
              <EmbedCodeSnippet streamUrl={streamUrl} />
            </div>
          </div>
        )}
      </section>

      {/* Slide Form Modal */}
      {modalOpen && (
        <ModalOverlay onClose={closeModal}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {editingSlide ? "Edit Slide" : "Add Custom Slide"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={slideTitle}
                  onChange={(e) => setSlideTitle(e.target.value)}
                  placeholder="e.g. WiFi Information"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Body</label>
                <Textarea
                  value={slideBody}
                  onChange={(e) => setSlideBody(e.target.value)}
                  placeholder="Slide content (optional)"
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Background Color</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={slideBgColor}
                    onChange={(e) => setSlideBgColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-input"
                  />
                  <Input
                    value={slideBgColor}
                    onChange={(e) => setSlideBgColor(e.target.value)}
                    placeholder="#1e293b"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSlideAction}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSlideSubmit}
                disabled={isSlideAction || !slideTitle.trim()}
              >
                {isSlideAction ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingSlide ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}

function EmbedCodeSnippet({ streamUrl }: { streamUrl: string }) {
  const [copied, setCopied] = useState(false);
  const embedCode = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}${streamUrl}/embed" width="400" height="600" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  function handleCopy() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <pre className="rounded-lg border bg-muted/50 p-3 text-xs overflow-x-auto">
        {embedCode}
      </pre>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="absolute right-2 top-2"
      >
        {copied ? (
          <>
            <Check className="mr-1 h-3 w-3" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
