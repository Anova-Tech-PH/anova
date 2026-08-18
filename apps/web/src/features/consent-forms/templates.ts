export const TEMPLATES = [
  {
    key: "speaker_media_release",
    title: "Speaker Media Release",
    description:
      "Grants the event organizer permission to record, photograph, and distribute speaker presentations.",
    elements: [
      {
        type: "description" as const,
        label:
          "By signing this release, you grant the event organizer permission to record, photograph, and distribute your presentation in any media format for promotional and educational purposes.",
        is_required: false,
      },
      {
        type: "checkbox" as const,
        label:
          "I grant permission to record and distribute my presentation in any format.",
        is_required: true,
      },
      {
        type: "checkbox" as const,
        label:
          "I understand that recordings may be used for promotional purposes.",
        is_required: true,
      },
      {
        type: "signature" as const,
        label: "Signature",
        is_required: true,
      },
    ],
  },
  {
    key: "volunteer_liability_waiver",
    title: "Volunteer Liability Waiver",
    description:
      "Waiver of liability for volunteers participating in event activities.",
    elements: [
      {
        type: "description" as const,
        label:
          "This waiver releases the event organizer from liability for any injuries or damages that may occur while volunteering at this event.",
        is_required: false,
      },
      {
        type: "checkbox" as const,
        label:
          "I acknowledge that volunteering involves certain risks and I assume full responsibility for any injuries.",
        is_required: true,
      },
      {
        type: "checkbox" as const,
        label:
          "I release the event organizer from all claims related to my volunteer activities.",
        is_required: true,
      },
      {
        type: "text" as const,
        label: "Emergency contact name and phone number",
        is_required: true,
      },
      {
        type: "signature" as const,
        label: "Signature",
        is_required: true,
      },
    ],
  },
  {
    key: "photo_video_consent",
    title: "Photo & Video Consent",
    description:
      "Consent for attendees to be photographed or recorded during the event.",
    elements: [
      {
        type: "description" as const,
        label:
          "This event may be photographed and/or recorded. By signing below, you consent to the use of your image in event-related materials.",
        is_required: false,
      },
      {
        type: "checkbox" as const,
        label:
          "I consent to being photographed and/or recorded during the event.",
        is_required: true,
      },
      {
        type: "checkbox" as const,
        label:
          "I consent to the use of my image in promotional materials, social media, and publications.",
        is_required: true,
      },
      {
        type: "signature" as const,
        label: "Signature",
        is_required: true,
      },
    ],
  },
  {
    key: "event_code_of_conduct",
    title: "Event Code of Conduct",
    description:
      "Agreement to abide by the event's code of conduct and community guidelines.",
    elements: [
      {
        type: "description" as const,
        label:
          "All participants are expected to adhere to our code of conduct, which promotes a safe, inclusive, and respectful environment for everyone.",
        is_required: false,
      },
      {
        type: "checkbox" as const,
        label:
          "I have read and agree to abide by the event's code of conduct.",
        is_required: true,
      },
      {
        type: "checkbox" as const,
        label:
          "I understand that violations may result in removal from the event without a refund.",
        is_required: true,
      },
      {
        type: "signature" as const,
        label: "Signature",
        is_required: true,
      },
    ],
  },
  {
    key: "excursion_activity_waiver",
    title: "Excursion / Activity Waiver",
    description:
      "Liability waiver for optional excursions or physical activities associated with the event.",
    elements: [
      {
        type: "description" as const,
        label:
          "Participation in excursions and activities is voluntary. This waiver covers any risks associated with these optional activities.",
        is_required: false,
      },
      {
        type: "checkbox" as const,
        label:
          "I understand that participation in excursions/activities is at my own risk.",
        is_required: true,
      },
      {
        type: "checkbox" as const,
        label:
          "I release the organizer from liability for injuries or damages during excursions/activities.",
        is_required: true,
      },
      {
        type: "textarea" as const,
        label: "Any medical conditions or allergies we should be aware of",
        is_required: false,
      },
      {
        type: "text" as const,
        label: "Emergency contact name and phone number",
        is_required: true,
      },
      {
        type: "signature" as const,
        label: "Signature",
        is_required: true,
      },
    ],
  },
] as const;
