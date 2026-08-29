export type BugStatus =
  | 'UNCONFIRMED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFIED'
  | 'CLOSED';

export type BugResolution =
  | ''
  | 'FIXED'
  | 'INVALID'
  | 'WONTFIX'
  | 'DUPLICATE'
  | 'WORKSFORME'
  | 'INCOMPLETE';

export type BugPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export type BugSeverity =
  | 'blocker'
  | 'critical'
  | 'major'
  | 'normal'
  | 'minor'
  | 'trivial'
  | 'enhancement';

export type CvssSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FlagStatus = '?' | '+' | '-';

export type CommentFormat = 'plain' | 'markdown';

export type NotificationType =
  | 'mention'
  | 'status_change'
  | 'flag_request'
  | 'flag_granted'
  | 'flag_denied';

export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  is_enabled: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  display_name: string;
  username: string;
  is_admin: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  ip_addr?: string | null;
  created_at: string;
  expires_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  is_buggroup: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  classification_id?: number | null;
  description: string;
  is_active: boolean;
  default_milestone: string;
}

export interface Component {
  id: number;
  name: string;
  product_id: number;
  description: string;
  default_owner_id?: string | null;
  is_active: boolean;
}

export interface Bug {
  id: number;
  summary: string;
  description: string;
  status: BugStatus;
  resolution: BugResolution;
  priority: BugPriority;
  severity: BugSeverity;
  product_id: number;
  component_id: number;
  version: string;
  target_milestone: string;
  reporter_id: string;
  assignee_id?: string | null;
  qa_contact_id?: string | null;
  duplicate_of?: number | null;
  estimated_time: number;
  remaining_time: number;
  deadline?: string | null;
  is_embargoed: boolean;
  embargo_until?: string | null;
  cvss_vector?: string | null;
  cvss_score?: number | null;
  cvss_severity?: CvssSeverity | null;
  created_at: string;
  updated_at: string;
}

export interface BugActivity {
  id: number;
  bug_id: number;
  who_id: string;
  changed_at: string;
  field: string;
  old_value?: string | null;
  new_value?: string | null;
  comment?: string | null;
}

export interface BugComment {
  id: number;
  bug_id: number;
  author_id: string;
  body: string;
  format: CommentFormat;
  is_private: boolean;
  parent_id?: number | null;
  created_at: string;
  author_username?: string;
  author_avatar?: string | null;
}

export interface FlagType {
  id: number;
  name: string;
  description: string;
  target_type: 'b' | 'a';
  is_requestable: boolean;
  is_requesteeble: boolean;
  grant_group_id?: string | null;
}

export interface Flag {
  id: number;
  type_id: number;
  status: FlagStatus;
  bug_id: number;
  attach_id?: number | null;
  setter_id: string;
  requestee_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  payload: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface DependencyGraphNode {
  id: string;
  summary: string;
  status: BugStatus;
  priority: BugPriority;
  estimated_time: number;
}

export interface DependencyGraphEdge {
  id: string;
  source: string;
  target: string;
  isCritical?: boolean;
}

export interface DependencyGraphPayload {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  criticalPathIds: string[];
}

export interface TriageResult {
  summary: string;
  suggested_priority: BugPriority;
  suggested_component: string;
  confidence_reason: string;
  next_steps: string[];
}

