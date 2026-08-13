export type FormFieldConfig = {
  field_key: string;
  label: string;
  included: boolean;
  required: boolean;
  is_custom: boolean;
  field_type: string;
  sort_order: number;
  organizer_only: boolean;
};

export const DEFAULT_SPEAKER_FIELDS: FormFieldConfig[] = [
  { field_key: "name", label: "Full Name", included: true, required: true, is_custom: false, field_type: "text", sort_order: 0, organizer_only: false },
  { field_key: "email", label: "Email", included: true, required: true, is_custom: false, field_type: "text", sort_order: 1, organizer_only: true },
  { field_key: "company", label: "Company / Affiliation", included: true, required: false, is_custom: false, field_type: "text", sort_order: 2, organizer_only: false },
  { field_key: "title", label: "Job Title", included: true, required: false, is_custom: false, field_type: "text", sort_order: 3, organizer_only: false },
  { field_key: "bio", label: "Biography", included: true, required: false, is_custom: false, field_type: "textarea", sort_order: 4, organizer_only: false },
  { field_key: "photo", label: "Profile Picture", included: true, required: false, is_custom: false, field_type: "image", sort_order: 5, organizer_only: false },
  { field_key: "linkedin_url", label: "LinkedIn Profile (URL)", included: false, required: false, is_custom: false, field_type: "url", sort_order: 6, organizer_only: false },
  { field_key: "twitter_handle", label: "Twitter Handle", included: false, required: false, is_custom: false, field_type: "text", sort_order: 7, organizer_only: false },
  { field_key: "website_url", label: "Website (URL)", included: false, required: false, is_custom: false, field_type: "url", sort_order: 8, organizer_only: false },
];
