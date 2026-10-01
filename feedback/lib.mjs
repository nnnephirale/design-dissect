// design-feedback: shared helpers for the comment service (server.mjs) and the agent MCP (mcp.mjs).
// Every reference folder in the design library keeps its comments in feedback.json; this module
// finds those folders and reads, merges and writes the files.
import { readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, relative, sep, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

export const HOME_LIBRARY = join(homedir(), 'design-systems');
export const PORT = +(process.env.DESIGN_FEEDBACK_PORT || 4777);

// DESIGN_LIBRARY (colon-separated, set by install.sh from the user's `library` setting) is
// searched first, then ~/design-systems, so references parked there while an external drive was
// unmounted stay visible. Checked on every call: a drive can mount after login.
export const libraryRoots = () =>
  [...new Set([...(process.env.DESIGN_LIBRARY || '').split(':'), HOME_LIBRARY].filter((p) => p && existsSync(p)).map((p) => resolve(p)))];

export const inside = (root, p) => { const r = relative(root, p); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
export const rootOf = (p) => libraryRoots().find((root) => inside(root, resolve(p)));

// Local wall time to the second, matching how the specimen writes and reads stamps.
export const now = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); };
const stamp = (f) => f.updated || f.date || '';

// A reference is any folder (up to 3 levels deep) with a specimen.html or feedback.json.
// Copies of the skill itself (they contain SKILL.md) are skipped.
export async function references() {
  const out = [];
  const walk = async (root, dir, depth) => {
    let items; try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    const names = new Set(items.map((i) => i.name));
    if (names.has('SKILL.md')) return;
    if (dir !== root && (names.has('specimen.html') || names.has('feedback.json'))) {
      out.push({ name: relative(root, dir).split(sep).join('/'), dir, root, hasSpecimen: names.has('specimen.html') });
    }
    if (depth >= 3) return;
    for (const i of items) if (i.isDirectory() && !i.name.startsWith('.') && i.name !== 'node_modules') await walk(root, join(dir, i.name), depth + 1);
  };
  for (const root of libraryRoots()) await walk(root, root, 0);
  return out;
}

export async function findReference(name) {
  const refs = await references();
  const n = String(name || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  // Folders may carry an order prefix (01_superhuman), so "superhuman" finds it too.
  const bare = (x) => x.toLowerCase().split('/').pop().replace(/^\d+[_-]/, '');
  return refs.find((r) => r.name.toLowerCase() === n) || refs.find((r) => r.name.toLowerCase().split('/').pop() === n) || refs.find((r) => bare(r.name) === bare(n));
}

export async function readFeedback(dir) {
  try { const d = JSON.parse(await readFile(join(dir, 'feedback.json'), 'utf8')); return Array.isArray(d) ? d : []; }
  catch { return []; }
}

// Per id, the newer stamp wins; on a tie the incoming copy wins. Entries missing from the
// incoming set are kept (a stale page never erases what an agent or another tab wrote).
// `deleted: true` tombstones remove the entry. Drafts never reach disk.
export function merge(current, incoming) {
  const byId = new Map(current.map((f) => [f.id, f]));
  for (const f of incoming) {
    if (!f || typeof f !== 'object' || !f.id || f.draft) continue;
    const cur = byId.get(f.id);
    if (cur && stamp(cur) > stamp(f)) continue;
    if (f.deleted) byId.delete(f.id);
    else { const { deleted, draft, ...rest } = f; byId.set(f.id, rest); }
  }
  return [...byId.values()];
}

// Writes are serialised per file inside a process and land atomically (tmp + rename).
const queues = new Map();
export function updateFeedback(dir, fn) {
  const file = join(dir, 'feedback.json');
  const run = (queues.get(file) || Promise.resolve()).then(async () => {
    const next = await fn(await readFeedback(dir));
    const tmp = file + '.' + process.pid + '.tmp';
    await writeFile(tmp, JSON.stringify(next, null, 2) + '\n');
    await rename(tmp, file);
    return next;
  });
  queues.set(file, run.catch(() => {}));
  return run;
}
