"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@attendly/ui/components";
import { submitQuoteRequest } from "../actions";
import { CheckCircle2 } from "lucide-react";

const EVENT_FORMATS = ["In-person", "Virtual", "Hybrid"];
const EVENT_DURATIONS = ["Half day", "1 day", "Multiple days"];
const EXPECTED_ATTENDEES = [
  "Under 100",
  "100-200",
  "200-500",
  "500-2,000",
  "2,000+",
];
const EVENTS_PER_YEAR = ["1-2", "3-5", "6-10", "10+"];
const BUDGET_RANGES = [
  "Under $500",
  "$500-$1,000",
  "$1,000-$2,500",
  "$2,500+",
  "Not sure yet",
];

function RequiredMark() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <RequiredMark />}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20 text-foreground appearance-none cursor-pointer"
      >
        <option value="" className="bg-background text-muted-foreground">
          {placeholder || "Select..."}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-background text-foreground">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function QuoteRequestForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [eventName, setEventName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventFormat, setEventFormat] = useState("");
  const [eventDuration, setEventDuration] = useState("");
  const [expectedAttendees, setExpectedAttendees] = useState("");
  const [eventsPerYear, setEventsPerYear] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [message, setMessage] = useState("");

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold text-foreground">
          Request Received!
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Thank you for your interest. We&apos;ll review your details and send a
          custom quote within 24 hours.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await submitQuoteRequest({
        name,
        email,
        organizationName: organizationName || undefined,
        eventName,
        phone: phone || undefined,
        eventFormat,
        eventDuration,
        expectedAttendees,
        eventsPerYear,
        budgetRange: budgetRange || undefined,
        message: message || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name / Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Name
            <RequiredMark />
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Email
            <RequiredMark />
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      {/* Org / Event Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Organization Name
          </label>
          <Input
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Your company or org"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Event Name
            <RequiredMark />
          </label>
          <Input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. Annual Conference 2026"
            required
          />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Phone</label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
        />
      </div>

      {/* Event Format / Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Event Format"
          value={eventFormat}
          onChange={setEventFormat}
          options={EVENT_FORMATS}
          required
          placeholder="Select format"
        />
        <SelectField
          label="Event Duration"
          value={eventDuration}
          onChange={setEventDuration}
          options={EVENT_DURATIONS}
          required
          placeholder="Select duration"
        />
      </div>

      {/* Attendees / Events Per Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Expected Attendees"
          value={expectedAttendees}
          onChange={setExpectedAttendees}
          options={EXPECTED_ATTENDEES}
          required
          placeholder="Select range"
        />
        <SelectField
          label="Events Per Year"
          value={eventsPerYear}
          onChange={setEventsPerYear}
          options={EVENTS_PER_YEAR}
          required
          placeholder="Select frequency"
        />
      </div>

      {/* Budget Range */}
      <SelectField
        label="Budget Range"
        value={budgetRange}
        onChange={setBudgetRange}
        options={BUDGET_RANGES}
        placeholder="Select budget range"
      />

      {/* Message */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us more about your event, special requirements, or questions..."
          rows={4}
        />
      </div>

      {/* Submit */}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Get My Custom Quote
      </Button>
    </form>
  );
}
