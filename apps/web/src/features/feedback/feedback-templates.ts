import type { FeedbackQuestion } from "./queries";

export type FeedbackTemplate = {
  id: string;
  name: string;
  description: string;
  questions: Omit<FeedbackQuestion, "id">[];
};

export const feedbackTemplates: FeedbackTemplate[] = [
  {
    id: "standard-session",
    name: "Standard Session Feedback",
    description:
      "A well-rounded feedback form covering overall quality, speaker performance, and content relevance.",
    questions: [
      {
        label: "Overall session rating",
        type: "rating",
        required: true,
      },
      {
        label: "Speaker rating",
        type: "rating",
        required: true,
      },
      {
        label: "How relevant was the content to you?",
        type: "multiple_choice",
        options: ["Very relevant", "Somewhat relevant", "Neutral", "Not very relevant"],
        required: true,
      },
      {
        label: "What was the most valuable part of this session?",
        type: "text",
        required: false,
      },
      {
        label: "Any suggestions for improvement?",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "keynote-evaluation",
    name: "Keynote Evaluation",
    description:
      "Evaluate keynote presentations on inspiration, delivery, and key takeaways.",
    questions: [
      {
        label: "How inspiring was the keynote?",
        type: "rating",
        required: true,
      },
      {
        label: "Delivery and presentation quality",
        type: "rating",
        required: true,
      },
      {
        label: "Would you attend a talk by this speaker again?",
        type: "multiple_choice",
        options: ["Definitely", "Probably", "Not sure", "Probably not"],
        required: true,
      },
      {
        label: "What was your key takeaway from this keynote?",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "workshop-feedback",
    name: "Workshop Feedback",
    description:
      "Gather feedback on workshop content, instructor quality, difficulty level, and applicability.",
    questions: [
      {
        label: "Content quality rating",
        type: "rating",
        required: true,
      },
      {
        label: "Instructor rating",
        type: "rating",
        required: true,
      },
      {
        label: "How was the difficulty level?",
        type: "multiple_choice",
        options: ["Too easy", "Just right", "Too difficult"],
        required: true,
      },
      {
        label: "How applicable is what you learned?",
        type: "rating",
        required: true,
      },
      {
        label: "What changes would you suggest for this workshop?",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "panel-discussion",
    name: "Panel Discussion Feedback",
    description:
      "Evaluate panel discussions on quality of discussion, moderation, and diversity of perspectives.",
    questions: [
      {
        label: "Overall discussion quality",
        type: "rating",
        required: true,
      },
      {
        label: "How would you rate the moderation?",
        type: "multiple_choice",
        options: ["Excellent", "Good", "Fair", "Poor"],
        required: true,
      },
      {
        label: "Were diverse perspectives represented?",
        type: "multiple_choice",
        options: ["Yes, very much", "Somewhat", "Not really"],
        required: true,
      },
      {
        label: "What topics would you like to see in future panels?",
        type: "text",
        required: false,
      },
    ],
  },
  {
    id: "quick-rating",
    name: "Quick Rating",
    description:
      "A minimal two-question form for fast session ratings with optional comments.",
    questions: [
      {
        label: "Session rating",
        type: "rating",
        required: true,
      },
      {
        label: "Any comments?",
        type: "text",
        required: false,
      },
    ],
  },
];
