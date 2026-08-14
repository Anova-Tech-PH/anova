import type { SurveyQuestion } from "./queries";

export type SurveyTemplate = {
  id: string;
  name: string;
  description: string;
  questions: Omit<SurveyQuestion, "id">[];
};

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: "post-event-feedback",
    name: "Post-Event Feedback",
    description: "Collect overall impressions and suggestions after your event.",
    questions: [
      { label: "How would you rate the event overall?", type: "rating", required: true },
      { label: "How likely are you to recommend this event?", type: "rating", required: true },
      {
        label: "What was the best aspect of the event?",
        type: "select",
        options: ["Speakers", "Content", "Networking", "Venue", "Organization", "Other"],
        required: true,
      },
      { label: "What could be improved?", type: "text", required: false },
      { label: "Any additional comments?", type: "text", required: false },
    ],
  },
  {
    id: "speaker-evaluation",
    name: "Speaker Evaluation",
    description: "Evaluate individual speaker presentations and content quality.",
    questions: [
      { label: "How would you rate the presentation?", type: "rating", required: true },
      { label: "How relevant was the content to you?", type: "rating", required: true },
      {
        label: "How was the session length?",
        type: "select",
        options: ["Too short", "Just right", "Too long"],
        required: true,
      },
      { label: "What was the most valuable takeaway?", type: "text", required: false },
    ],
  },
  {
    id: "net-promoter-score",
    name: "Net Promoter Score",
    description: "Measure attendee loyalty with a simple NPS survey.",
    questions: [
      { label: "How likely are you to recommend this event to a colleague?", type: "rating", required: true },
      { label: "What is the primary reason for your score?", type: "text", required: false },
    ],
  },
  {
    id: "venue-logistics",
    name: "Venue & Logistics",
    description: "Gather feedback on venue quality, food, and logistics.",
    questions: [
      { label: "How would you rate the venue?", type: "rating", required: true },
      { label: "How would you rate the food and beverages?", type: "rating", required: true },
      {
        label: "How easy was it to navigate the venue?",
        type: "select",
        options: ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"],
        required: true,
      },
      { label: "How would you rate the check-in experience?", type: "rating", required: true },
      { label: "Any suggestions for venue or logistics improvements?", type: "text", required: false },
    ],
  },
  {
    id: "content-sessions",
    name: "Content & Sessions",
    description: "Evaluate the quality and relevance of event content and sessions.",
    questions: [
      { label: "How would you rate the overall content quality?", type: "rating", required: true },
      { label: "How relevant were the sessions to your needs?", type: "rating", required: true },
      {
        label: "What session format do you prefer?",
        type: "select",
        options: ["Keynote", "Panel discussion", "Workshop", "Fireside chat", "Roundtable"],
        required: true,
      },
      { label: "What topics would you like to see at future events?", type: "text", required: false },
    ],
  },
  {
    id: "networking-experience",
    name: "Networking Experience",
    description: "Assess networking opportunities and connection quality.",
    questions: [
      { label: "How would you rate the networking opportunities?", type: "rating", required: true },
      {
        label: "How many meaningful connections did you make?",
        type: "select",
        options: ["None", "1-2", "3-5", "6-10", "More than 10"],
        required: true,
      },
      {
        label: "Which networking format was most useful?",
        type: "select",
        options: ["Structured networking", "Open mingling", "Roundtable discussions", "One-on-one meetings", "Online chat"],
        required: true,
      },
      { label: "How could we improve networking at future events?", type: "text", required: false },
    ],
  },
  {
    id: "registration-experience",
    name: "Registration Experience",
    description: "Evaluate the registration and ticketing process.",
    questions: [
      { label: "How easy was the registration process?", type: "rating", required: true },
      { label: "How would you rate the value for the ticket price?", type: "rating", required: true },
      {
        label: "How did you hear about this event?",
        type: "select",
        options: ["Social media", "Email newsletter", "Word of mouth", "Company/organization", "Search engine", "Other"],
        required: true,
      },
      { label: "Any suggestions for improving registration?", type: "text", required: false },
    ],
  },
  {
    id: "virtual-event-experience",
    name: "Virtual Event Experience",
    description: "Collect feedback specific to virtual or hybrid events.",
    questions: [
      { label: "How would you rate the virtual platform?", type: "rating", required: true },
      {
        label: "Did you experience any technical issues?",
        type: "select",
        options: ["No issues", "Minor audio issues", "Minor video issues", "Connection problems", "Platform crashes", "Other"],
        required: true,
      },
      { label: "How engaging was the virtual experience?", type: "rating", required: true },
      { label: "How could we improve the virtual experience?", type: "text", required: false },
    ],
  },
  {
    id: "exhibitor-feedback",
    name: "Exhibitor Feedback",
    description: "Gather feedback from exhibitors and sponsors.",
    questions: [
      { label: "How satisfied are you with your exhibitor experience?", type: "rating", required: true },
      { label: "How would you rate the foot traffic at your booth?", type: "rating", required: true },
      {
        label: "Would you exhibit at this event again?",
        type: "select",
        options: ["Definitely yes", "Probably yes", "Not sure", "Probably not", "Definitely not"],
        required: true,
      },
      { label: "What could we improve for exhibitors?", type: "text", required: false },
    ],
  },
  {
    id: "workshop-evaluation",
    name: "Workshop Evaluation",
    description: "Evaluate workshop content, instructor, and practical value.",
    questions: [
      { label: "How would you rate the workshop content?", type: "rating", required: true },
      { label: "How would you rate the instructor?", type: "rating", required: true },
      {
        label: "How was the difficulty level?",
        type: "select",
        options: ["Too basic", "Slightly easy", "Just right", "Slightly advanced", "Too advanced"],
        required: true,
      },
      { label: "How applicable is what you learned to your work?", type: "rating", required: true },
      { label: "What would you change about this workshop?", type: "text", required: false },
    ],
  },
  {
    id: "pre-event-expectations",
    name: "Pre-Event Expectations",
    description: "Understand attendee expectations before the event.",
    questions: [
      {
        label: "What are you most looking forward to?",
        type: "select",
        options: ["Keynote speakers", "Breakout sessions", "Networking", "Workshops", "Exhibitions", "Social events"],
        required: true,
      },
      { label: "What is your primary goal for attending?", type: "text", required: true },
      { label: "Do you have any dietary restrictions or accessibility needs?", type: "text", required: false },
    ],
  },
  {
    id: "quick-pulse-check",
    name: "Quick Pulse Check",
    description: "A short mid-event check-in to gauge attendee satisfaction.",
    questions: [
      { label: "How are you enjoying the event so far?", type: "rating", required: true },
      { label: "Anything we can improve right now?", type: "text", required: false },
    ],
  },
];
