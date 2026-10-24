// AI provider:
//  1. GEMINI_API_KEY set → Google Gemini free tier (no credit card), OpenAI-compatible endpoint.
//  2. otherwise → Vercel AI Gateway with the deployment's OIDC token (needs a card on file at Vercel).
import { getVercelOidcToken } from '@vercel/oidc';

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const isGemini = () => Boolean(process.env.GEMINI_API_KEY);

// Tried in order; the first model the account may use wins.
const GATEWAY_MODELS = [process.env.AI_MODEL, 'anthropic/claude-haiku-5.5', 'google/gemini-3-flash', 'google/gemini-2.5-flash'];
const GEMINI_MODELS = [process.env.AI_MODEL, 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
export const models = () => (isGemini() ? GEMINI_MODELS : GATEWAY_MODELS).filter(Boolean) as string[];

async function token(): Promise<string> {
  if (isGemini()) return process.env.GEMINI_API_KEY!;
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try { return await getVercelOidcToken(); } catch { /* fall through */ }
  if (process.env.VERCEL_OIDC_TOKEN) return process.env.VERCEL_OIDC_TOKEN;
  throw new Error('אין הרשאה ל-AI Gateway (OIDC לא זמין — רץ מחוץ ל-Vercel?)');
}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
type Tool = { name: string; description: string; parameters: Record<string, unknown> };

/** Forces a single tool call and returns its parsed arguments + the model that answered. */
export async function callTool<T>(messages: Msg[], tool: Tool, maxTokens = 6000): Promise<{ args: T; model: string }> {
  const auth = await token();
  const errors: string[] = [];
  for (const model of models()) {
    const res = await fetch(isGemini() ? GEMINI : GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        tools: [{ type: 'function', function: tool }],
        tool_choice: { type: 'function', function: { name: tool.name } },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      errors.push(`${model}: ${res.status} ${text.slice(0, 200)}`);
      // model not available / rate limited on this plan → try next; auth errors won't improve
      if (res.status === 401) break;
      continue;
    }
    const json = JSON.parse(text);
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const raw = call?.function?.arguments;
    if (!raw) { errors.push(`${model}: no tool call`); continue; }
    try {
      return { args: (typeof raw === 'string' ? JSON.parse(raw) : raw) as T, model };
    } catch {
      errors.push(`${model}: bad JSON`);
    }
  }
  throw new Error('העוזר לא זמין כרגע. ' + errors.join(' | '));
}

/** JSON-Schema → plain types (some providers reject ["string","null"] unions). */
export function simplifySchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(simplifySchema);
  if (s && typeof s === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
      if (k === 'type' && Array.isArray(v)) o[k] = v.find((t) => t !== 'null') ?? 'string';
      else o[k] = simplifySchema(v);
    }
    return o;
  }
  return s;
}
