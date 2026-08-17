"use client";

import { useState } from "react";
import { Input, Button, Card } from "@attendly/ui/components";
import { Sparkles, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import { LocationPicker, type LocationData } from "@/shared/components/location-picker";
import { TagInput } from "@/shared/components/tag-input";
import { ImageUpload } from "@/shared/components/image-upload";
import { SearchableSelect } from "@/shared/components/searchable-select";
import { TIMEZONE_OPTIONS, toLocalInput } from "@/shared/utils/timezones";

export type EventFormData = {
  title: string;
  abbreviation: string;
  start_date: string;
  end_date: string;
  timezone: string;
  max_attendees: number | null;
  location_data: LocationData;
  description: string;
  welcome_message: string;
  airport_ride_sharing: "enabled" | "provided" | "none";
  event_website_url: string;
  logo: string;
  cover_image: string;
  twitter_hashtags: string;
  post_event_summary: boolean;
  generate_interests: boolean;
  organization_name: string;
  attendee_origin: "local" | "national" | "global" | "";
  topic_tags: string[];
  organization_type: string[];
  event_type: string;
  event_type_other: string;
};

function CharCounter({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-xs text-muted-foreground">
      {value.length}/{max}
    </span>
  );
}

function RadioCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          }`}
        >
          {selected && (
            <div className="flex h-full items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          )}
        </div>
        <div>{children}</div>
      </div>
    </button>
  );
}

function CheckboxOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-muted-foreground/40"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

const ORG_TYPES = ["Association", "Nonprofit", "Government", "Corporate", "University", "Other"];
const EVENT_TYPES = [
  "Academic conference",
  "Business/Professional conference",
  "Expo or trade show",
  "Internal event or meeting",
  "Workshop or seminar",
  "Career fair",
  "Other",
];

const STEPS = [
  { label: "Basics", description: "Event details" },
  { label: "Welcome", description: "Attendee greeting" },
  { label: "Branding", description: "Look & feel" },
  { label: "Analytics", description: "Reports & engagement" },
  { label: "Promote", description: "Get the word out" },
];

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => onStepClick(index)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${
                  index < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : index === currentStep
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/50"
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-medium ${
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">{step.description}</p>
              </div>
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step Content Components ──

function StepBasics({
  form,
  update,
}: {
  form: EventFormData;
  update: <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-semibold">Basic Information</h2>
      <p className="mb-5 text-sm text-muted-foreground">Start with the essential details of your event.</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Event Name <span className="text-destructive">*</span>
            </label>
            <CharCounter value={form.title} max={150} />
          </div>
          <Input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value.slice(0, 150))}
            placeholder="My Awesome Conference"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Event Name Abbreviation</label>
            <CharCounter value={form.abbreviation} max={30} />
          </div>
          <Input
            type="text"
            value={form.abbreviation}
            onChange={(e) => update("abbreviation", e.target.value.slice(0, 30))}
            placeholder="MAC 2026"
          />
          <p className="text-xs text-muted-foreground">
            This will be used in places where the full event name does not fit.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Start Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              End Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => update("end_date", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Number of Attendees</label>
          <Input
            type="number"
            value={form.max_attendees ?? ""}
            onChange={(e) =>
              update("max_attendees", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="e.g. 500"
            min={1}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location</label>
          <LocationPicker
            value={form.location_data}
            onChange={(data) => update("location_data", data)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Time zone</label>
          <SearchableSelect
            value={form.timezone}
            onChange={(value) => update("timezone", value)}
            options={TIMEZONE_OPTIONS}
            placeholder="Select timezone..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <RichTextEditor
            content={form.description}
            onChange={(html) => update("description", html)}
            placeholder="Tell attendees about your event... This description is visible to all users, making it a good marketing opportunity!"
          />
        </div>
      </div>
    </Card>
  );
}

function StepWelcome({
  form,
  update,
}: {
  form: EventFormData;
  update: <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold">Welcome Attendees</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Send a welcome message to users when they first join the app!
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Welcome message</label>
            <CharCounter value={form.welcome_message} max={10000} />
          </div>
          <textarea
            value={form.welcome_message}
            onChange={(e) => update("welcome_message", e.target.value.slice(0, 10000))}
            rows={4}
            placeholder="Welcome to our event! You can use this app to see the agenda, find sessions, and connect with other attendees."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold">Airport Ride Sharing</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Do you have attendees flying to your event? Help them arrange ridesharing groups.
        </p>

        <div className="space-y-2">
          <RadioCard
            selected={form.airport_ride_sharing === "enabled"}
            onClick={() => update("airport_ride_sharing", "enabled")}
          >
            Enable ride sharing for attendees to share rides between airports and the event venue
          </RadioCard>
          <RadioCard
            selected={form.airport_ride_sharing === "provided"}
            onClick={() => update("airport_ride_sharing", "provided")}
          >
            The event has provided transportation between airports and the event venue
          </RadioCard>
          <RadioCard
            selected={form.airport_ride_sharing === "none"}
            onClick={() => update("airport_ride_sharing", "none")}
          >
            We don&apos;t have attendees arriving from airports
          </RadioCard>
        </div>
      </Card>
    </div>
  );
}

function StepBranding({
  form,
  update,
}: {
  form: EventFormData;
  update: <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-semibold">Event Branding</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Customize how your event looks to attendees.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Event Website URL</label>
          <Input
            type="url"
            value={form.event_website_url}
            onChange={(e) => update("event_website_url", e.target.value)}
            placeholder="https://myevent.com"
          />
          <p className="text-xs text-muted-foreground">Add if you have one.</p>
        </div>

        <ImageUpload
          value={form.logo}
          onChange={(url) => update("logo", url)}
          label="Logo"
          folder="logos"
        />

        <ImageUpload
          value={form.cover_image}
          onChange={(url) => update("cover_image", url)}
          label="Cover image"
          folder="covers"
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Twitter Hashtag(s)</label>
          <Input
            type="text"
            value={form.twitter_hashtags}
            onChange={(e) => update("twitter_hashtags", e.target.value)}
            placeholder="e.g. #MyEvent2026, #Conference"
          />
          <p className="text-xs text-muted-foreground">
            You can add multiple hashtags separated by commas.
          </p>
        </div>
      </div>
    </Card>
  );
}

function StepAnalytics({
  form,
  update,
}: {
  form: EventFormData;
  update: <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold">Post-event Analytics and Highlights Summary</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          We can provide a detailed analytics report after the event ends.
        </p>

        <div className="space-y-2">
          <RadioCard
            selected={form.post_event_summary}
            onClick={() => update("post_event_summary", true)}
          >
            Yes, email me the summary after the event ends
          </RadioCard>
          <RadioCard
            selected={!form.post_event_summary}
            onClick={() => update("post_event_summary", false)}
          >
            No, I do not need the summary
          </RadioCard>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold">Spark Conversation at Your Event</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Drive engagement and meaningful connections by generating interests and discussion topics specific to your event.
        </p>

        <div className="space-y-2">
          <RadioCard
            selected={form.generate_interests}
            onClick={() => update("generate_interests", true)}
          >
            Yes, generate event-specific interests and topics to enhance attendee engagement
          </RadioCard>
          <RadioCard
            selected={!form.generate_interests}
            onClick={() => update("generate_interests", false)}
          >
            No, I don&apos;t need event-specific interests and topics
          </RadioCard>
        </div>
      </Card>
    </div>
  );
}

function StepPromote({
  form,
  update,
  toggleOrgType,
}: {
  form: EventFormData;
  update: <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => void;
  toggleOrgType: (type: string) => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-semibold">Let&apos;s Promote Your Event</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Share some details about your event so we can help you get the word out.
      </p>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Organization name</label>
            <CharCounter value={form.organization_name} max={100} />
          </div>
          <Input
            type="text"
            value={form.organization_name}
            onChange={(e) => update("organization_name", e.target.value.slice(0, 100))}
            placeholder="What is the name of your organization?"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Where do most of your attendees come from?</label>
          <div className="space-y-2">
            <RadioCard
              selected={form.attendee_origin === "local"}
              onClick={() => update("attendee_origin", "local")}
            >
              Local regions
            </RadioCard>
            <RadioCard
              selected={form.attendee_origin === "national"}
              onClick={() => update("attendee_origin", "national")}
            >
              Across the nation
            </RadioCard>
            <RadioCard
              selected={form.attendee_origin === "global"}
              onClick={() => update("attendee_origin", "global")}
            >
              All over the world
            </RadioCard>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Topic tags</label>
          <TagInput
            value={form.topic_tags}
            onChange={(tags) => update("topic_tags", tags)}
            placeholder="Add a topic and press Enter"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            What type of organization is hosting this event? (Select all that apply)
          </label>
          <div className="space-y-2">
            {ORG_TYPES.map((type) => (
              <CheckboxOption
                key={type}
                checked={form.organization_type.includes(type)}
                onChange={() => toggleOrgType(type)}
                label={type}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">What best describes this event type?</label>
          <div className="space-y-2">
            {EVENT_TYPES.map((type) => (
              <RadioCard
                key={type}
                selected={form.event_type === type}
                onClick={() => update("event_type", type)}
              >
                {type}
              </RadioCard>
            ))}
          </div>
          {form.event_type === "Other" && (
            <Input
              type="text"
              value={form.event_type_other}
              onChange={(e) => update("event_type_other", e.target.value)}
              placeholder="Describe your event type"
              className="mt-2"
            />
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Main Form ──

interface EventBasicsFormProps {
  mode: "create" | "edit";
  event?: Record<string, unknown>;
  onSubmit: (data: EventFormData) => Promise<void>;
}

export function EventBasicsForm({ mode, event, onSubmit }: EventBasicsFormProps) {
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [endDateManuallySet, setEndDateManuallySet] = useState(!!event?.end_date);

  const [form, setForm] = useState<EventFormData>(() => {
    if (event) {
      return {
        title: (event.title as string) ?? "",
        abbreviation: (event.abbreviation as string) ?? "",
        start_date: event.start_date ? toLocalInput(event.start_date as string) : "",
        end_date: event.end_date ? toLocalInput(event.end_date as string) : "",
        timezone: (event.timezone as string) ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        max_attendees: (event.max_attendees as number) ?? null,
        location_data: (event.location_data as LocationData) ?? {},
        description: (event.description as string) ?? "",
        welcome_message: (event.welcome_message as string) ?? "",
        airport_ride_sharing: (event.airport_ride_sharing as "enabled" | "provided" | "none") ?? "none",
        event_website_url: (event.event_website_url as string) ?? "",
        logo: (event.logo as string) ?? "",
        cover_image: (event.cover_image as string) ?? "",
        twitter_hashtags: (event.twitter_hashtags as string) ?? "",
        post_event_summary: (event.post_event_summary as boolean) ?? false,
        generate_interests: (event.generate_interests as boolean) ?? false,
        organization_name: (event.organization_name as string) ?? "",
        attendee_origin: (event.attendee_origin as "local" | "national" | "global" | "") ?? "",
        topic_tags: (event.topic_tags as string[]) ?? [],
        organization_type: (event.organization_type as string[]) ?? [],
        event_type: (event.event_type as string) ?? "",
        event_type_other: (event.event_type_other as string) ?? "",
      };
    }
    return {
      title: "",
      abbreviation: "",
      start_date: "",
      end_date: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      max_attendees: null,
      location_data: {},
      description: "",
      welcome_message: "",
      airport_ride_sharing: "none",
      event_website_url: "",
      logo: "",
      cover_image: "",
      twitter_hashtags: "",
      post_event_summary: false,
      generate_interests: false,
      organization_name: "",
      attendee_origin: "",
      topic_tags: [],
      organization_type: [],
      event_type: "",
      event_type_other: "",
    };
  });

  function update<K extends keyof EventFormData>(key: K, value: EventFormData[K]) {
    if (key === "end_date") setEndDateManuallySet(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-set end date to 23:59 of start date unless user manually set it
      if (key === "start_date" && typeof value === "string" && value && !endDateManuallySet) {
        const dateOnly = (value as string).split("T")[0];
        next.end_date = `${dateOnly}T23:59`;
      }
      return next;
    });
  }

  function toggleOrgType(type: string) {
    setForm((prev) => ({
      ...prev,
      organization_type: prev.organization_type.includes(type)
        ? prev.organization_type.filter((t) => t !== type)
        : [...prev.organization_type, type],
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = form.title.trim() && form.start_date && form.end_date;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  function goNext() {
    if (!isLastStep) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Edit mode: show all sections at once (scrollable)
  if (mode === "edit") {
    return (
      <div className="space-y-6">
        <StepBasics form={form} update={update} />
        <StepWelcome form={form} update={update} />
        <StepBranding form={form} update={update} />
        <StepAnalytics form={form} update={update} />
        <StepPromote form={form} update={update} toggleOrgType={toggleOrgType} />

        <div className="flex flex-col items-center gap-3 pb-8">
          <Button
            onClick={handleSubmit}
            loading={saving}
            disabled={!canSubmit || saving}
            className="gap-2 px-8 shadow-lg shadow-primary/20"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    );
  }

  // Create mode: step wizard
  return (
    <div>
      <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="animate-in fade-in slide-in-from-right-4 duration-300" key={currentStep}>
        {currentStep === 0 && <StepBasics form={form} update={update} />}
        {currentStep === 1 && <StepWelcome form={form} update={update} />}
        {currentStep === 2 && <StepBranding form={form} update={update} />}
        {currentStep === 3 && <StepAnalytics form={form} update={update} />}
        {currentStep === 4 && (
          <StepPromote form={form} update={update} toggleOrgType={toggleOrgType} />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between pb-8">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={isFirstStep}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <p className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            loading={saving}
            disabled={!canSubmit || saving}
            className="gap-2 px-6 shadow-lg shadow-primary/20"
          >
            <Sparkles className="h-4 w-4" />
            {saving ? "Creating..." : "Create Event"}
          </Button>
        ) : (
          <Button onClick={goNext} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!canSubmit && currentStep === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Fill in the required fields (Event Name, Start Date, End Date) to continue.
        </p>
      )}
    </div>
  );
}
