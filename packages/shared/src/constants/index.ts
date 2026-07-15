export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const ORG_ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type OrgRole = (typeof ORG_ROLE)[keyof typeof ORG_ROLE];

export const SESSION_TYPE = {
  TALK: "talk",
  WORKSHOP: "workshop",
  PANEL: "panel",
  KEYNOTE: "keynote",
  BREAK: "break",
} as const;

export type SessionType = (typeof SESSION_TYPE)[keyof typeof SESSION_TYPE];

export const TICKET_TYPE = {
  FREE: "free",
  PAID: "paid",
} as const;

export type TicketType = (typeof TICKET_TYPE)[keyof typeof TICKET_TYPE];

export const REGISTRATION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  CHECKED_IN: "checked_in",
} as const;

export type RegistrationStatus =
  (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS];

export const CONNECTION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export type ConnectionStatus =
  (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

export const POST_TYPE = {
  TEXT: "text",
  PHOTO: "photo",
  POLL: "poll",
  ANNOUNCEMENT: "announcement",
} as const;

export type PostType = (typeof POST_TYPE)[keyof typeof POST_TYPE];

export const BREAKOUT_ROOM_STATUS = {
  OPEN: "open",
  FULL: "full",
  CLOSED: "closed",
} as const;

export type BreakoutRoomStatus =
  (typeof BREAKOUT_ROOM_STATUS)[keyof typeof BREAKOUT_ROOM_STATUS];

export const LIMITS = {
  MAX_EVENTS_PER_ORG: 100,
  MAX_SESSIONS_PER_EVENT: 500,
  MAX_SPEAKERS_PER_EVENT: 200,
  MAX_TICKET_TYPES_PER_EVENT: 20,
  MAX_POST_LENGTH: 2000,
  MAX_COMMENT_LENGTH: 500,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_BIO_LENGTH: 500,
  MAX_ROOMS_PER_EVENT: 50,
  MAX_ROOM_CAPACITY: 500,
} as const;

export const EMAIL_TYPE = {
  TRANSACTIONAL: "transactional",
  MARKETING: "marketing",
} as const;

export type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE];

export const EMAIL_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  BOUNCED: "bounced",
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export const EMAIL_TRIGGER = {
  ON_REGISTRATION: "on_registration",
  PRE_EVENT_24H: "pre_event_24h",
  PRE_EVENT_1H: "pre_event_1h",
  POST_EVENT: "post_event",
} as const;

export type EmailTrigger = (typeof EMAIL_TRIGGER)[keyof typeof EMAIL_TRIGGER];
