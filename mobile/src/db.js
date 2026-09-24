// On-device data layer (getThreads, getThread, createThread, ...). Storage is
// SQLite via @capacitor-community/sqlite. Table and enum names live in the
// SCHEMA constant below. On web (our dev/testing environment) it runs on the
// jeep-sqlite + sql.js fallback, persisted in IndexedDB; on a real device it
// uses the native SQLite engine. Same code path either way.

import { SQLiteConnection, CapacitorSQLite } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import { classify as classifyIntent } from "./intent-classifier.js";
import { generateDraft } from "./ai-draft-generator.js";
import { runSeed, runLinkSeed } from "./seed.js";
import { readStoredLang, detectDeviceLang } from "./i18n.js";

const DB_NAME = "creatoros";
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  bio TEXT NOT NULL,
  followers_count INTEGER NOT NULL,
  following_count INTEGER NOT NULL,
  posts_count INTEGER NOT NULL,
  active_persona_id TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS social_account (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  handle TEXT,
  connection_state TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
  connected_since TEXT,
  restriction_reason TEXT
);
CREATE TABLE IF NOT EXISTS persona (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  example TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS thread (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  account_id TEXT,
  sender TEXT NOT NULL,
  sender_handle TEXT,
  snippet TEXT NOT NULL,
  full_message TEXT NOT NULL,
  intent TEXT NOT NULL,
  confidence REAL NOT NULL,
  classified_by TEXT NOT NULL DEFAULT 'RULE_BASED',
  status TEXT NOT NULL DEFAULT 'PENDING',
  unread INTEGER NOT NULL DEFAULT 1,
  ai_draft_text TEXT,
  persona_id TEXT,
  received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS booking_template (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS booking (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type TEXT NOT NULL,
  source_thread_id TEXT,
  account_id TEXT
);
CREATE TABLE IF NOT EXISTS deal (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  in_kind_bonus TEXT,
  deliverables_summary TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'OFFER_RECEIVED',
  source_thread_id TEXT,
  account_id TEXT
);
CREATE TABLE IF NOT EXISTS deal_deliverable (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  type TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  proof_url TEXT,
  proof_note TEXT,
  fulfilled_at TEXT
);
CREATE TABLE IF NOT EXISTS deal_payment (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  milestone TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status TEXT NOT NULL DEFAULT 'PENDING',
  due_date TEXT
);
CREATE TABLE IF NOT EXISTS deal_performance (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL UNIQUE,
  reach INTEGER NOT NULL,
  engagement_rate REAL NOT NULL,
  link_clicks INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS link_bundle (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS link_bundle_item (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL,
  label TEXT,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_setting (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS link_send (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  route TEXT NOT NULL,
  sent_at TEXT NOT NULL
);
`;

// ---------- low-level helpers ----------

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Demo content is written in Turkish or English: Turkish for Turkish users,
// English for everyone else (the sample data is fictional, it just has to read naturally).
function seedLang() {
  return (readStoredLang() ?? detectDeviceLang()) === "tr" ? "tr" : "en";
}

function rowToCamel(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[toCamel(key)] = value;
  return out;
}

async function all(sql, params = []) {
  const result = await db.query(sql, params);
  return (result.values ?? []).map(rowToCamel);
}

async function one(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] ?? null;
}

async function run(sql, params = []) {
  await db.run(sql, params);
}

function uuid() {
  return crypto.randomUUID();
}

// ---------- init ----------

export async function init() {
  if (Capacitor.getPlatform() === "web") {
    // Web fallback (jeep-sqlite + sql.js/wasm) — used by our Browser-pane
    // testing today; the native build uses the platform's real SQLite engine
    // instead and never hits this branch.
    await sqlite.initWebStore();
  }

  db = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await db.open();
  // Seed demo link bundles only the first time the table is created, so a
  // user who deletes them all doesn't get them back on the next launch.
  const hadLinkBundles = Boolean(await one("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'link_bundle'"));
  await db.execute(SCHEMA);
  if (!hadLinkBundles) await runLinkSeed({ createLinkBundle, lang: seedLang() });

  // Migration for databases created before onboarding_completed existed —
  // CREATE TABLE IF NOT EXISTS above is a no-op on those, so add it here.
  try {
    await db.execute("ALTER TABLE profile ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0");
  } catch {
    // column already present — fine
  }

  // Migration for databases created before multi-account support: social_account
  // used to have UNIQUE(profile_id, channel), which blocked adding a second
  // account on the same channel. SQLite can't drop a constraint in place, so
  // recreate the table without it when that old constraint is still present.
  const { sql: socialAccountSql } = (await one("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'social_account'")) ?? {};
  if (socialAccountSql && socialAccountSql.includes("UNIQUE(profile_id, channel)")) {
    await db.execute(`
      CREATE TABLE social_account_new (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        handle TEXT,
        connection_state TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
        connected_since TEXT,
        restriction_reason TEXT
      );
      INSERT INTO social_account_new SELECT id, profile_id, channel, handle, connection_state, connected_since, restriction_reason FROM social_account;
      DROP TABLE social_account;
      ALTER TABLE social_account_new RENAME TO social_account;
    `);
  }

  // Migration for databases created before thread/deal/booking.account_id
  // and deal_deliverable's proof columns existed.
  for (const stmt of [
    "ALTER TABLE thread ADD COLUMN account_id TEXT",
    "ALTER TABLE deal ADD COLUMN account_id TEXT",
    "ALTER TABLE booking ADD COLUMN account_id TEXT",
    "ALTER TABLE deal_deliverable ADD COLUMN proof_url TEXT",
    "ALTER TABLE deal_deliverable ADD COLUMN proof_note TEXT",
    "ALTER TABLE deal_deliverable ADD COLUMN fulfilled_at TEXT",
    "ALTER TABLE thread ADD COLUMN sender_handle TEXT",
  ]) {
    try {
      await db.execute(stmt);
    } catch {
      // column already present — fine
    }
  }

  const { count } = (await one("SELECT COUNT(*) as count FROM thread")) ?? { count: 0 };
  if (Number(count) === 0) {
    await runSeed({ run, uuid, lang: seedLang() });
  }

  // Backfill: attribute any thread still missing account_id (legacy rows,
  // or freshly seeded ones — seed.js doesn't set it) to the oldest connected
  // account on its channel, so account tabs have something to filter on.
  await run(`
    UPDATE thread SET account_id = (
      SELECT sa.id FROM social_account sa
      WHERE sa.channel = thread.channel AND sa.connection_state = 'CONNECTED'
      ORDER BY sa.connected_since ASC LIMIT 1
    ) WHERE account_id IS NULL
  `);

  // Instagram reply deep links need a username, but some demo senders are
  // display names ("Aslı — Lumen Kozmetik"). Handle-like senders double as
  // their own handle; the two named ones get an explicit demo handle.
  await run(`
    UPDATE thread SET sender_handle = sender
    WHERE sender_handle IS NULL AND channel IN ('INSTAGRAM_DM', 'INSTAGRAM_COMMENT') AND sender NOT LIKE '% %'
  `);
  await run("UPDATE thread SET sender_handle = 'lumenkozmetik' WHERE id = 't2' AND sender_handle IS NULL");
  await run("UPDATE thread SET sender_handle = 'studionomi.pr' WHERE id = 't7' AND sender_handle IS NULL");

  // Deals/bookings inherit account_id from their source thread when they have
  // one. Deals/bookings with no source thread (e.g. d3/d4/d6 in the seed, or
  // manually-logged deals) have no single account to attribute them to — they
  // stay account_id NULL and only show up in the "Tümü" (all) tab, never
  // inside a single account's tab. That's a deliberate choice, not a gap.
  await run(`
    UPDATE deal SET account_id = (
      SELECT t.account_id FROM thread t WHERE t.id = deal.source_thread_id
    ) WHERE account_id IS NULL AND source_thread_id IS NOT NULL
  `);
  await run(`
    UPDATE booking SET account_id = (
      SELECT t.account_id FROM thread t WHERE t.id = booking.source_thread_id
    ) WHERE account_id IS NULL AND source_thread_id IS NOT NULL
  `);
}

// ---------- Threads ----------

async function attachThreadRelations(thread) {
  thread.unread = Boolean(thread.unread);
  thread.bookingTemplate = await one("SELECT * FROM booking_template WHERE thread_id = ?", [thread.id]);
  thread.persona = thread.personaId ? await one("SELECT * FROM persona WHERE id = ?", [thread.personaId]) : null;
  return thread;
}

export async function getThreads(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.intent) {
    clauses.push("intent = ?");
    params.push(filters.intent);
  }
  if (filters.channel) {
    clauses.push("channel = ?");
    params.push(filters.channel);
  }
  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.unread !== undefined) {
    clauses.push("unread = ?");
    params.push(filters.unread ? 1 : 0);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const threads = await all(`SELECT * FROM thread ${where} ORDER BY received_at DESC`, params);
  return Promise.all(threads.map(attachThreadRelations));
}

export async function getThread(id) {
  const thread = await one("SELECT * FROM thread WHERE id = ?", [id]);
  if (!thread) throw new Error(`Thread not found: ${id}`);
  return attachThreadRelations(thread);
}

async function resolvePersonaId(explicit) {
  if (explicit) return explicit;
  const profile = await one("SELECT active_persona_id FROM profile LIMIT 1");
  if (profile?.activePersonaId) return profile.activePersonaId;
  const fallback = await one("SELECT id FROM persona ORDER BY id ASC LIMIT 1");
  if (!fallback) throw new Error("No persona available to draft a reply with");
  return fallback.id;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function createThread(data) {
  const classification = await classifyIntent(data.fullMessage);

  let aiDraftText = null;
  let personaId = null;

  if (classification.intent !== "SPAM") {
    personaId = await resolvePersonaId(data.personaId);
    const persona = await one("SELECT * FROM persona WHERE id = ?", [personaId]);
    const draft = await generateDraft({ persona, intent: classification.intent, message: data.fullMessage, senderName: data.sender });
    aiDraftText = draft.text;
  }

  const id = uuid();
  const snippet = data.snippet ?? truncate(data.fullMessage, 90);
  const account = await one(
    "SELECT id FROM social_account WHERE channel = ? AND connection_state = 'CONNECTED' ORDER BY connected_since ASC LIMIT 1",
    [data.channel]
  );
  await run(
    `INSERT INTO thread (id, channel, account_id, sender, sender_handle, snippet, full_message, intent, confidence, classified_by, status, unread, ai_draft_text, persona_id, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, ?, ?, ?)`,
    [id, data.channel, account?.id ?? null, data.sender, data.senderHandle ?? null, snippet, data.fullMessage, classification.intent, classification.confidence, classification.source, aiDraftText, personaId, new Date().toISOString()]
  );
  return getThread(id);
}

export async function updateThreadStatus(id, status) {
  await getThread(id);
  const unreadClause = status === "REPLIED" ? ", unread = 0" : "";
  await run(`UPDATE thread SET status = ? ${unreadClause} WHERE id = ?`, [status, id]);
  return getThread(id);
}

export async function updateDraft(id, text) {
  await getThread(id);
  await run("UPDATE thread SET ai_draft_text = ? WHERE id = ?", [text, id]);
  return getThread(id);
}

export async function regenerateDraft(id, personaIdOverride) {
  const thread = await getThread(id);
  if (thread.intent === "SPAM") throw new Error("Cannot generate a draft for a message classified as SPAM");
  const personaId = await resolvePersonaId(personaIdOverride ?? thread.personaId);
  const persona = await one("SELECT * FROM persona WHERE id = ?", [personaId]);
  const draft = await generateDraft({ persona, intent: thread.intent, message: thread.fullMessage, senderName: thread.sender });
  await run("UPDATE thread SET ai_draft_text = ?, persona_id = ? WHERE id = ?", [draft.text, personaId, id]);
  return getThread(id);
}

export async function createBookingFromThread(id) {
  const thread = await getThread(id);
  if (!thread.bookingTemplate) {
    throw new Error(`Thread ${id} has no booking template — it wasn't classified as a booking request`);
  }
  const bookingId = uuid();
  const t = thread.bookingTemplate;
  await run(
    "INSERT INTO booking (id, title, date, start_time, end_time, type, source_thread_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [bookingId, t.title, t.date, t.startTime, t.endTime, t.type, id, thread.accountId]
  );
  return one("SELECT * FROM booking WHERE id = ?", [bookingId]);
}

// ---------- Deals ----------

async function attachDealRelations(deal) {
  deal.deliverables = await all("SELECT * FROM deal_deliverable WHERE deal_id = ?", [deal.id]);
  deal.payments = await all("SELECT * FROM deal_payment WHERE deal_id = ?", [deal.id]);
  deal.performance = await one("SELECT * FROM deal_performance WHERE deal_id = ?", [deal.id]);
  return deal;
}

export async function getDeals(stage) {
  const where = stage ? "WHERE stage = ?" : "";
  const params = stage ? [stage] : [];
  const deals = await all(`SELECT * FROM deal ${where} ORDER BY rowid DESC`, params);
  return Promise.all(deals.map(attachDealRelations));
}

export async function getDeal(id) {
  const deal = await one("SELECT * FROM deal WHERE id = ?", [id]);
  if (!deal) throw new Error(`Deal not found: ${id}`);
  return attachDealRelations(deal);
}

// Manual deal entry — for brand offers that didn't arrive as an Inbox
// message (DM auto-detection only creates a thread, never a deal on its
// own). accountId is optional: leave it unset and the deal only shows up
// in the "Tümü" account tab, same as the seeded deals with no source thread.
export async function createDeal({ brand, category, amount, currency, inKindBonus, deliverablesSummary, stage, accountId }) {
  const id = uuid();
  await run(
    "INSERT INTO deal (id, brand, category, amount, currency, in_kind_bonus, deliverables_summary, stage, source_thread_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)",
    [id, brand, category, amount, currency || "TRY", inKindBonus || null, deliverablesSummary, stage, accountId || null]
  );
  return getDeal(id);
}

export async function updateDealStage(id, stage) {
  await run("UPDATE deal SET stage = ? WHERE id = ?", [stage, id]);
  return getDeal(id);
}

export async function createDeliverable(dealId, { type, dueDate }) {
  const id = uuid();
  await run("INSERT INTO deal_deliverable (id, deal_id, type, due_date, status) VALUES (?, ?, ?, ?, 'PENDING')", [id, dealId, type, dueDate]);
  return one("SELECT * FROM deal_deliverable WHERE id = ?", [id]);
}

// Proof-of-fulfillment: a deliverable moves PENDING -> PUBLISHED only once a
// link to the actually-published content (and an optional note) is attached
// — status alone was previously just self-reported with nothing backing it.
export async function markDeliverableFulfilled(id, { proofUrl, proofNote }) {
  if (!proofUrl) throw new Error("Kanıt linki olmadan teslimat tamamlandı işaretlenemez");
  await run(
    "UPDATE deal_deliverable SET status = 'PUBLISHED', proof_url = ?, proof_note = ?, fulfilled_at = ? WHERE id = ?",
    [proofUrl, proofNote || null, new Date().toISOString(), id]
  );
  return one("SELECT * FROM deal_deliverable WHERE id = ?", [id]);
}

// ---------- Bookings ----------

export async function getBookings() {
  return all("SELECT * FROM booking ORDER BY date ASC");
}

// ---------- Personas ----------

export async function getPersonas() {
  return all("SELECT * FROM persona ORDER BY id ASC");
}

// ---------- Profile ----------

export async function getProfile() {
  const profile = await one("SELECT * FROM profile LIMIT 1");
  if (!profile) throw new Error("No profile seeded yet");
  profile.accounts = await all("SELECT * FROM social_account WHERE profile_id = ?", [profile.id]);
  return profile;
}

export async function updateProfile(data) {
  const profile = await getProfile();
  const fields = [];
  const params = [];
  if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
  if (data.bio !== undefined) { fields.push("bio = ?"); params.push(data.bio); }
  if (data.activePersonaId !== undefined) { fields.push("active_persona_id = ?"); params.push(data.activePersonaId); }
  if (data.onboardingCompleted !== undefined) { fields.push("onboarding_completed = ?"); params.push(data.onboardingCompleted ? 1 : 0); }
  if (fields.length === 0) return getProfile();
  params.push(profile.id);
  await run(`UPDATE profile SET ${fields.join(", ")} WHERE id = ?`, params);
  return getProfile();
}

// ---------- App settings (key/value) ----------

export async function getSettings() {
  const rows = await all("SELECT key, value FROM app_setting");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key, value) {
  await run("INSERT INTO app_setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, String(value)]);
}

// ---------- Link bundles + send tracking ----------
// "Tracking" here counts bundles the user confirmed sending through the app.
// Real click tracking would need a server-side redirect, which we don't have.

export async function getLinkBundles() {
  const bundles = await all("SELECT * FROM link_bundle ORDER BY created_at ASC");
  for (const b of bundles) {
    b.items = await all("SELECT * FROM link_bundle_item WHERE bundle_id = ? ORDER BY position ASC", [b.id]);
  }
  return bundles;
}

export async function createLinkBundle({ name, items }) {
  const id = uuid();
  await run("INSERT INTO link_bundle (id, name, created_at) VALUES (?, ?, ?)", [id, name, new Date().toISOString()]);
  for (const [i, it] of items.entries()) {
    await run("INSERT INTO link_bundle_item (id, bundle_id, label, url, position) VALUES (?, ?, ?, ?, ?)", [uuid(), id, it.label || null, it.url, i]);
  }
  return id;
}

export async function deleteLinkBundle(id) {
  await run("DELETE FROM link_bundle_item WHERE bundle_id = ?", [id]);
  await run("DELETE FROM link_send WHERE bundle_id = ?", [id]);
  await run("DELETE FROM link_bundle WHERE id = ?", [id]);
}

export async function recordLinkSends(threadId, route, bundleIds) {
  const now = new Date().toISOString();
  for (const bundleId of bundleIds) {
    await run("INSERT INTO link_send (id, bundle_id, thread_id, route, sent_at) VALUES (?, ?, ?, ?, ?)", [uuid(), bundleId, threadId, route, now]);
  }
}

export async function getLinkStats() {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const total = (await one("SELECT COUNT(*) AS c FROM link_send"))?.c ?? 0;
  const last7 = (await one("SELECT COUNT(*) AS c FROM link_send WHERE sent_at >= ?", [since]))?.c ?? 0;
  const byBundle = await all(
    `SELECT b.id AS bundleId, b.name AS name, COUNT(s.id) AS count, MAX(s.sent_at) AS lastSent
     FROM link_bundle b LEFT JOIN link_send s ON s.bundle_id = b.id GROUP BY b.id ORDER BY count DESC, b.created_at ASC`
  );
  const byRoute = await all("SELECT route, COUNT(*) AS count FROM link_send GROUP BY route ORDER BY count DESC");
  return { total: Number(total), last7: Number(last7), byBundle, byRoute };
}

export async function getAccounts() {
  const profile = await getProfile();
  return profile.accounts;
}

// Adds another connected account, e.g. a second Instagram DM inbox — the
// free/pro account-count gate is enforced by the caller (app.js), which
// knows the entitlement tier; this layer only persists the row.
export async function createAccount({ channel, handle }) {
  const profile = await getProfile();
  const id = uuid();
  await run(
    "INSERT INTO social_account (id, profile_id, channel, handle, connection_state, connected_since, restriction_reason) VALUES (?, ?, ?, ?, 'CONNECTED', ?, NULL)",
    [id, profile.id, channel, handle, new Date().toISOString()]
  );
  return one("SELECT * FROM social_account WHERE id = ?", [id]);
}

export async function deleteAccount(id) {
  await run("UPDATE thread SET account_id = NULL WHERE account_id = ?", [id]);
  await run("DELETE FROM social_account WHERE id = ?", [id]);
}
