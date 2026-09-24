// First-launch demo data, in Turkish (tr) or English (every other language:
// the demo content is fictional and only needs to read naturally). Every
// timestamp is computed RELATIVE TO "now" at first launch, so the "today /
// yesterday / N days ago" narrative in the Inbox and the "upcoming"
// bookings/payments stay correct no matter when someone actually installs
// the app — not hardcoded to a September 2026 demo date.

const HOUR = 3_600_000;
const DAY = 86_400_000;

function iso(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

// pick(lang)(turkish, english)
const pick = (lang) => (tr, en) => (lang === "tr" ? tr : en);

export async function runLinkSeed({ createLinkBundle, lang = "tr" }) {
  const T = pick(lang);
  await createLinkBundle({
    name: T("Ceket & Kombin Linkleri", "Jacket & Outfit Links"),
    items: [
      { label: T("Mango ceket", "Mango jacket"), url: "https://example.com/elif/ceket" },
      { label: T("İndirim kodu ELIF10", "Discount code ELIF10"), url: "https://example.com/elif/indirim" },
    ],
  });
  await createLinkBundle({
    name: T("Marka İş Birliği Paketi", "Brand Collaboration Pack"),
    items: [
      { label: "Media kit", url: "https://example.com/elif/mediakit" },
      { label: T("Fiyat listesi", "Rate card"), url: "https://example.com/elif/fiyat" },
      { label: T("Önceki çalışmalar", "Previous work"), url: "https://example.com/elif/portfolyo" },
    ],
  });
}

export async function runSeed({ run, uuid, lang = "tr" }) {
  const T = pick(lang);
  const currency = T("TRY", "USD");

  // ---------- Personas ----------
  const personas = [
    {
      id: "samimi",
      name: T("Samimi / Günlük", "Friendly / Casual"),
      description: T(
        'Kısa, sıcak cümleler; emoji kullanımı yüksek; "canım", "tatlım" gibi hitaplar.',
        'Short, warm sentences; lots of emoji; affectionate terms like "hun" and "lovely".'
      ),
      example: T(
        "Ay çok tatlısın teşekkürler 🥹 bio'daki linkte bulabilirsin!",
        "Aww you're so sweet, thank you 🥹 you can find it at the link in my bio!"
      ),
    },
    {
      id: "profesyonel",
      name: T("Profesyonel / Bilgilendirici", "Professional / Informative"),
      description: T(
        "Net, ölçülü cümleler; emoji az; marka görüşmelerinde tercih edilir.",
        "Clear, measured sentences; few emoji; preferred for brand conversations."
      ),
      example: T(
        "Merhaba, ilginiz için teşekkür ederim. Detayları değerlendirip bu hafta içinde dönüş yapacağım.",
        "Hello, thank you for your interest. I'll review the details and get back to you this week."
      ),
    },
    {
      id: "esprili",
      name: T("Esprili", "Witty"),
      description: T(
        "Espri ve günlük dil ağırlıklı; takipçiyle yakınlık kuran, rahat ton.",
        "Humour and everyday language; a relaxed tone that builds closeness with followers."
      ),
      example: T(
        "Hahaha bu soruyu her gün alıyorum, artık bio'ya sabitleyeceğim galiba 😂 link orada!",
        "Hahaha I get this question every day, I should just pin it to my bio 😂 the link is there!"
      ),
    },
  ];
  for (const p of personas) {
    await run("INSERT INTO persona (id, name, description, example) VALUES (?, ?, ?, ?)", [p.id, p.name, p.description, p.example]);
  }

  // ---------- Profile ----------
  const profileId = uuid();
  await run(
    "INSERT INTO profile (id, name, handle, bio, followers_count, following_count, posts_count, active_persona_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [profileId, "Elif Kaya", "@elifkayastudio", T("Moda & yaşam tarzı içerik üreticisi · İstanbul", "Fashion & lifestyle creator · Istanbul"), 184000, 312, 1204, "samimi"]
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
      reason: T(
        "TikTok'un resmi API'si organik yorumdan tetiklenen DM'i desteklemiyor (Business Messaging API yalnız TikTok Business hesaplarında, mevcut sohbet içi otomatik yanıtla sınırlı).",
        "TikTok's official API doesn't support DMs triggered by organic comments (the Business Messaging API is limited to TikTok Business accounts and in-conversation auto-replies)."
      ),
    },
    {
      channel: "WHATSAPP",
      handle: null,
      connected: false,
      reason: T(
        "WhatsApp Business API için iş doğrulama ve 2026 politikası gereği somut görev odaklı akış şart — genel sohbet botu olarak açılmadı, Deal Desk bildirimleri için Faz 2'de değerlendiriliyor.",
        "The WhatsApp Business API requires business verification and, under the 2026 policy, a concrete task-focused flow — it isn't offered as a general chatbot; Deal Desk notifications are being considered for phase 2."
      ),
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
      snippet: T("üstündeki ceket nereden bu şekilde kesinlikle almam lazım 😍", "where is your jacket from I absolutely need it 😍"),
      fullMessage: T(
        "üstündeki ceket nereden bu şekilde kesinlikle almam lazım 😍 link atar mısın",
        "where is your jacket from I absolutely need it 😍 can you send the link"
      ),
      intent: "FAN", confidence: 0.94, status: "PENDING", unread: 1,
      aiDraftText: T(
        "Merhaba canım! Ceket Mango'dan, bio'daki linkte kod ELIF10 ile %10 indirim var 🤍",
        "Hi lovely! The jacket is from Mango, the link in my bio has 10% off with code ELIF10 🤍"
      ),
      personaId: "samimi", receivedAt: iso(-2 * HOUR),
    },
    {
      id: "t2", channel: "INSTAGRAM_DM", sender: T("Aslı — Lumen Kozmetik", "Aslı — Lumen Cosmetics"),
      snippet: T(
        "Merhaba Elif, yeni seri lansmanımız için iş birliği yapmak isteriz...",
        "Hi Elif, we'd love to collaborate on our new line launch..."
      ),
      fullMessage: T(
        "Merhaba Elif, yeni seri lansmanımız için iş birliği yapmak isteriz. 2 reels + 3 story için bütçemiz 45.000 TL. Uygun musun, detayları konuşabilir miyiz?",
        "Hi Elif, we'd love to collaborate on our new line launch. Our budget for 2 reels + 3 stories is $2,500. Are you available, can we talk through the details?"
      ),
      intent: "BRAND_DEAL", confidence: 0.98, status: "PENDING", unread: 1,
      aiDraftText: T(
        "Merhaba Aslı, ilginiz için teşekkürler! Teklifi değerlendiriyorum, kapsam ve teslim tarihleriyle ilgili birkaç sorum olacak — bugün içinde dönüş yapacağım.",
        "Hi Aslı, thanks for reaching out! I'm reviewing the offer and will have a few questions about scope and delivery dates — I'll get back to you today."
      ),
      personaId: "samimi", receivedAt: iso(-3 * HOUR),
    },
    {
      id: "t3", channel: "INSTAGRAM_COMMENT", sender: "cansu.d",
      snippet: T("bu ruj tonu tam sana yakışmış ♥️", "this lipstick shade suits you so well ♥️"),
      fullMessage: T("bu ruj tonu tam sana yakışmış ♥️ hangi marka", "this lipstick shade suits you so well ♥️ which brand is it"),
      intent: "FAN", confidence: 0.91, status: "REPLIED", unread: 0,
      aiDraftText: T(
        "Teşekkürler tatlım! NARS Powermatte, ton adı 'Dragon Girl' 💄",
        "Thank you lovely! It's NARS Powermatte, the shade is 'Dragon Girl' 💄"
      ),
      personaId: "samimi", receivedAt: iso(-4 * HOUR),
    },
    {
      id: "t4", channel: "EMAIL", sender: T("brief@velvetshoes.com.tr", "brief@velvetshoes.com"),
      snippet: T("Sonbahar koleksiyonu için sponsorlu içerik teklifi", "Sponsored content offer for the autumn collection"),
      fullMessage: T(
        "Merhaba, Velvet Shoes olarak sonbahar koleksiyonumuz için 1 adet reels çekimi teklif ediyoruz. Bütçe: 18.000 TL + ürün hediyesi. Teslim: 2 hafta içinde.",
        "Hello, at Velvet Shoes we'd like to offer you 1 reel shoot for our autumn collection. Budget: $1,000 + a free product. Delivery: within 2 weeks."
      ),
      intent: "BRAND_DEAL", confidence: 0.89, status: "PENDING", unread: 0,
      aiDraftText: T(
        "Merhaba, teklif için teşekkürler. Bütçe ve kapsamı inceliyorum, bu hafta içinde dönüş yapacağım.",
        "Hello, thank you for the offer. I'm reviewing the budget and scope and will get back to you this week."
      ),
      personaId: "profesyonel", receivedAt: iso(-1 * DAY - 5 * HOUR),
    },
    {
      id: "t5", channel: "INSTAGRAM_DM", sender: "zeynep.acar",
      snippet: T("canlı yayında bahsettiğin cilt bakım rutinini yazar mısın", "could you write out the skincare routine you mentioned on the live"),
      fullMessage: T(
        "canlı yayında bahsettiğin cilt bakım rutinini yazar mısın, çok merak ettim",
        "could you write out the skincare routine you mentioned on the live, I'm so curious"
      ),
      intent: "FAN", confidence: 0.87, status: "REPLIED", unread: 0,
      aiDraftText: T(
        "Tabii! Sabah: C vitamini serum + nemlendirici + SPF. Akşam: retinol + nemlendirici. Highlights'ta 'Cilt Bakımı' altında detaylı anlattım 🤍",
        "Of course! Morning: vitamin C serum + moisturiser + SPF. Evening: retinol + moisturiser. I explained it in detail under 'Skincare' in my Highlights 🤍"
      ),
      personaId: "samimi", receivedAt: iso(-1 * DAY - 2 * HOUR),
    },
    {
      id: "t6", channel: "INSTAGRAM_DM", sender: "unknown_promo_88",
      snippet: T("500K takipçi garantili, hemen tıkla...", "500K followers guaranteed, click now..."),
      fullMessage: T(
        "500K takipçi garantili, hemen tıkla: bit.ly/xyz123 sınırlı teklif kaçırma!",
        "500K followers guaranteed, click now: bit.ly/xyz123 limited offer, don't miss out!"
      ),
      intent: "SPAM", confidence: 0.99, status: "HIDDEN", unread: 0,
      aiDraftText: null, personaId: null, receivedAt: iso(-2 * DAY - 9 * HOUR),
    },
    {
      id: "t7", channel: "INSTAGRAM_DM", sender: "Deniz — Studio Nomi PR",
      snippet: T("Cuma günü ofiste ürün tanıtım görüşmesi ayarlayabilir miyiz?", "Can we set up a product presentation at our office on Friday?"),
      fullMessage: T(
        "Merhaba, yeni sezon aksesuar koleksiyonumuzu birebir göstermek isteriz. Bu hafta cuma 14:00 uygun mu?",
        "Hello, we'd love to show you our new-season accessories collection in person. Are you available this Friday at 2pm?"
      ),
      intent: "BOOKING_REQUEST", confidence: 0.82, status: "PENDING", unread: 0,
      aiDraftText: T(
        "Merhaba Deniz, cuma 14:00 tarafımda uygun görünüyor, takvime ekliyorum — teyit mailini bekliyorum.",
        "Hi Deniz, Friday at 2pm works for me, I'm adding it to my calendar — I'll wait for your confirmation email."
      ),
      personaId: "samimi", receivedAt: iso(-2 * DAY - 6 * HOUR),
    },
    {
      id: "t8", channel: "INSTAGRAM_COMMENT", sender: "irem_k",
      snippet: T("sesin çok tatlıymış bu videoda 🥹", "your voice is so sweet in this video 🥹"),
      fullMessage: T(
        "sesin çok tatlıymış bu videoda 🥹 podcast falan düşünüyor musun",
        "your voice is so sweet in this video 🥹 are you thinking about a podcast or something"
      ),
      intent: "FAN", confidence: 0.78, status: "REPLIED", unread: 0,
      aiDraftText: T(
        "Ay çok tatlısın teşekkürler 🥹 podcast fikri aklımda var, bekleyin bizi!",
        "Aww you're so sweet, thank you 🥹 the podcast idea is on my mind, stay tuned!"
      ),
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
    [uuid(), "t7", T("Studio Nomi — Ürün Tanıtım Görüşmesi", "Studio Nomi — Product Presentation"), iso(3 * DAY), "14:00", "14:30", "BRAND_CALL"]
  );
  await run(
    "INSERT INTO booking (id, title, date, start_time, end_time, type, source_thread_id) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    [uuid(), T("Velvet Shoes — Çekim Planlama", "Velvet Shoes — Shoot Planning"), iso(2 * DAY), "11:00", "12:00", "SHOOT_PLANNING"]
  );
  await run(
    "INSERT INTO booking (id, title, date, start_time, end_time, type, source_thread_id) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    [uuid(), T("Lumen Kozmetik — Brief Görüşmesi", "Lumen Cosmetics — Brief Call"), iso(4 * DAY), "16:30", "17:00", "BRAND_CALL"]
  );

  // ---------- Deals ----------
  const deals = [
    { id: "d1", brand: T("Lumen Kozmetik", "Lumen Cosmetics"), category: T("Kozmetik", "Cosmetics"), amount: T(45000, 2500), inKindBonus: null, deliverablesSummary: T("2 reels + 3 story", "2 reels + 3 stories"), stage: "OFFER_RECEIVED", sourceThreadId: "t2" },
    { id: "d2", brand: "Velvet Shoes", category: T("Moda", "Fashion"), amount: T(18000, 1000), inKindBonus: T("ürün", "product"), deliverablesSummary: T("1 reels", "1 reel"), stage: "OFFER_RECEIVED", sourceThreadId: "t4" },
    { id: "d3", brand: T("Bloom Çiçekçilik", "Bloom Florist"), category: T("Yaşam Tarzı", "Lifestyle"), amount: T(12000, 700), inKindBonus: null, deliverablesSummary: T("1 story serisi", "1 story series"), stage: "UNDER_REVIEW", sourceThreadId: null },
    { id: "d4", brand: T("Nova Teknoloji", "Nova Tech"), category: T("Teknoloji", "Technology"), amount: T(60000, 3300), inKindBonus: null, deliverablesSummary: T("1 reels + 1 YouTube entegrasyon", "1 reel + 1 YouTube integration"), stage: "UNDER_REVIEW", sourceThreadId: null },
    { id: "d5", brand: "Studio Nomi", category: T("Aksesuar", "Accessories"), amount: T(22000, 1200), inKindBonus: null, deliverablesSummary: T("2 story + 1 post", "2 stories + 1 post"), stage: "AWAITING_CONTRACT", sourceThreadId: "t7" },
    { id: "d6", brand: T("Kahve Dükkanı Co.", "Coffee House Co."), category: T("Gıda & İçecek", "Food & Drink"), amount: T(9000, 500), inKindBonus: T("ürün", "product"), deliverablesSummary: T("1 story", "1 story"), stage: "SIGNED", sourceThreadId: null },
  ];
  for (const d of deals) {
    await run(
      "INSERT INTO deal (id, brand, category, amount, currency, in_kind_bonus, deliverables_summary, stage, source_thread_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [d.id, d.brand, d.category, d.amount, currency, d.inKindBonus, d.deliverablesSummary, d.stage, d.sourceThreadId]
    );
  }

  // ---------- Post-Deal Ops for the signed deal (d6) ----------
  const half = T(4500, 250);
  await run("INSERT INTO deal_deliverable (id, deal_id, type, due_date, status) VALUES (?, 'd6', ?, ?, 'PUBLISHED')", [uuid(), T("1 story", "1 story"), iso(-5 * DAY)]);
  await run("INSERT INTO deal_payment (id, deal_id, milestone, amount, currency, status, due_date) VALUES (?, 'd6', ?, ?, ?, 'PAID', NULL)", [uuid(), T("Ön ödeme (%50)", "Upfront payment (50%)"), half, currency]);
  await run("INSERT INTO deal_payment (id, deal_id, milestone, amount, currency, status, due_date) VALUES (?, 'd6', ?, ?, ?, 'PENDING', ?)", [uuid(), T("Teslimat sonrası (%50)", "After delivery (50%)"), half, currency, iso(4 * DAY)]);
  await run("INSERT INTO deal_performance (id, deal_id, reach, engagement_rate, link_clicks) VALUES (?, 'd6', 42300, 6.8, 187)", [uuid()]);
}
