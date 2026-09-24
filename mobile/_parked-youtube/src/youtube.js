// YouTube comments (Pro). Talks straight to Google from the device — no server
// of ours. The user signs in with their own Google account through the system
// browser (OAuth 2.0 authorization-code flow with PKCE, the flow Google
// prescribes for installed apps, so there is no client secret in the app), the
// tokens live in the device's secure storage, and the YouTube Data API is
// called with them.
//
// Scope: youtube.force-ssl — the narrowest scope that allows both reading
// comment threads and posting replies.
//
// NOTE — placeholders that need real values once a Google Cloud project exists
// (see the README section in the hand-over notes):
//   - CLIENT_IDS: OAuth client IDs of type "iOS" and "Android" (Google Cloud
//     console -> APIs & Services -> Credentials).
//   - The iOS URL scheme in Info.plist must be the reversed iOS client ID, and
//     the Android scheme is the package name (already registered).

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const CLIENT_IDS = {
  ios: "REPLACE_WITH_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com",
  android: "REPLACE_WITH_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com",
};
const ANDROID_PACKAGE = "com.creatoros.app";
const SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/youtube/v3";

const SESSION_KEY = "creatoros_youtube_session";
const PKCE_KEY = "creatoros_youtube_pkce";

export class YoutubeError extends Error {
  // kind: "auth" (must reconnect) | "quota" | "network" | "api"
  constructor(message, kind, status) {
    super(message);
    this.name = "YoutubeError";
    this.kind = kind;
    this.status = status;
  }
}

// ---------- configuration ----------

function platform() {
  return Capacitor.getPlatform();
}

function clientId() {
  return CLIENT_IDS[platform()] ?? null;
}

// Available only in a native build that has a real client ID.
export function isConfigured() {
  const id = clientId();
  return Boolean(id) && !id.startsWith("REPLACE_WITH_");
}

export function redirectUri() {
  if (platform() === "ios") {
    const reversed = `com.googleusercontent.apps.${clientId().replace(".apps.googleusercontent.com", "")}`;
    return `${reversed}:/oauth2redirect`;
  }
  return `${ANDROID_PACKAGE}:/oauth2redirect`;
}

export function isRedirect(url) {
  try {
    return isConfigured() && String(url).startsWith(redirectUri());
  } catch {
    return false;
  }
}

// ---------- secure storage helpers ----------

async function readJson(key) {
  try {
    const { value } = await SecureStoragePlugin.get({ key });
    return value ? JSON.parse(value) : null;
  } catch {
    return null; // plugin throws when the key doesn't exist
  }
}

async function writeJson(key, value) {
  await SecureStoragePlugin.set({ key, value: JSON.stringify(value) });
}

async function removeKey(key) {
  await SecureStoragePlugin.remove({ key }).catch(() => {});
}

export async function getSession() {
  return readJson(SESSION_KEY);
}

// ---------- PKCE ----------

function base64Url(bytes) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLength) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

// ---------- sign-in ----------

// Opens Google's consent page in the system browser. The result comes back
// through the app's URL scheme -> completeSignIn(). The PKCE verifier is kept in
// secure storage (not memory) because the app can be recreated while the user
// is in the browser.
export async function beginSignIn() {
  if (!isConfigured()) throw new YoutubeError("YouTube is not configured in this build", "api");
  const verifier = randomString(48);
  const state = randomString(16);
  await writeJson(PKCE_KEY, { verifier, state });
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: "S256",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  await Browser.open({ url: `${AUTH_URL}?${params}` });
}

async function tokenRequest(body) {
  let response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId(), ...body }),
    });
  } catch {
    throw new YoutubeError("Network error while contacting Google", "network");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const invalid = data.error === "invalid_grant";
    throw new YoutubeError(data.error_description || data.error || `Google token error ${response.status}`, invalid ? "auth" : "api", response.status);
  }
  return data;
}

