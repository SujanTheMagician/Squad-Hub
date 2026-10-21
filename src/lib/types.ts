export type Role = 'student' | 'squad_lead' | 'campus_manager' | 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  squad_lead: 'Squad lead',
  campus_manager: 'Campus Manager',
  admin: 'Admin',
};
export type Squad = 91 | 92 | 93;
export type PostType = 'note' | 'project' | 'idea' | 'resource' | 'doubt';

export const SQUADS: Squad[] = [91, 92, 93];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  note: 'Note',
  project: 'Project',
  idea: 'Idea',
  resource: 'Resource',
  doubt: 'Doubt',
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  squad: Squad | null;
  role: Role;
  bio: string | null;
  skills: string[];
  github: string | null;
  linkedin: string | null;
  leetcode: string | null;
  avatar_url: string | null;
  celebrate_birthday: boolean;
  notify_posts: boolean;
  notify_chat: boolean;
  onboarded_at: string | null;
};

/** Only the member, the Admin and the Campus Manager can read these. */
export type PrivateProfile = {
  phone: string | null;
  /** YYYY-MM-DD */
  birthday: string | null;
};

export type DirectoryMember = {
  /** Null when the person is on the allowlist but hasn't signed in yet (Admin / CM only). */
  id: string | null;
  email: string;
  full_name: string;
  squad: Squad | null;
  role: Role;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  joined: boolean;
  // Admin / CM only:
  phone?: string | null;
  birthday?: string | null;
  last_seen_at?: string | null;
  joined_at?: string | null;
};

export type FeedPost = {
  id: string;
  author_id: string;
  type: PostType;
  title: string;
  body: string;
  subject: string | null;
  tags: string[];
  squad: Squad | null;
  link_url: string | null;
  github_url: string | null;
  file_path: string | null;
  file_name: string | null;
  pinned: boolean;
  accepted_comment_id: string | null;
  created_at: string;
  author_name: string;
  author_squad: Squad | null;
  author_avatar: string | null;
  vote_count: number;
  comment_count: number;
  voted: boolean;
  bookmarked: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { full_name: string; squad: Squad | null; avatar_url: string | null } | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type ChatChannel = 'batch' | '91' | '92' | '93';

export type Message = {
  id: string;
  channel: ChatChannel;
  author_id: string;
  body: string;
  created_at: string;
  author: { full_name: string; squad: Squad | null; role: Role; avatar_url: string | null } | null;
};

export type AppNotification = {
  id: string;
  kind: 'post' | 'announcement' | 'comment' | 'event' | 'answer' | 'birthday' | 'update';
  title: string;
  body: string;
  post_id: string | null;
  read: boolean;
  created_at: string;
};

export type EventKind = 'deadline' | 'exam' | 'hackathon' | 'class' | 'event';

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  deadline: 'Deadline',
  exam: 'Exam',
  hackathon: 'Hackathon',
  class: 'Class',
  event: 'Event',
};

export type BatchEvent = {
  id: string;
  title: string;
  description: string;
  kind: EventKind;
  squad: Squad | null;
  starts_at: string;
};
