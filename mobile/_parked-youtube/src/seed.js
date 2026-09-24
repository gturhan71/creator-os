// First-launch demo data (Turkish content). Every
// timestamp here is computed RELATIVE TO "now" at first launch, so the
// "bugün / dün / N gün önce" narrative in the Inbox and the "upcoming"
// bookings/payments stay correct no matter when someone actually installs
// the app — not hardcoded to a September 2026 demo date.

const HOUR = 3_600_000;
const DAY = 86_400_000;

function iso(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

export async function runLinkSeed({ createLinkBundle }) {
  await createLinkBundle({
    name: "Ceket & Kombin Linkleri",
    items: [
      { label: "Mango ceket", url: "https://example.com/elif/ceket" },
      { label: "İndirim kodu ELIF10", url: "https://example.com/elif/indirim" },
    ],
  });
  await createLinkBundle({
    name: "Marka İş Birliği Paketi",
    items: [
      { label: "Media kit", url: "https://example.com/elif/mediakit" },
      { label: "Fiyat listesi", url: "https://example.com/elif/fiyat" },
      { label: "Önceki çalışmalar", url: "https://example.com/elif/portfolyo" },
    ],
  });
}

export async function runSeed({ run, uuid }) {
  // ---------- Personas ----------
  const personas = [
    {
      id: "samimi",
      name: "Samimi / Günlük",
      description: 'Kısa, sıcak cümleler; emoji kullanımı yüksek; "canım", "tatlım" gibi hitaplar.',
      example: "Ay çok tatlısın teşekkürler 🥹 bio'daki linkte bulabilirsin!",
    },
    {
      id: "profesyonel",
      name: "Profesyonel / Bilgilendirici",
      description: "Net, ölçülü cümleler; emoji az; marka görüşmelerinde tercih edilir.",
      example: "Merhaba, ilginiz için teşekkür ederim. Detayları değerlendirip bu hafta içinde dönüş yapacağım.",
    },
    {
      id: "esprili",
      name: "Esprili",
      description: "Espri ve günlük dil ağırlıklı; takipçiyle yakınlık kuran, rahat ton.",
      example: "Hahaha bu soruyu her gün alıyorum, artık bio'ya sabitleyeceğim galiba 😂 link orada!",
    },
  ];
  for (const p of personas) {
    await run("INSERT INTO persona (id, name, description, example) VALUES (?, ?, ?, ?)", [p.id, p.name, p.description, p.example]);
  }

  // ---------- Profile ----------
  const profileId = uuid();
  await run(
    "INSERT INTO profile (id, name, handle, bio, followers_count, following_count, posts_count, active_persona_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [profileId, "Elif Kaya", "@elifkayastudio", "Moda & yaşam tarzı içerik üreticisi · İstanbul", 184000, 312, 1204, "samimi"]
  );

  // ---------- Social accounts ----------
  const accounts = [
    { channel: "INSTAGRAM_DM", handle: "@elifkayastudio", connected: true },
    { channel: "INSTAGRAM_COMMENT", handle: "@elifkayastudio", connected: true },
    { channel: "EMAIL", handle: "elif@elifkayastudio.com", connected: true },
    {
      channel: "TIKTOK",
      handle: "@elifkaya",
      connected: false,
      reason:
        "TikTok'un resmi API'si organik yorumdan tetiklenen DM'i desteklemiyor (Business Messaging API yalnız TikTok Business hesaplarında, mevcut sohbet içi otomatik yanıtla sınırlı).",
    },
    {
      channel: "WHATSAPP",
      handle: null,
      connected: false,
      reason:
        "WhatsApp Business API için iş doğrulama ve 2026 politikası gereği somut görev odaklı akış şart — genel sohbet botu olarak açılmadı, Deal Desk bildirimleri için Faz 2'de değerlendiriliyor.",
    },
  ];
  for (const a of accounts) {
    await run(
      "INSERT INTO social_account (id, profile_id, channel, handle, connection_state, connected_since, restriction_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uuid(), profileId, a.channel, a.handle, a.connected ? "CONNECTED" : "RESTRICTED", a.connected ? iso(-30 * DAY) : null, a.reason ?? null]
    );
  }

  // ---------- Threads ----------
  const threads = [
    {
      id: "t1", channel: "INSTAGRAM_COMMENT", sender: "merveyildiz_",
      snippet: "üstündeki ceket nereden bu şekilde kesinlikle almam lazım 😍",
      fullMessage: "üstündeki ceket nereden bu şekilde kesinlikle almam lazım 😍 link atar mısın",
      intent: "FAN", confidence: 0.94, status: "PENDING", unread: 1,
      aiDraftText: "Merhaba canım! Ceket Mango'dan, bio'daki linkte kod ELIF10 ile %10 indirim var 🤍",
      personaId: "samimi", receivedAt: iso(-2 * HOUR),
    },
    {
      id: "t2", channel: "INSTAGRAM_DM", sender: "Aslı — Lumen Kozmetik",
      snippet: "Merhaba Elif, yeni seri lansmanımız için iş birliği yapmak isteriz...",
      fullMessage: "Merhaba Elif, yeni seri lansmanımız için iş birliği yapmak isteriz. 2 reels + 3 story için bütçemiz 45.000 TL. Uygun musun, detayları konuşabilir miyiz?",
      intent: "BRAND_DEAL", confidence: 0.98, status: "PENDING", unread: 1,
      aiDraftText: "Merhaba Aslı, ilginiz için teşekkürler! Teklifi değerlendiriyorum, kapsam ve teslim tarihleriyle ilgili birkaç sorum olacak — bugün içinde dönüş yapacağım.",
      personaId: "samimi", receivedAt: iso(-3 * HOUR),
    },
    {
      id: "t3", channel: "INSTAGRAM_COMMENT", sender: "cansu.d",
      snippet: "bu ruj tonu tam sana yakışmış ♥️", fullMessage: "bu ruj tonu tam sana yakışmış ♥️ hangi marka",
      intent: "FAN", confidence: 0.91, status: "REPLIED", unread: 0,
      aiDraftText: "Teşekkürler tatlım! NARS Powermatte, ton adı 'Dragon Girl' 💄",
      personaId: "samimi", receivedAt: iso(-4 * HOUR),
    },
    {
      id: "t4", channel: "EMAIL", sender: "brief@velvetshoes.com.tr",
      snippet: "Sonbahar koleksiyonu için sponsorlu içerik teklifi",
      fullMessage: "Merhaba, Velvet Shoes olarak sonbahar koleksiyonumuz için 1 adet reels çekimi teklif ediyoruz. Bütçe: 18.000 TL + ürün hediyesi. Teslim: 2 hafta içinde.",
      intent: "BRAND_DEAL", confidence: 0.89, status: "PENDING", unread: 0,
      aiDraftText: "Merhaba, teklif için teşekkürler. Bütçe ve kapsamı inceliyorum, bu hafta içinde dönüş yapacağım.",
      personaId: "profesyonel", receivedAt: iso(-1 * DAY - 5 * HOUR),
    },
    {
      id: "t5", channel: "INSTAGRAM_DM", sender: "zeynep.acar",
      snippet: "canlı yayında bahsettiğin cilt bakım rutinini yazar mısın",
      fullMessage: "canlı yayında bahsettiğin cilt bakım rutinini yazar mısın, çok merak ettim",
      intent: "FAN", confidence: 0.87, status: "REPLIED", unread: 0,
      aiDraftText: "Tabii! Sabah: C vitamini serum + nemlendirici + SPF. Akşam: retinol + nemlendirici. Highlights'ta 'Cilt Bakımı' altında detaylı anlattım 🤍",
      personaId: "samimi", receivedAt: iso(-1 * DAY - 2 * HOUR),
    },
    {
      id: "t6", channel: "INSTAGRAM_DM", sender: "unknown_promo_88",
      snippet: "500K takipçi garantili, hemen tıkla...",
      fullMessage: "500K takipçi garantili, hemen tıkla: bit.ly/xyz123 sınırlı teklif kaçırma!",
      intent: "SPAM", confidence: 0.99, status: "HIDDEN", unread: 0,
      aiDraftText: null, personaId: null, receivedAt: iso(-2 * DAY - 9 * HOUR),
    },
    {
      id: "t7", channel: "INSTAGRAM_DM", sender: "Deniz — Studio Nomi PR",
      snippet: "Cuma günü ofiste ürün tanıtım görüşmesi ayarlayabilir miyiz?",
      fullMessage: "Merhaba, yeni sezon aksesuar koleksiyonumuzu birebir göstermek isteriz. Bu hafta cuma 14:00 uygun mu?",
      intent: "BOOKING_REQUEST", confidence: 0.82, status: "PENDING", unread: 0,
      aiDraftText: "Merhaba Deniz, cuma 14:00 tarafımda uygun görünüyor, takvime ekliyorum — teyit mailini bekliyorum.",
      personaId: "samimi", receivedAt: iso(-2 * DAY - 6 * HOUR),
    },
    {
      id: "t8", channel: "INSTAGRAM_COMMENT", sender: "irem_k",
      snippet: "sesin çok tatlıymış bu videoda 🥹",
      fullMessage: "sesin çok tatlıymış bu videoda 🥹 podcast falan düşünüyor musun",
      intent: "FAN", confidence: 0.78, status: "REPLIED", unread: 0,
      aiDraftText: "Ay çok tatlısın teşekkürler 🥹 podcast fikri aklımda var, bekleyin bizi!",
      personaId: "samimi", receivedAt: iso(-3 * DAY - 3 * HOUR),
    },
  ];
  for (const th of threads) {
    await run(
      `INSERT INTO thread (id, channel, sender, snippet, full_message, intent, confidence, classified_by, status, unread, ai_draft_text, persona_id, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'RULE_BASED', ?, ?, ?, ?, ?)`,
      [th.id, th.channel, th.sender, th.snippet, th.fullMessage, th.intent, th.confidence, th.status, th.unread, th.aiDraftText, th.personaId, th.receivedAt]
    );
  }

  // ---------- Booking template (t7) + upcoming bookings ----------
  await run(
    "INSERT INTO booking_template (id, thread_id, title, date, start_time, end_time, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [uuid(), "t7", "Studio Nomi — Ürün Tanıtım Görüşmesi", iso(3 * DAY), "14:00", "14:30", "BRAND_CALL"]
  );
  await run(
    "INSERT INTO booking (id, title, date, start_time, end_time, type, source_thread_id) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    [uuid(), "Velvet Shoes — Çekim Planlama", iso(2 * DAY), "11:00", "12:00", "SHOOT_PLANNING"]
  );
  await run(
    "INSERT INTO booking (id, title, date, start_time, end_time, type, source_thread_id) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    [uuid(), "Lumen Kozmetik — Brief Görüşmesi", iso(4 * DAY), "16:30", "17:00", "BRAND_CALL"]
  );

  // ---------- Deals ----------
  const deals = [
    { id: "d1", brand: "Lumen Kozmetik", category: "Kozmetik", amount: 45000, inKindBonus: null, deliverablesSummary: "2 reels + 3 story", stage: "OFFER_RECEIVED", sourceThreadId: "t2" },
    { id: "d2", brand: "Velvet Shoes", category: "Moda", amount: 18000, inKindBonus: "ürün", deliverablesSummary: "1 reels", stage: "OFFER_RECEIVED", sourceThreadId: "t4" },
    { id: "d3", brand: "Bloom Çiçekçilik", category: "Yaşam Tarzı", amount: 12000, inKindBonus: null, deliverablesSummary: "1 story serisi", stage: "UNDER_REVIEW", sourceThreadId: null },
    { id: "d4", brand: "Nova Teknoloji", category: "Teknoloji", amount: 60000, inKindBonus: null, deliverablesSummary: "1 reels + 1 YouTube entegrasyon", stage: "UNDER_REVIEW", sourceThreadId: null },
    { id: "d5", brand: "Studio Nomi", category: "Aksesuar", amount: 22000, inKindBonus: null, deliverablesSummary: "2 story + 1 post", stage: "AWAITING_CONTRACT", sourceThreadId: "t7" },
    { id: "d6", brand: "Kahve Dükkanı Co.", category: "Gıda & İçecek", amount: 9000, inKindBonus: "ürün", deliverablesSummary: "1 story", stage: "SIGNED", sourceThreadId: null },
  ];
  for (const d of deals) {
    await run(
      "INSERT INTO deal (id, brand, category, amount, currency, in_kind_bonus, deliverables_summary, stage, source_thread_id) VALUES (?, ?, ?, ?, 'TRY', ?, ?, ?, ?)",
      [d.id, d.brand, d.category, d.amount, d.inKindBonus, d.deliverablesSummary, d.stage, d.sourceThreadId]
    );
  }

  // ---------- Post-Deal Ops for the signed deal (d6) ----------
  await run("INSERT INTO deal_deliverable (id, deal_id, type, due_date, status) VALUES (?, 'd6', '1 story', ?, 'PUBLISHED')", [uuid(), iso(-5 * DAY)]);
  await run("INSERT INTO deal_payment (id, deal_id, milestone, amount, currency, status, due_date) VALUES (?, 'd6', 'Ön ödeme (%50)', 4500, 'TRY', 'PAID', NULL)", [uuid()]);
  await run("INSERT INTO deal_payment (id, deal_id, milestone, amount, currency, status, due_date) VALUES (?, 'd6', 'Teslimat sonrası (%50)', 4500, 'TRY', 'PENDING', ?)", [uuid(), iso(4 * DAY)]);
  await run("INSERT INTO deal_performance (id, deal_id, reach, engagement_rate, link_clicks) VALUES (?, 'd6', 42300, 6.8, 187)", [uuid()]);
}