// Handles the redirect: verifies `state`, swaps the code for tokens, looks up
// the user's channel and stores everything. Returns { channelId, channelTitle }.
export async function completeSignIn(url) {
  await Browser.close().catch(() => {});
  const parsed = new URL(url);
  const pkce = await readJson(PKCE_KEY);
  await removeKey(PKCE_KEY);
  const error = parsed.searchParams.get("error");
  if (error) throw new YoutubeError(error === "access_denied" ? "Access was not granted" : error, "auth");
  const code = parsed.searchParams.get("code");
  if (!pkce || !code || parsed.searchParams.get("state") !== pkce.state) {
    throw new YoutubeError("Sign-in response did not match the request", "auth");
  }
  const tokens = await tokenRequest({
    code,
    code_verifier: pkce.verifier,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  const session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000,
  };
  if (!session.refreshToken) throw new YoutubeError("Google did not return a refresh token", "auth");
  const channel = await fetchOwnChannel(session.accessToken);
  await writeJson(SESSION_KEY, { ...session, channelId: channel.id, channelTitle: channel.title });
  return { channelId: channel.id, channelTitle: channel.title };
}

async function accessToken() {
  const session = await getSession();
  if (!session) throw new YoutubeError("Not connected to YouTube", "auth");
  if (session.expiresAt - 60_000 > Date.now()) return { token: session.accessToken, session };
  let tokens;
  try {
    tokens = await tokenRequest({ refresh_token: session.refreshToken, grant_type: "refresh_token" });
  } catch (err) {
    if (err.kind === "auth") await removeKey(SESSION_KEY); // revoked or expired: the user must reconnect
    throw err;
  }
  const next = { ...session, accessToken: tokens.access_token, expiresAt: Date.now() + Number(tokens.expires_in ?? 3600) * 1000 };
  await writeJson(SESSION_KEY, next);
  return { token: next.accessToken, session: next };
}

export async function signOut() {
  const session = await getSession();
  await removeKey(SESSION_KEY);
  await removeKey(PKCE_KEY);
  const token = session?.refreshToken ?? session?.accessToken;
  if (token) fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {}); // best effort
}

// ---------- Data API ----------

async function api(path, { params = {}, method = "GET", body, token } = {}) {
  const bearer = token ?? (await accessToken()).token;
  let response;
  try {
    response = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, {
      method,
      headers: { Authorization: `Bearer ${bearer}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new YoutubeError("Network error while contacting YouTube", "network");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason ?? "";
    const message = data?.error?.message || `YouTube API error ${response.status}`;
    if (response.status === 401) throw new YoutubeError(message, "auth", 401);
    if (reason === "quotaExceeded" || reason === "rateLimitExceeded") throw new YoutubeError(message, "quota", response.status);
    throw new YoutubeError(message, "api", response.status);
  }
  return data;
}

async function fetchOwnChannel(token) {
  const data = await api("channels", { params: { part: "snippet", mine: "true" }, token });
  const item = data.items?.[0];
  if (!item) throw new YoutubeError("This Google account has no YouTube channel", "api");
  return { id: item.id, title: item.snippet?.title ?? item.id };
}

// New top-level comments on any of the channel's videos, newest first.
// Comments by the channel itself, and threads the channel already replied to,
// are skipped. `sinceIso` bounds how far back to look.
export async function fetchNewComments({ sinceIso, limit = 50 } = {}) {
  const { session } = await accessToken();
  const data = await api("commentThreads", {
    params: {
      part: "snippet,replies",
      allThreadsRelatedToChannelId: session.channelId,
      order: "time",
      maxResults: String(Math.min(limit, 100)),
      textFormat: "plainText",
    },
  });
  const since = sinceIso ? new Date(sinceIso).getTime() : 0;
  return (data.items ?? [])
    .map((item) => {
      const top = item.snippet.topLevelComment;
      const s = top.snippet;
      const repliedByOwner = (item.replies?.comments ?? []).some((r) => r.snippet?.authorChannelId?.value === session.channelId);
      return {
        externalId: top.id,
        author: s.authorDisplayName,
        authorChannelId: s.authorChannelId?.value ?? null,
        text: s.textOriginal ?? s.textDisplay ?? "",
        publishedAt: s.publishedAt,
        videoId: s.videoId,
        url: s.videoId ? `https://www.youtube.com/watch?v=${s.videoId}&lc=${top.id}` : null,
        skip: s.authorChannelId?.value === session.channelId || repliedByOwner,
      };
    })
    .filter((c) => !c.skip && c.text && new Date(c.publishedAt).getTime() > since)
    .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)); // oldest first, so the inbox ends up newest-on-top
}

// Posts `text` as a reply under the comment with id `parentId`.
export async function replyToComment(parentId, text) {
  return api("comments", { method: "POST", params: { part: "snippet" }, body: { snippet: { parentId, textOriginal: text } } });
}
