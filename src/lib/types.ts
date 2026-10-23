export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Manager {
  id: string; name: string; email: string | null; role: string | null;
  color: string | null; active: boolean; sort: number | null;
}
export interface Project {
  id: string; slug: string; name: string; description: string | null;
  owner_id: string | null; status: 'planning' | 'active' | 'on_hold' | 'done';
  start_date: string | null; end_date: string | null; drive_url: string | null;
  color: string | null; sort: number | null;
}
export interface Task {
  id: string; title: string; notes: string | null; status: TaskStatus; priority: Priority;
  due_date: string | null; assignee_id: string | null; project_id: string | null;
  parent_id: string | null; link_url: string | null; sort: number | null;
  completed_at: string | null; created_at: string;
}
export interface HubEvent {
  id: string; title: string; kind: 'phase' | 'event' | 'webinar' | 'meeting' | 'deadline';
  start_date: string; end_date: string | null; start_time: string | null; location: string | null;
  project_id: string | null; owner_id: string | null; notes: string | null;
}
export interface Expense {
  id: string; title: string; amount: number; date: string | null; category: string | null;
  status: 'planned' | 'paid' | 'reimbursed'; paid_by: string | null; receipt_url: string | null;
  project_id: string | null; notes: string | null;
}
export interface Contact {
  id: string; name: string; org: string | null; title: string | null; email: string | null; phone: string | null;
  kind: string; status: string; topic: string | null; project_id: string | null; owner_id: string | null; notes: string | null;
}
export interface Meeting { id: string; title: string; date: string; notes: string | null; doc_url: string | null; }
export interface Decision {
  id: string; title: string; proposal: string | null; status: 'pending' | 'approved' | 'rejected';
  decided_on: string | null; meeting_id: string | null; project_id: string | null; notes: string | null;
}
export interface HubLink { id: string; title: string; url: string; kind: string; project_id: string | null; pinned: boolean; }

export interface HubData {
  managers: Manager[]; projects: Project[]; tasks: Task[]; events: HubEvent[]; expenses: Expense[];
  contacts: Contact[]; meetings: Meeting[]; decisions: Decision[]; links: HubLink[];
  settings: Record<string, string>;
}
export type TableName = Exclude<keyof HubData, 'settings'>;
