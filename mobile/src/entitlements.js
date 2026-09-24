// Wraps @revenuecat/purchases-capacitor for the "Creator OS Pro" subscription
// and capacitor-secure-storage-plugin (iOS Keychain / Android Keystore) for
// the user's own OpenAI key. RevenueCat is a third-party service, not
// something we host — "no backend" here means no server *of ours*.
//
// NOTE — placeholders that need real values once the user has App Store
// Connect / Google Play Console + a RevenueCat account:
//   - REVENUECAT_API_KEY: from the RevenueCat dashboard (platform-specific).
//   - PRO_ENTITLEMENT_ID: the entitlement identifier configured in RevenueCat
//     (this file assumes it's called "pro").

import { Purchases } from "@revenuecat/purchases-capacitor";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const REVENUECAT_API_KEY = {
  ios: "REPLACE_WITH_REVENUECAT_IOS_API_KEY",
  android: "REPLACE_WITH_REVENUECAT_ANDROID_API_KEY",
};
const PRO_ENTITLEMENT_ID = "pro";
const OPENAI_KEY_STORAGE_KEY = "creatoros_openai_api_key";
const DEV_PRO_OVERRIDE_KEY = "creatoros_dev_pro_override";

let configured = false;
let cachedIsPro = false;

// The Siri shortcuts run in native Swift and can't call into this module, so
// the Pro state is mirrored into UserDefaults (key "CapacitorStorage.creatoros_is_pro")
// for them to read. Best-effort: a failure here must never affect the app.
function mirrorProFlag() {
  Preferences.set({ key: "creatoros_is_pro", value: cachedIsPro ? "1" : "0" }).catch(() => {});
}

export async function configure() {
  if (configured) return;
  const platform = Capacitor.getPlatform();
  if (platform !== "ios" && platform !== "android") {
    // Web (our Browser-pane / dev testing): RevenueCat's native SDKs don't
    // run here. Fall back to a local dev-only override so the Pro-gated UI
    // can still be exercised without a native build — see devSetProOverride().
    configured = true;
    cachedIsPro = localStorage.getItem(DEV_PRO_OVERRIDE_KEY) === "true";
    return;
  }

  // A RevenueCat failure (placeholder API key until a real account exists,
  // no network, etc.) must NEVER block the app — the free, on-device tier
  // has to work regardless of whether Pro/IAP is reachable. Degrade to
  // "not Pro" and let the Profile screen's upgrade button surface the real
  // error if the user tries to purchase.
  try {
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY[platform] });
    await refreshCustomerInfo();
  } catch (err) {
    console.warn("RevenueCat configure failed — continuing in free tier:", err?.message ?? err);
    cachedIsPro = false;
  }
  configured = true;
  mirrorProFlag();
}

async function refreshCustomerInfo() {
  if (Capacitor.getPlatform() !== "ios" && Capacitor.getPlatform() !== "android") {
    cachedIsPro = localStorage.getItem(DEV_PRO_OVERRIDE_KEY) === "true";
    return cachedIsPro;
  }
  const { customerInfo } = await Purchases.getCustomerInfo();
  cachedIsPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  return cachedIsPro;
}

export function isPro() {
  return cachedIsPro;
}

function isNative() {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

export async function getOfferings() {
  if (!isNative()) return null; // no store to fetch offerings from on web
  return Purchases.getOfferings();
}

// On a real device this triggers the native App Store/Play Store purchase
// sheet via RevenueCat. On web (no store available) it flips the same local
// dev override devSetProOverride() uses, so the Pro-gated UI stays testable
// in the Browser pane without a native build.
export async function purchasePro(pkg) {
  if (!isNative()) {
    devSetProOverride(true);
    return true;
  }
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  cachedIsPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  mirrorProFlag();
  return cachedIsPro;
}

export async function restorePurchases() {
  if (!isNative()) return cachedIsPro;
  const { customerInfo } = await Purchases.restorePurchases();
  cachedIsPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  mirrorProFlag();
  return cachedIsPro;
}

// Web-only helper so Pro-gated screens are testable in the Browser pane
// before a native build exists. No-op on a real device.
export function devSetProOverride(value) {
  if (Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android") return;
  localStorage.setItem(DEV_PRO_OVERRIDE_KEY, value ? "true" : "false");
  cachedIsPro = value;
}

// ---------- OpenAI key (Pro only, device secure storage) ----------

export async function getOpenAiKey() {
  try {
    const { value } = await SecureStoragePlugin.get({ key: OPENAI_KEY_STORAGE_KEY });
    return value || null;
  } catch {
    return null; // plugin throws when the key doesn't exist yet
  }
}

export async function setOpenAiKey(key) {
  if (!key) {
    await SecureStoragePlugin.remove({ key: OPENAI_KEY_STORAGE_KEY }).catch(() => {});
    return;
  }
  await SecureStoragePlugin.set({ key: OPENAI_KEY_STORAGE_KEY, value: key });
}

export async function hasOpenAiKey() {
  return Boolean(await getOpenAiKey());
}
