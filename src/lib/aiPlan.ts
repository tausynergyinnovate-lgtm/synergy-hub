// Shared shape of the plan the AI proposes (server returns it, client previews + applies it)

export interface PlanTask {
  ref: string;                    // temporary id, e.g. "t1"
  title: string;
  notes?: string | null;
  assignee_ids?: string[];        // manager ids, empty = whole team
  project_id?: string | null;     // existing project id, "new_project", or null
  parent_ref?: string | null;     // ref of another new task, or an existing task id
  due_date?: string | null;       // YYYY-MM-DD
  priority?: 'low' | 'medium' | 'high';
}
export interface AiPlan {
  reply: string;
  new_project?: { name: string; description?: string | null; owner_ids?: string[]; start_date?: string | null; end_date?: string | null } | null;
  tasks?: PlanTask[];
  task_updates?: { id: string; status?: string; due_date?: string | null; assignee_ids?: string[]; title?: string }[];
  events?: { title: string; kind: string; start_date: string; end_date?: string | null; project_id?: string | null; owner_ids?: string[]; notes?: string | null }[];
  contacts?: { name: string; org?: string | null; kind: string; status?: string; topic?: string | null; project_id?: string | null; owner_ids?: string[] }[];
  contact_updates?: { id: string; status: string }[];
  expenses?: { title: string; amount: number; project_id?: string | null; status?: string; category?: string | null; date?: string | null }[];
  decisions?: { title: string; proposal?: string | null; status?: string; project_id?: string | null }[];
}

const nullable = (t: string) => ({ type: [t, 'null'] });

export const PLAN_TOOL = {
  name: 'propose_changes',
  description: 'Return a Hebrew reply and the structured changes to propose to the hub. Managers review every change before it is saved.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'Short Hebrew message to the managers: the answer to their question, or a summary of what you propose and why. Mention open questions.' },
      new_project: {
        type: ['object', 'null'],
        description: 'Only when the work clearly needs a new cross-functional project that does not exist yet. Refer to it elsewhere as "new_project".',
        properties: { name: { type: 'string' }, description: nullable('string'), owner_ids: { type: 'array', items: { type: 'string' } }, start_date: nullable('string'), end_date: nullable('string') },
        required: ['name'],
      },
      tasks: {
        type: 'array',
        description: 'New tasks. Break work into concrete, actionable tasks; group related steps as sub-tasks under a parent task using parent_ref.',
        items: {
          type: 'object',
          properties: {
            ref: { type: 'string', description: 'Temporary id like t1, t2' },
            title: { type: 'string' },
            notes: nullable('string'),
            assignee_ids: { type: 'array', items: { type: 'string' }, description: 'Manager ids from the snapshot, chosen by their responsibilities. Several people may share a task. Empty = whole team' },
            project_id: { ...nullable('string'), description: 'Existing project id, "new_project", or null' },
            parent_ref: { ...nullable('string'), description: 'ref of a parent task in this list, or an existing task id; null for top-level' },
            due_date: { ...nullable('string'), description: 'YYYY-MM-DD' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['ref', 'title'],
        },
      },
      task_updates: {
        type: 'array', description: 'Changes to existing tasks (e.g. mark done).',
        items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] }, due_date: nullable('string'), assignee_ids: { type: 'array', items: { type: 'string' } }, title: { type: 'string' } }, required: ['id'] },
      },
      events: {
        type: 'array', description: 'Dated items for the timeline/calendar: phases, events, webinars, meetings, deadlines.',
        items: { type: 'object', properties: { title: { type: 'string' }, kind: { type: 'string', enum: ['phase', 'event', 'webinar', 'meeting', 'deadline'] }, start_date: { type: 'string' }, end_date: nullable('string'), project_id: nullable('string'), owner_ids: { type: 'array', items: { type: 'string' } }, notes: nullable('string') }, required: ['title', 'kind', 'start_date'] },
      },
      contacts: {
        type: 'array', description: 'New people (speakers, lecturers, partners…) mentioned that are not in the snapshot.',
        items: { type: 'object', properties: { name: { type: 'string' }, org: nullable('string'), kind: { type: 'string', enum: ['speaker', 'lecturer', 'mentor', 'partner', 'faculty', 'sponsor', 'alumni', 'other'] }, status: { type: 'string', enum: ['not_contacted', 'contacted', 'confirmed', 'declined', 'done'] }, topic: nullable('string'), project_id: nullable('string'), owner_ids: { type: 'array', items: { type: 'string' } } }, required: ['name', 'kind'] },
      },
      contact_updates: {
        type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['not_contacted', 'contacted', 'confirmed', 'declined', 'done'] } }, required: ['id', 'status'] },
      },
      expenses: {
        type: 'array', description: 'Only when an amount of money is mentioned.',
        items: { type: 'object', properties: { title: { type: 'string' }, amount: { type: 'number' }, project_id: nullable('string'), status: { type: 'string', enum: ['planned', 'paid', 'reimbursed'] }, category: nullable('string'), date: nullable('string') }, required: ['title', 'amount'] },
      },
      decisions: {
        type: 'array', description: 'Decisions that were made or need to be made.',
        items: { type: 'object', properties: { title: { type: 'string' }, proposal: nullable('string'), status: { type: 'string', enum: ['pending', 'approved', 'rejected'] }, project_id: nullable('string') }, required: ['title'] },
      },
    },
    required: ['reply'],
  },
} as const;
