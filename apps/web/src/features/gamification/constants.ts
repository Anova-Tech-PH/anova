export const ACTIVITY_LABELS: Record<string, string> = {
  poll_vote: "Poll Vote",
  session_feedback: "Session Feedback",
  session_rsvp: "Session RSVP",
  community_post: "Community Post",
  community_comment: "Community Comment",
  profile_update: "Profile Update",
  meetup_join: "Meetup Join",
  photo_upload: "Photo Upload",
  message_sent: "Message Sent",
  survey_complete: "Survey Complete",
  caption_submit: "Caption Submit",
  icebreaker_answer: "Icebreaker Answer",
  trivia_complete: "Trivia Complete",
  exhibitor_visit: "Exhibitor Visit",
  session_checkin: "Session Check-in",
  referral_registration: "Referral Registration",
};

export type ChallengeCategory = {
  name: string;
  activities: string[];
};

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = [
  {
    name: "Share your voice",
    activities: ["poll_vote", "session_feedback", "community_post", "community_comment", "survey_complete"],
  },
  {
    name: "Join the fun",
    activities: ["photo_upload", "caption_submit", "icebreaker_answer", "trivia_complete"],
  },
  {
    name: "Connect & network",
    activities: ["meetup_join", "message_sent", "profile_update", "referral_registration"],
  },
  {
    name: "Explore the event",
    activities: ["session_rsvp", "session_checkin", "exhibitor_visit"],
  },
];

export const CHALLENGE_LINKS: Record<string, string> = {
  poll_vote: "/community",
  session_feedback: "/feedback",
  community_post: "/community",
  community_comment: "/community",
  survey_complete: "/feedback",
  photo_upload: "/contests",
  caption_submit: "/contests",
  icebreaker_answer: "/contests",
  trivia_complete: "/trivia",
  meetup_join: "/community",
  message_sent: "/messages",
  profile_update: "/profile",
  referral_registration: "/leaderboard",
  session_rsvp: "/schedule",
  session_checkin: "/schedule",
  exhibitor_visit: "/passport",
};
