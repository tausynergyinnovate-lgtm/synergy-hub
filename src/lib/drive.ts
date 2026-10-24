// Read-only Google Drive access for the hub.
// No key files: Vercel's OIDC token is exchanged (Workload Identity Federation) for a short-lived
// token of the hub-drive service account, which can see only the folders shared with it.
import { IdentityPoolClient } from 'google-auth-library';
import { getVercelOidcToken } from '@vercel/oidc';

const PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '914135241254';
const POOL = process.env.GCP_WIF_POOL || 'vercel';
const PROVIDER = process.env.GCP_WIF_PROVIDER || 'vercel';
export const DRIVE_BOT = process.env.GCP_SERVICE_ACCOUNT || 'hub-drive@synergy-hub-512610.iam.gserviceaccount.com';

let client: IdentityPoolClient | null = null;
async function accessToken(): Promise<string> {
  if (!client) {
    client = new IdentityPoolClient({
      type: 'external_account',
      audience: `//iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}`,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${DRIVE_BOT}:generateAccessToken`,
      subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  }
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Drive: no access token');
  return token;
}

async function api(path: string, params: Record<string, string> = {}, raw = false) {
  const url = new URL('https://www.googleapis.com/drive/v3/' + path);
  Object.entries({ supportsAllDrives: 'true', ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return raw ? res : res.json();
}

export interface DriveFile { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; kind: string }

const KIND: Record<string, string> = {
  'application/vnd.google-apps.folder': 'תיקייה',
  'application/vnd.google-apps.document': 'מסמך',
  'application/vnd.google-apps.spreadsheet': 'גיליון',
  'application/vnd.google-apps.presentation': 'מצגת',
  'application/vnd.google-apps.form': 'טופס',
  'application/pdf': 'PDF',
};
const kindOf = (m: string) => KIND[m] ?? (m.startsWith('image/') ? 'תמונה' : 'קובץ');
const FIELDS = 'files(id,name,mimeType,modifiedTime,webViewLink)';
const shape = (f: Omit<DriveFile, 'kind'>): DriveFile => ({ ...f, kind: kindOf(f.mimeType) });
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Full-text + name search across everything shared with the bot. */
export async function searchDrive(query: string, limit = 8): Promise<DriveFile[]> {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 5);
  if (!words.length) return [];
  const q = `trashed = false and (${words.map((w) => `fullText contains '${esc(w)}' or name contains '${esc(w)}'`).join(' or ')})`;
  const j = await api('files', { q, pageSize: String(limit), fields: FIELDS, includeItemsFromAllDrives: 'true', corpora: 'allDrives', orderBy: 'modifiedTime desc' });
  return (j.files ?? []).map(shape);
}

export async function listFolder(folderId: string, limit = 50): Promise<DriveFile[]> {
  const j = await api('files', { q: `'${esc(folderId)}' in parents and trashed = false`, pageSize: String(limit), fields: FIELDS, includeItemsFromAllDrives: 'true', orderBy: 'folder,modifiedTime desc' });
  return (j.files ?? []).map(shape);
}

/** Text content of a file (Docs/Sheets/Slides/plain text). Truncated for the AI. */
export async function readFile(fileId: string, maxChars = 12000): Promise<{ file: DriveFile; text: string }> {
  const meta = shape(await api(`files/${encodeURIComponent(fileId)}`, { fields: 'id,name,mimeType,modifiedTime,webViewLink' }));
  let text = '';
  const exportAs: Record<string, string> = {
    'application/vnd.google-apps.document': 'text/plain',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
  };
  if (exportAs[meta.mimeType]) {
    const res = (await api(`files/${encodeURIComponent(fileId)}/export`, { mimeType: exportAs[meta.mimeType] }, true)) as Response;
    text = await res.text();
  } else if (meta.mimeType === 'application/vnd.google-apps.folder') {
    const kids = await listFolder(fileId, 40);
    text = 'תוכן התיקייה:\n' + kids.map((k) => `- ${k.name} (${k.kind}, id: ${k.id})`).join('\n');
  } else if (meta.mimeType.startsWith('text/') || meta.mimeType === 'application/json') {
    const res = (await api(`files/${encodeURIComponent(fileId)}`, { alt: 'media' }, true)) as Response;
    text = await res.text();
  } else {
    text = `(קובץ מסוג ${meta.kind} — אי אפשר לקרוא את התוכן שלו כטקסט. אפשר לפתוח בקישור.)`;
  }
  if (text.length > maxChars) text = text.slice(0, maxChars) + '\n…(קוצר)';
  return { file: meta, text };
}

/** Pull Drive/Docs file or folder ids out of any text (pasted links). */
export function driveIdsIn(text: string): string[] {
  const ids = new Set<string>();
  const re = /https?:\/\/(?:docs|drive)\.google\.com\/[^\s)]*?(?:\/d\/|folders\/|[?&]id=)([\w-]{20,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) ids.add(m[1]);
  return [...ids].slice(0, 3);
}

export function folderIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/folders\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
  return m ? m[1] : null;
}
