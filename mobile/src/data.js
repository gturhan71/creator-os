// Creator OS — UI-only display config. Domain data (threads, deals, bookings,
// personas, profile) lives in the on-device SQLite database (see db.js) — this
// file only holds display metadata: colors, icons, and the marketing-style
// "why this beats competitors" copy.
// Keys match the database enum values exactly (Channel, IntentCategory,
// DealStage, DeliverableStatus, PaymentStatus) so lookups are direct.

const INTENT_META = {
  FAN: { label: { tr: "Hayran 💛", en: "Fan 💛" }, color: "#17b26a" },
  BRAND_DEAL: { label: { tr: "Marka Teklifi", en: "Brand Deal" }, color: "#8b5cf6" },
  COLLABORATION: { label: { tr: "İş Birliği", en: "Collaboration" }, color: "#8b5cf6" },
  BOOKING_REQUEST: { label: { tr: "Randevu Talebi", en: "Booking Request" }, color: "#2f8fff" },
  SPAM: { label: { tr: "Spam 🚫", en: "Spam 🚫" }, color: "#ff4d4f" },
};

const CHANNEL_META = {
  INSTAGRAM_DM: { label: { tr: "Instagram DM", en: "Instagram DM" }, icon: "◈" },
  INSTAGRAM_COMMENT: { label: { tr: "Instagram Yorum", en: "Instagram Comment" }, icon: "◇" },
  EMAIL: { label: { tr: "E-posta", en: "Email" }, icon: "✉" },
  TIKTOK: { label: { tr: "TikTok", en: "TikTok" }, icon: "♪" },
  WHATSAPP: { label: { tr: "WhatsApp", en: "WhatsApp" }, icon: "☎" },
};

const DEAL_STAGE_META = {
  OFFER_RECEIVED: { tr: "Teklif Alındı", en: "Offer Received" },
  UNDER_REVIEW: { tr: "Değerlendiriliyor", en: "Under Review" },
  AWAITING_CONTRACT: { tr: "Sözleşme Bekliyor", en: "Awaiting Contract" },
  SIGNED: { tr: "İmzalandı", en: "Signed" },
};

// Every important feature's explanation of which Piyasa Analizi gap (G1-G7)
// it closes and how. Shown on hover via the ⓘ info-tip icons.
const GAP_NOTES = {
  inbox: {
    gap: "G1 + G7",
    text: {
      tr: "Rakiplerin hiçbiri çok kanallı gelen kutusunu otomatik niyet sınıflandırmasıyla birleştirmiyor: ReplyAll kanal sunar ama sınıflandırması öneri bazlı ve zayıf; DM Champ yalnız yorum-tetiklemeli, niyet ayrımı yapmıyor.",
      en: "No competitor combines a multi-channel inbox with automatic intent classification: ReplyAll offers channels but its classification is suggestion-based and weak; DM Champ is comment-triggered only, with no intent distinction.",
    },
  },
  deals: {
    gap: "G2",
    text: {
      tr: "Hiçbir rakip DM otomasyonu ile marka anlaşma yönetimini aynı üründe sunmuyor: Inbox Agent ve Robin yalnız e-posta üzerinden çalışıyor, sosyal medya DM'lerini hiç görmüyor.",
      en: "No competitor offers DM automation and brand-deal management in one product: Inbox Agent and Robin work over email only and never see social DMs.",
    },
  },
  postdeal: {
    gap: "G5",
    text: {
      tr: "İmza sonrası teslimat/ödeme/performans sürecini uçtan uca takip eden hiçbir rakip yok: Inbox Agent süreci sözleşme gönderimine kadar götürüp bırakıyor, sonrası tamamen manuel kalıyor.",
      en: "No competitor tracks delivery/payment/performance end-to-end after signing: Inbox Agent stops at sending the contract, everything after that stays manual.",
    },
  },
  booking: {
    gap: "G3",
    text: {
      tr: "Genel randevu araçları (My AI Front Desk vb.) sosyal medya bağlamını hiç bilmiyor. Burada bir DM'deki randevu talebi doğrudan takvime dönüşüyor — hiçbir influencer aracında bu bağlantı yok.",
      en: "Generic scheduling tools (My AI Front Desk, etc.) know nothing about social media context. Here a booking request in a DM turns straight into a calendar event — no influencer tool has this link.",
    },
  },
  persona: {
    gap: "G4",
    text: {
      tr: "Üslup/ton taklidi bugün yalnızca Meta'nın kapalı, erken-erişim Instagram Creator AI betasında var. Burada açık, her influencer'a sunulabilen bir ürün özelliği olarak tasarlandı.",
      en: "Voice/tone mimicry today exists only in Meta's closed, early-access Instagram Creator AI beta. Here it's designed as an open feature available to every creator.",
    },
  },
};

// Purely cosmetic — a fake "screenshot" grid for the onboarding/profile IG
// card. The backend deliberately doesn't model this (see backend plan).
const IG_MOCK_THUMBS = ["#ffd6a5", "#ffadad", "#caffbf", "#a0c4ff", "#ffc6ff", "#fdffb6"];

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: { tr: "Hoş geldin!", en: "Welcome!" },
    label: { tr: "Kayıt Ol", en: "Sign Up" },
    body: {
      tr: "Creator OS'a birkaç dakikada kur — ajans yok, karmaşık ayar yok. Sadece hesabını bağla, sesini seç, otomasyonu aç.",
      en: "Set up Creator OS in a few minutes — no agency, no complicated setup. Just connect your account, pick your voice, and turn automation on.",
    },
  },
  {
    id: 2,
    title: { tr: "Instagram hesabını bağla", en: "Connect your Instagram account" },
    label: { tr: "Hesap Bağlantısı", en: "Account Connection" },
    body: {
      tr: "Profesyonel Instagram hesabını bağla — DM'ler, yorumlar ve marka teklifleri buradan otomatik akmaya başlasın.",
      en: "Connect your professional Instagram account — DMs, comments, and brand offers start flowing in automatically from here.",
    },
    showIgCard: true,
  },
  {
    id: 3,
    title: { tr: "Tarzını seç", en: "Pick your style" },
    label: { tr: "Persona", en: "Persona" },
    body: {
      tr: "Sana en yakın üslubu seç. İstediğin zaman değiştirebilir, örnekleri kendi cümlelerinle düzenleyebilirsin.",
      en: "Choose the tone closest to you. You can change it anytime and edit the examples in your own words.",
    },
    showPersonaPicker: true,
  },
  {
    id: 4,
    title: { tr: "Örnek yanıtları onayla", en: "Approve sample replies" },
    label: { tr: "Önizleme", en: "Preview" },
    body: {
      tr: "Seçtiğin tarzla yazılmış birkaç örnek yanıtı gözden geçir — beğenmediğini düzenle, beğendiğini onayla.",
      en: "Review a few sample replies written in your chosen style — edit the ones you don't like, approve the ones you do.",
    },
  },
  {
    id: 5,
    title: { tr: "Otomasyonu aç 🎉", en: "Turn automation on 🎉" },
    label: { tr: "Bitti", en: "Done" },
    body: {
      tr: "Her şey hazır! Artık gelen kutunu Creator OS izliyor — sen sahnedeyken o arka planda çalışıyor.",
      en: "Everything's ready! Creator OS is now watching your inbox — it works in the background while you're on stage.",
    },
  },
];
