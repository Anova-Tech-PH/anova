"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Input, Textarea, Button } from "@/shared/components/ui";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import {
  Calendar,
  MapPin,
  FileText,
  Check,
  Link,
  Globe,
  Video,
  Building2,
  Image,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

type Step = "basics" | "location" | "details";

const STEPS: { key: Step; label: string; icon: typeof Calendar }[] = [
  { key: "basics", label: "Basics", icon: Calendar },
  { key: "location", label: "Location", icon: MapPin },
  { key: "details", label: "Details", icon: FileText },
];

export default function NewEventPage() {
  const [step, setStep] = useState<Step>("basics");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    end_date: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    venue_name: "",
    venue_address: "",
    is_virtual: false,
    virtual_url: "",
    cover_image: "",
  });

  function updateForm(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "title"
        ? {
            slug: (value as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
          }
        : {}),
    }));
  }

  async function handleSubmit() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!membership) {
      toast.error("No organization found");
      setLoading(false);
      return;
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        organization_id: membership.organization_id,
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        timezone: form.timezone,
        venue_name: form.venue_name || null,
        venue_address: form.venue_address || null,
        is_virtual: form.is_virtual,
        virtual_url: form.virtual_url || null,
        cover_image: form.cover_image || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Event created!");
    router.push(`/events/${event.id}`);
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span>Events</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium">Create New</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold font-[family-name:var(--font-display)]">
              Create Event
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up your event in a few steps.
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Step indicator */}
        <div className="border-b bg-muted/30 px-6 py-5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isCompleted = i < currentStepIndex;
              const isCurrent = s.key === step;
              const isFuture = i > currentStepIndex;
              const StepIcon = isCompleted ? Check : s.icon;

              return (
                <div key={s.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isCurrent
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_oklch(0.445_0.107_195/0.15)]"
                            : "border-muted-foreground/25 bg-background text-muted-foreground/50"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                      )}
                      <StepIcon className="relative h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isCompleted
                          ? "text-emerald-600"
                          : isCurrent
                            ? "text-primary"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="mx-3 mb-6 h-0.5 flex-1 rounded-full bg-muted-foreground/15">
                      <div
                        className={`h-full rounded-full bg-emerald-500 transition-all duration-500 ${
                          i < currentStepIndex ? "w-full" : "w-0"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <CardContent className="p-6">
          {/* Step: Basics */}
          {step === "basics" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="border-dashed">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-primary" />
                    Event Information
                  </CardTitle>
                  <CardDescription>
                    Start with the basic details of your event.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      Event name
                    </label>
                    <Input
                      type="text"
                      value={form.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      placeholder="My Awesome Conference"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <Link className="h-3.5 w-3.5 text-muted-foreground" />
                      URL slug
                    </label>
                    <Input
                      type="text"
                      value={form.slug}
                      onChange={(e) => updateForm("slug", e.target.value)}
                      placeholder="my-awesome-conference"
                    />
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {form.slug
                        ? `anova.events/${form.slug}`
                        : "anova.events/your-event-slug"}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Start date
                      </label>
                      <Input
                        type="datetime-local"
                        value={form.start_date}
                        onChange={(e) =>
                          updateForm("start_date", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        End date
                      </label>
                      <Input
                        type="datetime-local"
                        value={form.end_date}
                        onChange={(e) => updateForm("end_date", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Button Area */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setStep("location")}
                  disabled={!form.title || !form.start_date || !form.end_date}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Location */}
          {step === "location" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="border-dashed">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-primary" />
                    Event Location
                  </CardTitle>
                  <CardDescription>
                    Where will your event take place?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Styled toggle switch for virtual event */}
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <Video className="h-4 w-4 text-primary" />
                      <div>
                        <label
                          htmlFor="is_virtual"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Virtual event
                        </label>
                        <p className="text-xs text-muted-foreground">
                          This event will be hosted online
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        id="is_virtual"
                        checked={form.is_virtual}
                        onChange={(e) =>
                          updateForm("is_virtual", e.target.checked)
                        }
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-muted-foreground/20 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2" />
                    </label>
                  </div>

                  {form.is_virtual ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-sm font-medium">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Virtual event URL
                      </label>
                      <Input
                        type="url"
                        value={form.virtual_url}
                        onChange={(e) =>
                          updateForm("virtual_url", e.target.value)
                        }
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-sm font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          Venue name
                        </label>
                        <Input
                          type="text"
                          value={form.venue_name}
                          onChange={(e) =>
                            updateForm("venue_name", e.target.value)
                          }
                          placeholder="Convention Center"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-sm font-medium">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          Address
                        </label>
                        <Input
                          type="text"
                          value={form.venue_address}
                          onChange={(e) =>
                            updateForm("venue_address", e.target.value)
                          }
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Button Area */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep("basics")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep("details")}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === "details" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="border-dashed">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    Additional Details
                  </CardTitle>
                  <CardDescription>
                    Add a description and cover image for your event.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Description
                    </label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        updateForm("description", e.target.value)
                      }
                      rows={4}
                      placeholder="Tell attendees about your event..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium">
                      <Image className="h-3.5 w-3.5 text-muted-foreground" />
                      Cover image URL
                    </label>
                    <Input
                      type="url"
                      value={form.cover_image}
                      onChange={(e) =>
                        updateForm("cover_image", e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Button Area */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep("location")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={loading}
                  className="gap-2 shadow-lg shadow-primary/20"
                >
                  <Sparkles className="h-4 w-4" />
                  {loading ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
