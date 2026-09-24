// Creator OS mobile app — backend-free. All domain data lives on-device in
// SQLite via db.js; data.js (loaded as a separate global script, not bundled)
// only holds UI-only display config (colors, icons, marketing copy).

import * as db from "./db.js";
import * as entitlements from "./entitlements.js";
import { exportBookingToCalendar } from "./calendar-export.js";
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Clipboard } from "@capacitor/clipboard";
import * as notifications from "./notifications.js";
import * as assistant from "./assistant.js";
import { LANGS, CURRENCIES, defaultCurrency, formatMoney as formatCurrency, langInfo, detectDeviceLang, readStoredLang, storeLang, setCurrentLang } from "./i18n.js";
import { EXTRA, DATA_EXTRA } from "./i18n-extra.js";
import { Preferences } from "@capacitor/preferences";

const STRINGS = {
  "nav.onboarding": { tr: "Başlangıç", en: "Get Started" },
  "nav.inbox": { tr: "Gelen Kutusu", en: "Inbox" },
  "nav.deals": { tr: "Anlaşmalar", en: "Deals" },
  "nav.bookings": { tr: "Randevular", en: "Bookings" },
  "nav.persona": { tr: "Persona", en: "Persona" },
  "nav.profile": { tr: "Profil", en: "Profile" },
  "bn.inbox": { tr: "Kutu", en: "Inbox" },
  "bn.deals": { tr: "Anlaşma", en: "Deals" },
  "bn.bookings": { tr: "Randevu", en: "Bookings" },
  "bn.persona": { tr: "Persona", en: "Persona" },
  "bn.profile": { tr: "Profil", en: "Profile" },
  "sidebar.mockBadge": { tr: "Cihazda çalışıyor — backend yok", en: "Runs on-device — no backend" },

  "pro.title": { tr: "Creator OS Pro", en: "Creator OS Pro" },
  "pro.freeDesc": {
    tr: "Ücretsiz sürümde otomatik yanıtlar sabit şablonlarla yazılır. Pro'ya geçip kendi OpenAI anahtarınla gerçek YZ taslakları üret.",
    en: "The free tier writes replies from fixed templates. Upgrade to Pro to generate real AI drafts with your own OpenAI key.",
  },
  "pro.upgradeBtn": { tr: "Pro'ya Yükselt", en: "Upgrade to Pro" },
  "pro.restoreBtn": { tr: "Satın Alımları Geri Yükle", en: "Restore Purchases" },
  "pro.activeLabel": { tr: "✓ Pro aktif", en: "✓ Pro active" },
  "pro.keyLabel": { tr: "OpenAI API Anahtarı", en: "OpenAI API Key" },
  "pro.keyPlaceholder": { tr: "sk-...", en: "sk-..." },
  "pro.keySave": { tr: "Kaydet", en: "Save" },
  "pro.keySaved": { tr: "Anahtar cihazda güvenli şekilde saklandı.", en: "Key saved securely on this device." },
  "pro.keyHint": {
    tr: "Anahtarın yalnızca bu cihazda (Keychain/Keystore) saklanır ve doğrudan OpenAI'a gönderilir — aramızda bir sunucu yok.",
    en: "Your key is stored only on this device (Keychain/Keystore) and sent straight to OpenAI — there's no server of ours in between.",
  },

  "onboarding.headerTitle": { tr: "Başlangıç", en: "Get Started" },
  "onboarding.headerSub": {
    tr: "Bireysel Creator Modu — ajans karmaşıklığı olmadan, 15-20 dakikada kurulum.",
    en: "Individual Creator Mode — no agency complexity, set up in 15-20 minutes.",
  },
  "onboarding.back": { tr: "Geri", en: "Back" },
  "onboarding.continue": { tr: "Devam Et", en: "Continue" },
  "onboarding.connectContinue": { tr: "Hesabı Bağla ve Devam Et", en: "Connect Account & Continue" },
  "onboarding.finish": { tr: "Gelen Kutusuna Git", en: "Go to Inbox" },

  "inbox.headerTitle": { tr: "Gelen Kutusu", en: "Inbox" },
  "inbox.headerSub": {
    tr: "Instagram DM, yorum ve e-posta tek panelde — Intent Router her mesajı otomatik etiketler.",
    en: "Instagram DMs, comments and email in one panel — the Intent Router tags every message automatically.",
  },
  "filters.hepsi": { tr: "Hepsi", en: "All" },
  "filters.replied": { tr: "Cevaplananlar", en: "Replied" },
  "channel.inactiveSuffix": { tr: " · pasif", en: " · inactive" },
  "detail.selectPrompt": { tr: "Görüntülemek için soldan bir mesaj seç.", en: "Select a message on the left to view it." },
  "detail.emptyFilter": { tr: "Bu filtrede mesaj yok.", en: "No messages match this filter." },
  "detail.spamNotice": {
    tr: "Bu mesaj spam olarak işaretlendi, YZ önerisi üretilmedi.",
    en: "This message was flagged as spam, no AI reply was generated.",
  },
  "detail.aiSuggestion": { tr: "YZ Önerisi", en: "AI Suggestion" },
  "detail.confidence": { tr: "Güven", en: "Confidence" },
  "detail.approveSend": { tr: "Onayla ve Gönder", en: "Approve & Send" },
  "detail.reject": { tr: "Reddet", en: "Reject" },
  "detail.createBooking": { tr: "◷ Randevu Oluştur", en: "◷ Create Booking" },
  "detail.sentNote": { tr: "Gönderildi — influencer onayıyla yanıtlandı.", en: "Sent — replied with the creator's approval." },
  "detail.backToInbox": { tr: "← Gelen kutusuna dön", en: "← Back to inbox" },

  "deals.headerTitle": { tr: "Anlaşmalar", en: "Deals" },
  "deals.headerSub": {
    tr: "Deal Desk — marka tekliflerinin durumu, teklif tespitinden imzaya kadar.",
    en: "Deal Desk — brand offer status, from detection all the way to signature.",
  },
  "deals.postdealHeading": { tr: "İmza Sonrası: Teslimat, Ödeme, Performans", en: "After Signing: Delivery, Payment, Performance" },
  "postdeal.emptyHint": {
    tr: "İmzalanmış bir anlaşma kartına tıklayarak teslimat, ödeme ve performans durumunu gör.",
    en: "Click a signed deal card to see its delivery, payment and performance status.",
  },
  "postdeal.deliveryCol": { tr: "Teslimat", en: "Delivery" },
  "postdeal.paymentCol": { tr: "Ödeme Takibi", en: "Payment Tracking" },
  "postdeal.perfCol": { tr: "Performans Raporu", en: "Performance Report" },
  "postdeal.reach": { tr: "Erişim", en: "Reach" },
  "postdeal.engagement": { tr: "Etkileşim Oranı", en: "Engagement Rate" },
  "postdeal.linkClicks": { tr: "Link Tıklama", en: "Link Clicks" },
  "postdeal.viewProof": { tr: "Kanıtı Gör", en: "View Proof" },
  "postdeal.proofUrlPlaceholder": { tr: "Yayın linki (kanıt)", en: "Post link (proof)" },
  "postdeal.proofNotePlaceholder": { tr: "Not (opsiyonel)", en: "Note (optional)" },
  "postdeal.markFulfilled": { tr: "Kanıtla Tamamla", en: "Complete with Proof" },
  "postdeal.fulfilledOn": { tr: "tarihinde tamamlandı", en: "completed" },
  "postdeal.proofSaved": { tr: "Kanıt kaydedildi, teslimat tamamlandı", en: "Proof saved, deliverable completed" },
  "postdeal.deliverableTypePlaceholder": { tr: "Teslimat türü (örn. 1 reels)", en: "Deliverable type (e.g. 1 reels)" },
  "postdeal.deliverableAddBtn": { tr: "+ Teslimat Ekle", en: "+ Add Deliverable" },
  "postdeal.deliverableAdded": { tr: "Teslimat eklendi", en: "Deliverable added" },
  "postdeal.noDeliverables": { tr: "Henüz teslimat eklenmedi.", en: "No deliverables added yet." },
  "status.PUBLISHED": { tr: "Yayınlandı", en: "Published" },
  "status.PENDING": { tr: "Bekliyor", en: "Pending" },
  "status.PAID": { tr: "Ödendi", en: "Paid" },

  "bookings.headerTitle": { tr: "Randevular", en: "Bookings" },
  "bookings.headerSub": {
    tr: "Booking Engine — marka görüşmeleri, çekim planlaması, takvim entegrasyonu.",
    en: "Booking Engine — brand calls, shoot planning, calendar integration.",
  },
  "booking.createdNotePrefix": { tr: "Bu randevu, ", en: "This booking was auto-created from " },
  "booking.createdNoteSuffix": {
    tr: " DM'inden otomatik oluşturuldu — sosyal medya bağlamından takvime tek tıkla geçiş.",
    en: "'s DM — a one-click jump from social media context straight to the calendar.",
  },
  "detail.sendEmail": { tr: "Mail Taslağını Aç", en: "Open Mail Draft" },
  "detail.sendInstagram": { tr: "Kopyala ve Instagram'ı Aç", en: "Copy & Open Instagram" },
  "detail.replySubjectPrefix": { tr: "Re: ", en: "Re: " },
  "detail.copiedToast": { tr: "Cevap kopyalandı — Instagram'da yapıştırıp gönder", en: "Reply copied — paste and send in Instagram" },
  "detail.confirmSentPrompt": {
    tr: "Cevabı gerçekten gönderdin mi? Uygulama kendisi bir şey göndermez — onaylarsan mesaj Cevaplananlar'a taşınır.",
    en: "Did you actually send the reply? The app doesn't send anything itself — confirm to move it to Replied.",
  },
  "detail.confirmSentBtn": { tr: "Gönderdim — Cevaplandı işaretle", en: "I sent it — mark as replied" },
  "detail.reopenBtn": { tr: "Tekrar Aç", en: "Reopen" },
  "detail.cancelSendBtn": { tr: "Vazgeç", en: "Cancel" },
  "nav.assistant": { tr: "Asistan", en: "Assistant" },
  "assistant.headerTitle": { tr: "Asistan", en: "Assistant" },
  "assistant.headerSub": {
    tr: "Gelen kutun, randevuların ve anlaşmalarınla ilgili soru sor.",
    en: "Ask about your inbox, bookings and deals.",
  },
  "assistant.placeholder": { tr: "Bir soru yaz…", en: "Type a question…" },
  "assistant.send": { tr: "Gönder", en: "Send" },
  "assistant.thinking": { tr: "Düşünüyor…", en: "Thinking…" },
  "assistant.welcome": {
    tr: "Merhaba! Aşağıdaki örneklere dokunabilir ya da kendi sorunu yazabilirsin. 'yardım' yazarsan komutları listelerim.",
    en: "Hi! Tap an example or type your own question. Type 'help' to list commands.",
  },
  "assistant.tagLocal": { tr: "yerel cevap · anahtar gerekmedi", en: "local answer · no key needed" },
  "assistant.tagAi": { tr: "yapay zeka · kendi anahtarınla", en: "AI · using your own key" },
  "assistant.proRequired": {
    tr: "Asistan Pro özelliği — Profil'den yükselt",
    en: "The assistant is a Pro feature — upgrade from Profile",
  },
  "notify.title": { tr: "Bildirimler", en: "Notifications" },
  "notify.proRequired": {
    tr: "Bildirim kuralları Pro özelliği — Profil'den yükselt",
    en: "Notification rules are a Pro feature — upgrade from Profile",
  },
  "notify.dmRule": { tr: "Belirli sayıda yeni DM gelince bildir", en: "Notify after a set number of new DMs" },
  "notify.dmThresholdLabel": { tr: "Kaç DM'de bir", en: "Every how many DMs" },
  "notify.brandRule": { tr: "Marka teklifi gelince bildir", en: "Notify on a brand offer" },
  "notify.bookingRule": { tr: "Randevu talebi gelince bildir", en: "Notify on a booking request" },
  "notify.permissionOn": { tr: "✓ Bildirim izni verildi", en: "✓ Notification permission granted" },
  "notify.permissionBtn": { tr: "Bildirimlere İzin Ver", en: "Allow Notifications" },
  "notify.permissionDenied": {
    tr: "Bildirim izni kapalı — cihaz ayarlarından açabilirsin",
    en: "Notification permission is off — enable it in device settings",
  },
  "notify.note": {
    tr: "Bildirimler, bir mesaj uygulamaya girdiği anda çalışır. Gerçek Instagram/e-posta gelen kutusuna bağlı olmadığı için, uygulama kapalıyken yeni bir mesajdan haberdar olamaz. Kurallar aşağıdaki örnek mesajlarla denenebilir.",
    en: "Notifications fire the moment a message enters the app. Since it isn't connected to a real Instagram/email inbox, it can't learn about a new message while closed. Try the rules with the sample messages below.",
  },
  "notify.simDm": { tr: "Örnek DM", en: "Sample DM" },
  "notify.simBrand": { tr: "Örnek marka teklifi", en: "Sample brand offer" },
  "notify.simBooking": { tr: "Örnek randevu talebi", en: "Sample booking request" },
  "notify.simulated": { tr: "Örnek mesaj Gelen Kutusu'na eklendi", en: "Sample message added to Inbox" },
  "notify.brandTitle": { tr: "Yeni marka teklifi", en: "New brand offer" },
  "notify.bookingTitle": { tr: "Yeni randevu talebi", en: "New booking request" },
  "notify.dmTitle": { tr: "Yeni DM'ler", en: "New DMs" },
  "notify.dmBodySuffix": { tr: " yeni DM geldi", en: " new DMs arrived" },
  "notify.reminderTitle": { tr: "Cevap bekleyen DM'ler", en: "DMs waiting for a reply" },
  "notify.reminderBodySuffix": { tr: " DM cevap bekliyor", en: " DMs are waiting for a reply" },
  "nav.links": { tr: "Linkler", en: "Links" },
  "bn.links": { tr: "Link", en: "Links" },
  "links.headerTitle": { tr: "Linkler", en: "Links" },
  "links.headerSub": {
    tr: "Link paketleri hazırla, cevaplara tek dokunuşla ekle, ne kadar gönderdiğini takip et.",
    en: "Build link bundles, add them to replies in one tap, and track how often you send them.",
  },
  "links.statsTitle": { tr: "Gönderim Takibi", en: "Send Tracking" },
  "links.statsTotal": { tr: "Toplam gönderim", en: "Total sends" },
  "links.statsWeek": { tr: "Son 7 gün", en: "Last 7 days" },
  "links.statsNote": {
    tr: "Bu sayılar, paketi cevabına ekleyip 'Gönderdim' dediğin durumları sayar. Linke gerçekte kaç kişinin tıkladığı takip edilemez — bunun için sunucu gerekir.",
    en: "These count replies where you added a bundle and confirmed 'I sent it'. How many people actually clicked a link can't be tracked — that needs a server.",
  },
  "links.byRoute": { tr: "Nereden gönderildi", en: "Sent via" },
  "links.timesSent": { tr: " kez gönderildi", en: " times sent" },
  "links.neverSent": { tr: "Henüz gönderilmedi", en: "Not sent yet" },
  "links.copyBundle": { tr: "Kopyala", en: "Copy" },
  "links.deleteBundle": { tr: "Sil", en: "Delete" },
  "links.copied": { tr: "Paket kopyalandı", en: "Bundle copied" },
  "links.addTitle": { tr: "Yeni Link Paketi", en: "New Link Bundle" },
  "links.nameLabel": { tr: "Paket adı", en: "Bundle name" },
  "links.namePlaceholder": { tr: "örn. Ceket & Kombin Linkleri", en: "e.g. Jacket & Outfit Links" },
  "links.itemsLabel": { tr: "Linkler (her satıra bir tane)", en: "Links (one per line)" },
  "links.itemsPlaceholder": { tr: "Etiket | https://...\nhttps://...", en: "Label | https://...\nhttps://..." },
  "links.addBtn": { tr: "Paketi Ekle", en: "Add Bundle" },
  "links.added": { tr: "Paket eklendi", en: "Bundle added" },
  "links.removed": { tr: "Paket silindi", en: "Bundle deleted" },
  "links.invalid": { tr: "Bir ad ve en az bir geçerli (http/https) link gir", en: "Enter a name and at least one valid (http/https) link" },
  "route.EMAIL": { tr: "E-posta", en: "Email" },
  "route.INSTAGRAM_DM": { tr: "Instagram DM", en: "Instagram DM" },
  "route.INSTAGRAM_COMMENT": { tr: "Instagram yorum", en: "Instagram comment" },
  "route.COMMENT_TO_DM": { tr: "Yorumdan DM'e", en: "Comment to DM" },
  "links.proRequired": {
    tr: "Link paketi oluşturmak ve cevaba eklemek Pro özelliği — Profil'den yükselt",
    en: "Creating link bundles and adding them to replies is a Pro feature — upgrade from Profile",
  },
  "detail.bundleLocked": { tr: "Link Paketi Ekle 🔒 Pro", en: "Add Link Bundle 🔒 Pro" },
  "detail.bundlePlaceholder": { tr: "Link paketi seç…", en: "Pick a link bundle…" },
  "detail.addBundleBtn": { tr: "Cevaba Ekle", en: "Add to Reply" },
  "detail.moveToDm": { tr: "DM'e Taşı", en: "Move to DM" },
  "detail.copiedDmToast": {
    tr: "Kopyalandı — DM'e yapıştır. Yoruma da 'DM'den gönderdim' yazabilirsin",
    en: "Copied — paste it in the DM. You can also reply 'sent you a DM' under the comment",
  },
  "booking.addToCalendar": { tr: "Takvime Ekle", en: "Add to Calendar" },
  "booking.addToCalendarPro": { tr: "Takvime Ekle 🔒 Pro", en: "Add to Calendar 🔒 Pro" },
  "booking.calendarExported": { tr: "Takvim dosyası hazır, paylaşım açılıyor", en: "Calendar file ready, opening share sheet" },
  "booking.calendarProRequired": {
    tr: "Takvim entegrasyonu Pro özelliği — Profil'den yükselt",
    en: "Calendar integration is a Pro feature — upgrade from Profile",
  },

  "persona.headerTitle": { tr: "Persona", en: "Persona" },
  "persona.headerSub": {
    tr: "Voice Clone — otomatik yanıtların hangi üslupla yazılacağını belirler.",
    en: "Voice Clone — decides what tone automatic replies are written in.",
  },
  "persona.previewLabel": { tr: "Örnek Yanıt Önizlemesi", en: "Sample Reply Preview" },
  "persona.updated": { tr: "Varsayılan persona güncellendi.", en: "Default persona updated." },

  "profile.headerTitle": { tr: "Profil", en: "Profile" },
  "profile.headerSub": {
    tr: "Hesap bilgilerin ve bağlı kanalların — hangisi aktif, hangisi henüz bağlı değil.",
    en: "Your account info and connected channels — what's active, what's not connected yet.",
  },
  "ig.posts": { tr: "gönderi", en: "posts" },
  "ig.followers": { tr: "takipçi", en: "followers" },
  "ig.following": { tr: "takip", en: "following" },
  "ig.connected": { tr: "✓ Bağlandı", en: "✓ Connected" },
  "profile.connected": { tr: "Bağlı", en: "Connected" },
  "profile.notConnectedYet": { tr: "Henüz bağlanmadı", en: "Not connected yet" },
  "profile.restricted": { tr: "Yakında değil, kısıtlı", en: "Not coming soon — restricted" },
  "profile.connectedSinceSuffix": { tr: " tarihinden beri bağlı", en: "" },
  "profile.connectedSincePrefix": { tr: "", en: "Connected since " },

  "accounts.tabAll": { tr: "Tümü", en: "All" },
  "accounts.addTitle": { tr: "Yeni Hesap Ekle", en: "Add New Account" },
  "accounts.limitFree": { tr: "hesap kullanılıyor (free limit: 2)", en: "accounts used (free limit: 2)" },
  "accounts.limitPro": { tr: "hesap bağlı — Pro'da sınırsız", en: "accounts connected — unlimited on Pro" },
  "accounts.channelLabel": { tr: "Kanal", en: "Channel" },
  "accounts.handleLabel": { tr: "Kullanıcı adı / e-posta", en: "Handle / email" },
  "accounts.handlePlaceholder": { tr: "@kullaniciadi", en: "@handle" },
  "accounts.addBtn": { tr: "Hesabı Ekle", en: "Add Account" },
  "accounts.limitReached": {
    tr: "Free sürümde en fazla 2 hesap bağlayabilirsin. Daha fazlası için Pro'ya yükselt.",
    en: "You can connect up to 2 accounts on the free tier. Upgrade to Pro for more.",
  },
  "accounts.added": { tr: "Hesap eklendi", en: "Account added" },
  "accounts.removeBtn": { tr: "Kaldır", en: "Remove" },
  "accounts.removed": { tr: "Hesap kaldırıldı", en: "Account removed" },
  "onboarding.restartBtn": { tr: "Kurulumu Tekrar Başlat", en: "Restart Setup" },

  "deals.addTitle": { tr: "Yeni Anlaşma Ekle", en: "Add New Deal" },
  "deals.brandLabel": { tr: "Marka", en: "Brand" },
  "deals.brandPlaceholder": { tr: "Marka adı", en: "Brand name" },
  "deals.categoryLabel": { tr: "Kategori", en: "Category" },
  "deals.categoryPlaceholder": { tr: "örn. Moda, Kozmetik", en: "e.g. Fashion, Cosmetics" },
  "deals.amountLabel": { tr: "Tutar", en: "Amount" },
  "deals.currencyLabel": { tr: "Para birimi", en: "Currency" },
  "deals.deliverablesLabel": { tr: "Teslimatlar", en: "Deliverables" },
  "deals.deliverablesPlaceholder": { tr: "örn. 2 reels + 3 story", en: "e.g. 2 reels + 3 story" },
  "deals.stageLabel": { tr: "Aşama", en: "Stage" },
  "deals.accountLabel": { tr: "Hesap (opsiyonel)", en: "Account (optional)" },
  "deals.accountNone": { tr: "Belirtilmemiş — sadece Tümü'de görünür", en: "Unset — only shows under All" },

  "postdeal.confirmMailBtn": { tr: "Onayla ve Teyit Maili Gönder", en: "Confirm & Send Confirmation Email" },
  "postdeal.resendMailBtn": { tr: "Teyit Mailini Tekrar Gönder", en: "Resend Confirmation Email" },
  "postdeal.recipientEmailPlaceholder": { tr: "Karşı tarafın e-postası", en: "Other party's email" },
  "postdeal.recipientEmailRequired": { tr: "Mail göndermek için önce e-posta adresi gir", en: "Enter an email address before sending" },
  "postdeal.signedNote": { tr: "✓ İmzalandı", en: "✓ Signed" },
  "postdeal.mailSubjectPrefix": { tr: "Anlaşma Teyidi — ", en: "Deal Confirmation — " },
  "postdeal.mailGreetingPrefix": { tr: "Merhaba, ", en: "Hi, " },
  "postdeal.mailGreetingSuffix": {
    tr: " ile aramızdaki anlaşmanın şartlarını aşağıda teyit amaçlı paylaşıyorum:",
    en: " below are the terms of our agreement, shared for confirmation:",
  },
  "postdeal.mailSignoff": { tr: "İyi çalışmalar,", en: "Best," },
  "postdeal.dealSigned": { tr: "Anlaşma imzalandı olarak işaretlendi, mail taslağı açılıyor", en: "Deal marked signed, opening mail draft" },
  "deals.addBtn": { tr: "Anlaşmayı Ekle", en: "Add Deal" },
  "deals.added": { tr: "Anlaşma eklendi", en: "Deal added" },
  "deals.limitFree": { tr: "anlaşma kullanılıyor (free limit: 5)", en: "deals used (free limit: 5)" },
  "deals.limitPro": { tr: "anlaşma — Pro'da sınırsız", en: "deals — unlimited on Pro" },
  "deals.limitReached": {
    tr: "Free sürümde en fazla 5 anlaşma oluşturabilirsin. Daha fazlası için Pro'ya yükselt.",
    en: "You can create up to 5 deals on the free tier. Upgrade to Pro for more.",
  },

  "time.yesterday": { tr: "Dün", en: "Yesterday" },
  "time.daysAgo": { tr: "{n} gün önce", en: "{n} days ago" },
  "boot.loading": { tr: "Cihaz veritabanı hazırlanıyor…", en: "Preparing on-device database…" },
  "boot.errorTitle": { tr: "Bir sorun oluştu", en: "Something went wrong" },
  "boot.retry": { tr: "Tekrar Dene", en: "Try Again" },
  "lang.label": { tr: "Dil", en: "Language" },
  "assistant.ex.pending": { tr: "Kaç cevaplanmamış DM var?", en: "How many unanswered DMs do I have?" },
  "assistant.ex.offers": { tr: "Yeni marka teklifi var mı?", en: "Any new brand offers?" },
  "assistant.ex.bookings": { tr: "Yarınki randevularım", en: "My bookings tomorrow" },
  "assistant.ex.deals": { tr: "Bekleyen anlaşmalarım", en: "My open deals" },
  "assistant.ex.overdue": { tr: "Hangi teslimatlar gecikti?", en: "Which deliverables are overdue?" },
  "assistant.ex.links": { tr: "Bu hafta kaç link gönderdim?", en: "How many links did I send this week?" },
};

const state = {
  lang: "en",
  view: "inbox",
  activeFilter: "ALL",
  activeAccountId: null,
  awaitingSendThreadId: null,
  awaitingRoute: null,
  settings: {},
  assistantMessages: [],
  linkBundles: [],
  linkStats: null,
  selectedThreadId: null,
  createdBookingIds: new Set(),
  selectedDealId: null,
  onboardingStep: 1,
  threads: [],
  deals: [],
  bookings: [],
  personas: [],
  profile: null,
  accounts: [],
};

// ---------- i18n helpers ----------

// Fallback chain: current language -> English -> Turkish -> the key itself.
// {n}-style placeholders are filled from `vars`.
function t(key, vars) {
  const entry = STRINGS[key];
  let text = entry?.[state.lang] ?? EXTRA[state.lang]?.[key] ?? entry?.en ?? entry?.tr;
  if (text == null) return key;
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, value);
  return text;
}

function tx(field) {
  if (field == null) return "";
  if (typeof field === "string") return field;
  return field[state.lang] ?? field.en ?? field.tr ?? "";
}

// Merge the de/fr/ar/it/es display metadata from i18n-extra.js into the data.js
// globals so tx() can resolve them like the built-in tr/en fields.
function mergeDataTranslations() {
  for (const [lang, d] of Object.entries(DATA_EXTRA)) {
    for (const [k, v] of Object.entries(d.INTENT_META)) INTENT_META[k].label[lang] = v;
    for (const [k, v] of Object.entries(d.CHANNEL_META)) CHANNEL_META[k].label[lang] = v;
    for (const [k, v] of Object.entries(d.DEAL_STAGE_META)) DEAL_STAGE_META[k][lang] = v;
    for (const [k, v] of Object.entries(d.GAP_NOTES)) GAP_NOTES[k].text[lang] = v;
    for (const step of ONBOARDING_STEPS) {
      const tr = d.ONBOARDING[step.id];
      step.title[lang] = tr.title;
      step.label[lang] = tr.label;
      step.body[lang] = tr.body;
    }
  }
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

function renderLangSwitch() {
  const html = `<select class="lang-select" aria-label="${t("lang.label")}">${LANGS.map(
    (l) => `<option value="${l.code}" ${l.code === state.lang ? "selected" : ""}>${l.name}</option>`
  ).join("")}</select>`;
  ["lang-switch-desktop", "lang-switch-mobile"].forEach((id) => {
    const el = document.getElementById(id);
    el.innerHTML = html;
    el.querySelector("select").addEventListener("change", (e) => setLang(e.target.value));
  });
}

// Applies a language to the document (lang attribute, text direction, module
// state). The choice is persisted in localStorage for the next launch and
// mirrored to native preferences so Siri answers can follow it.
function applyLangToDocument(lang) {
  state.lang = lang;
  setCurrentLang(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = langInfo(lang).dir;
}

function setLang(lang) {
  if (state.lang === lang) return;
  applyLangToDocument(lang);
  storeLang(lang);
  Preferences.set({ key: "creatoros_lang", value: lang }).catch(() => {});
  renderAll();
}

// ---------- Formatting helpers ----------

function locale() {
  return langInfo(state.lang).locale;
}

function formatRelativeOrTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return date.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return t("time.yesterday");
  return t("time.daysAgo", { n: diffDays });
}

function formatBookingDate(iso) {
  return new Date(iso).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
}

function formatPlainDate(iso) {
  return new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
}

function formatDueDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "long" });
}

// 0.98 -> "%98" (Turkish), "98%" (English), "98 %" (German/French), Arabic digits for Arabic.
function formatPercent(fraction, maxFractionDigits = 0) {
  return new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: maxFractionDigits }).format(fraction);
}

function formatCompactNumber(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function formatMoney({ amount, currency, inKindBonus }) {
  return `${formatCurrency(amount, currency || "TRY", state.lang)}${inKindBonus ? ` + ${inKindBonus}` : ""}`;
}

// Opens a URL outside the app. An <a> click (not location.href) so the page
// itself is never navigated away, even where no handler for the scheme exists.
function openExternal(url, { newTab = false } = {}) {
  const a = document.createElement("a");
  a.href = url;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function buildMailto(to, subject, body) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, "%20")}`;
}

// ---------- Toast (non-blocking error/success feedback) ----------

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---------- Info tip (hover explanation) ----------

function infoTipHTML(key) {
  const note = GAP_NOTES[key];
  if (!note) return "";
  return `
    <span class="info-tip" tabindex="0">
      ⓘ
      <span class="info-tip-bubble">
        <span class="info-tip-gap">${tx(note.gap)}</span>
        ${tx(note.text)}
      </span>
    </span>
  `;
}

function renderInfoTips() {
  ["inbox", "deals", "postdeal", "booking", "persona"].forEach((key) => {
    const el = document.getElementById(`tip-${key}`);
    if (el) el.innerHTML = infoTipHTML(key);
  });
}

// ---------- Channel bar (derived from real account connection state) ----------

function renderChannelBar() {
  const el = document.getElementById("channel-bar");
  el.innerHTML = "";
  Object.entries(CHANNEL_META).forEach(([channelId, meta]) => {
    const accountsOnChannel = state.accounts.filter((a) => a.channel === channelId);
    const active = accountsOnChannel.some((a) => a.connectionState === "CONNECTED");
    const restricted = accountsOnChannel.find((a) => a.restrictionReason);
    const chip = document.createElement("div");
    chip.className = "channel-chip " + (active ? "is-active" : "is-disabled");
    chip.innerHTML = `${meta.icon} ${tx(meta.label)}${active ? "" : t("channel.inactiveSuffix")}${
      restricted ? `<span class="info-tip" tabindex="0">ⓘ<span class="info-tip-bubble">${restricted.restrictionReason}</span></span>` : ""
    }`;
    el.appendChild(chip);
  });
}

// ---------- Account tabs (global bar — Inbox/Anlaşma/Randevu, 2+ accounts) ----------

const ACCOUNT_TAB_VIEWS = ["inbox", "deals", "bookings"];

function renderAccountTabs() {
  const el = document.getElementById("account-tabs");
  if (!el) return;
  const connected = (state.accounts ?? []).filter((a) => a.connectionState === "CONNECTED");
  if (state.activeAccountId && !connected.some((a) => a.id === state.activeAccountId)) {
    state.activeAccountId = null;
  }

  if (connected.length < 2 || !ACCOUNT_TAB_VIEWS.includes(state.view)) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }

  el.style.display = "";
  const tabs = [{ id: null, label: t("accounts.tabAll"), icon: "◎" }].concat(
    connected.map((a) => ({ id: a.id, label: a.handle || tx(CHANNEL_META[a.channel].label), icon: CHANNEL_META[a.channel].icon }))
  );
  el.innerHTML = tabs
    .map(
      (tab) => `<button class="chip account-tab${state.activeAccountId === tab.id ? " is-active" : ""}" data-account-id="${tab.id ?? ""}">${tab.icon} ${tab.label}</button>`
    )
    .join("");
  el.querySelectorAll(".account-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeAccountId = btn.dataset.accountId || null;
      renderAccountTabs();
      renderThreadList();
      renderKanban();
      renderPostDealPanel();
      renderBookings();
    });
  });
}

// ---------- Nav (desktop sidebar + mobile bottom bar, kept in sync) ----------

function setView(viewName) {
  state.view = viewName;
  document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("is-active", b.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  document.getElementById(`view-${viewName}`).classList.add("is-active");
  renderAccountTabs();
  if (viewName === "assistant") renderAssistant();
}

document.querySelectorAll(".nav-item, .bottom-nav-item").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

// ---------- Inbox: filter chips ----------

const FILTERS = [
  { id: "ALL", labelKey: "filters.hepsi" },
  { id: "FAN", intentKey: "FAN" },
  { id: "BRAND_DEAL", intentKey: "BRAND_DEAL" },
  { id: "BOOKING_REQUEST", intentKey: "BOOKING_REQUEST" },
  { id: "SPAM", intentKey: "SPAM" },
  { id: "REPLIED", labelKey: "filters.replied" },
];

function filterLabel(f) {
  if (f.labelKey) return t(f.labelKey);
  return tx(INTENT_META[f.intentKey].label);
}

// BRAND_DEAL filter also matches COLLABORATION — the UI keeps one chip for
// both, while each thread's own badge still shows its precise intent.
// Once a thread has been replied to, it moves out of every other filter
// (including "Hepsi") and only shows under "Cevaplananlar" — mirrors a
// handled/done inbox pattern instead of leaving answered messages mixed
// into the action queue forever.
function threadMatchesFilter(th) {
  if (!matchesActiveAccount(th)) return false;
  if (state.activeFilter === "REPLIED") return th.status === "REPLIED";
  if (th.status === "REPLIED") return false;
  if (state.activeFilter === "ALL") return true;
  if (state.activeFilter === "BRAND_DEAL") return th.intent === "BRAND_DEAL" || th.intent === "COLLABORATION";
  return th.intent === state.activeFilter;
}

function renderFilterChips() {
  const el = document.getElementById("filter-chips");
  el.innerHTML = "";
  FILTERS.forEach((f) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (state.activeFilter === f.id ? " is-active" : "");
    chip.textContent = filterLabel(f);
    chip.addEventListener("click", () => {
      state.activeFilter = f.id;
      renderFilterChips();
      renderThreadList();
    });
    el.appendChild(chip);
  });
}

// ---------- Inbox: thread list ----------

function renderThreadList() {
  const el = document.getElementById("thread-list");
  el.innerHTML = "";

  const filtered = state.threads.filter(threadMatchesFilter);

  if (filtered.length === 0) {
    el.innerHTML = `<div class="detail-empty">${t("detail.emptyFilter")}</div>`;
    return;
  }

  filtered.forEach((th) => {
    const row = document.createElement("div");
    row.className = "thread-row" + (th.id === state.selectedThreadId ? " is-selected" : "") + (th.unread ? " is-unread" : "");
    const intent = INTENT_META[th.intent];
    const channel = CHANNEL_META[th.channel];
    row.innerHTML = `
      <div class="thread-row-top">
        <span class="thread-sender"><span class="thread-channel-icon">${channel.icon}</span>${th.sender}</span>
        <span class="thread-time">${formatRelativeOrTime(th.receivedAt)}</span>
      </div>
      <span class="badge" style="background:${intent.color};">${tx(intent.label)}</span>
      <div class="thread-snippet">${th.snippet}</div>
      ${th.status === "REPLIED" && th.aiDraftText ? `<div class="thread-reply-snippet">↳ ${th.aiDraftText}</div>` : ""}
    `;
    row.addEventListener("click", () => {
      state.selectedThreadId = th.id;
      document.querySelector(".inbox-layout").classList.add("show-detail");
      renderThreadList();
      renderThreadDetail();
    });
    el.appendChild(row);
  });

  updateUnreadCount();
}

function updateUnreadCount() {
  const count = state.threads.filter((th) => th.unread).length;
  document.getElementById("inbox-unread-count").textContent = count > 0 ? count : "";
  document.getElementById("bn-inbox-count").textContent = count > 0 ? count : "";
}

// ---------- Inbox: thread detail ----------

function renderThreadDetail() {
  const el = document.getElementById("thread-detail");
  const th = state.threads.find((x) => x.id === state.selectedThreadId);

  if (!th) {
    el.innerHTML = `<div class="detail-empty">${t("detail.selectPrompt")}</div>`;
    return;
  }

  const intent = INTENT_META[th.intent];
  const channel = CHANNEL_META[th.channel];
  const wasSent = th.status === "REPLIED";
  const awaiting = state.awaitingSendThreadId === th.id;

  el.innerHTML = `
    <button class="mobile-back-btn" id="btn-back-to-list">${t("detail.backToInbox")}</button>
    <div class="detail-header">
      <div>
        <div class="detail-sender">${th.sender}</div>
        <div class="detail-channel">${tx(channel.label)} · ${formatRelativeOrTime(th.receivedAt)}</div>
      </div>
      <span class="badge" style="background:${intent.color};">${tx(intent.label)}</span>
    </div>

    <div class="detail-message">${th.fullMessage}</div>

    ${
      th.aiDraftText != null
        ? `
      <div class="ai-block-label">${t("detail.aiSuggestion")} <span class="confidence-tag">${t("detail.confidence")}: ${formatPercent(th.confidence)}</span></div>
      <div class="ai-draft" id="ai-draft-text" contenteditable="true">${th.aiDraftText}</div>
      ${
        awaiting
          ? `<div class="send-confirm">
              <div class="send-confirm-text">${t("detail.confirmSentPrompt")}</div>
              <div class="detail-actions">
                <button class="btn btn-primary" id="btn-confirm-sent">${t("detail.confirmSentBtn")}</button>
                <button class="btn btn-ghost" id="btn-reopen">${t("detail.reopenBtn")}</button>
                <button class="btn btn-ghost" id="btn-cancel-send">${t("detail.cancelSendBtn")}</button>
              </div>
            </div>`
          : `${
              !entitlements.isPro()
                ? `<div class="bundle-picker"><button class="btn btn-ghost btn-sm is-locked" id="btn-bundle-locked">${t("detail.bundleLocked")}</button></div>`
                : state.linkBundles.length
                ? `<div class="bundle-picker">
                    <select class="manage-select" id="bundle-select">
                      <option value="">${t("detail.bundlePlaceholder")}</option>
                      ${state.linkBundles.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("")}
                    </select>
                    <button class="btn btn-ghost btn-sm" id="btn-add-bundle">${t("detail.addBundleBtn")}</button>
                  </div>`
                : ""
            }
            <div class="detail-actions">
              <button class="btn btn-primary" id="btn-send">${th.channel === "EMAIL" ? t("detail.sendEmail") : t("detail.sendInstagram")}</button>
              ${th.channel === "INSTAGRAM_COMMENT" ? `<button class="btn btn-ghost" id="btn-to-dm">${t("detail.moveToDm")}</button>` : ""}
              <button class="btn btn-ghost" id="btn-reject">${t("detail.reject")}</button>
              ${th.bookingTemplate ? `<button class="btn btn-ghost" id="btn-create-booking">${t("detail.createBooking")}</button>` : ""}
            </div>`
      }
      <div class="detail-sent-note ${wasSent ? "is-visible" : ""}" id="sent-note">${t("detail.sentNote")}</div>
    `
        : `<div class="detail-empty" style="padding:20px 0;">${t("detail.spamNotice")}</div>`
    }
  `;

  document.getElementById("btn-back-to-list").addEventListener("click", () => {
    document.querySelector(".inbox-layout").classList.remove("show-detail");
  });

  // The app can't deliver replies itself (no backend, no Meta API access):
  // it hands the text to the user's Mail app / Instagram, and only marks the
  // thread as replied once the user confirms they really sent it.
  async function launchReply(text, viaDm = false) {
    if (th.channel === "EMAIL") {
      openExternal(buildMailto(th.sender, t("detail.replySubjectPrefix") + th.snippet, text));
      return;
    }
    await Clipboard.write({ string: text });
    showToast(viaDm ? t("detail.copiedDmToast") : t("detail.copiedToast"), "success");
    const url =
      (th.channel === "INSTAGRAM_DM" || viaDm) && th.senderHandle
        ? `https://ig.me/m/${encodeURIComponent(th.senderHandle)}`
        : "https://www.instagram.com/";
    openExternal(url, { newTab: true });
  }

  async function startSend(viaDm) {
    const text = document.getElementById("ai-draft-text").innerText.trim();
    if (!text) return;
    try {
      await launchReply(text, viaDm);
      await db.updateDraft(th.id, text);
      th.aiDraftText = text;
      state.awaitingSendThreadId = th.id;
      state.awaitingRoute = viaDm ? "COMMENT_TO_DM" : th.channel;
      renderThreadDetail();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  document.getElementById("btn-send")?.addEventListener("click", () => startSend(false));
  document.getElementById("btn-to-dm")?.addEventListener("click", () => startSend(true));

  document.getElementById("btn-bundle-locked")?.addEventListener("click", () => showToast(t("links.proRequired"), "info"));

  document.getElementById("btn-add-bundle")?.addEventListener("click", () => {
    if (!entitlements.isPro()) return showToast(t("links.proRequired"), "info");
    const bundle = state.linkBundles.find((b) => b.id === document.getElementById("bundle-select").value);
    if (!bundle) return;
    const draftEl = document.getElementById("ai-draft-text");
    draftEl.innerText = `${draftEl.innerText.trim()}\n\n${formatBundleText(bundle)}`;
  });

  document.getElementById("btn-reopen")?.addEventListener("click", async () => {
    const text = document.getElementById("ai-draft-text").innerText.trim();
    try {
      await launchReply(text, state.awaitingRoute === "COMMENT_TO_DM");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
  document.getElementById("btn-cancel-send")?.addEventListener("click", () => {
    state.awaitingSendThreadId = null;
    state.awaitingRoute = null;
    renderThreadDetail();
  });
  // Saves the final text, moves the thread to "replied" and counts any link
  // bundles whose links ended up in the sent text.
  async function markReplied(text) {
    await db.updateDraft(th.id, text);
    const updated = await db.updateThreadStatus(th.id, "REPLIED");
    Object.assign(th, updated);
    const usedBundles = state.linkBundles.filter((b) => b.items.some((it) => text.includes(it.url)));
    if (usedBundles.length) {
      await db.recordLinkSends(th.id, state.awaitingRoute ?? th.channel, usedBundles.map((b) => b.id));
      state.linkStats = await db.getLinkStats();
      renderLinks();
    }
    state.awaitingSendThreadId = null;
    state.awaitingRoute = null;
    renderThreadList();
    renderThreadDetail();
  }

  document.getElementById("btn-confirm-sent")?.addEventListener("click", async () => {
    try {
      await markReplied(document.getElementById("ai-draft-text").innerText.trim());
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  const rejectBtn = document.getElementById("btn-reject");
  if (rejectBtn) {
    rejectBtn.addEventListener("click", () => {
      document.getElementById("ai-draft-text").textContent = "";
      document.getElementById("ai-draft-text").focus();
    });
  }
  const bookingBtn = document.getElementById("btn-create-booking");
  if (bookingBtn) {
    bookingBtn.addEventListener("click", async () => {
      bookingBtn.disabled = true;
      try {
        const booking = await db.createBookingFromThread(th.id);
        state.bookings.unshift(booking);
        state.createdBookingIds.add(booking.id);
        setView("bookings");
        renderBookings();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        bookingBtn.disabled = false;
      }
    });
  }
}

// ---------- Deals: kanban ----------

// Deals/bookings with no account_id (no source thread to inherit one from)
// only ever show up in the "Tümü" (all) tab — see the migration comment in
// db.js for why they can't be attributed to a single account.
function matchesActiveAccount(item) {
  if (!state.activeAccountId) return true;
  return item.accountId === state.activeAccountId;
}

function renderKanban() {
  const el = document.getElementById("kanban");
  el.innerHTML = "";

  Object.entries(DEAL_STAGE_META).forEach(([stageId, stageLabel]) => {
    const col = document.createElement("div");
    col.className = "kanban-col";
    const cards = state.deals.filter((d) => d.stage === stageId && matchesActiveAccount(d));
    col.innerHTML = `<div class="kanban-col-title">${tx(stageLabel)} · ${cards.length}</div>`;
    cards.forEach((d) => {
      const card = document.createElement("div");
      card.className = "deal-card" + (d.id === state.selectedDealId ? " is-selected" : "");
      card.innerHTML = `
        <div class="deal-brand">${d.brand}</div>
        <div class="deal-category">${tx(d.category)}</div>
        <div class="deal-amount">${formatMoney(d)}</div>
        <div class="deal-deliverables">${tx(d.deliverablesSummary)}</div>
      `;
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        state.selectedDealId = d.id;
        renderKanban();
        renderPostDealPanel();
      });
      col.appendChild(card);
    });
    el.appendChild(col);
  });
}

const MAX_FREE_DEALS = 5;

function renderDealManage() {
  const el = document.getElementById("deal-manage");
  if (!el) return;
  const connectedAccounts = state.accounts.filter((a) => a.connectionState === "CONNECTED");
  const dealCount = state.deals.length;
  const pro = entitlements.isPro();
  const atLimit = !pro && dealCount >= MAX_FREE_DEALS;
  const countLine = pro ? `${dealCount} ${t("deals.limitPro")}` : `${dealCount}/${MAX_FREE_DEALS} ${t("deals.limitFree")}`;

  el.innerHTML = `
    <div class="manage-card">
      <div class="manage-title">${t("deals.addTitle")}</div>
      <div class="manage-count">${countLine}</div>
      ${
        atLimit
          ? `<div class="manage-limit-note">${t("deals.limitReached")}</div>`
          : `
      <div class="manage-form">
        <label class="manage-label">${t("deals.brandLabel")}</label>
        <input class="manage-input" id="new-deal-brand" placeholder="${t("deals.brandPlaceholder")}" autocomplete="off" />
        <label class="manage-label">${t("deals.categoryLabel")}</label>
        <input class="manage-input" id="new-deal-category" placeholder="${t("deals.categoryPlaceholder")}" autocomplete="off" />
        <div class="manage-row">
          <div>
            <label class="manage-label">${t("deals.amountLabel")}</label>
            <input class="manage-input" id="new-deal-amount" type="number" min="0" inputmode="numeric" />
          </div>
          <div>
            <label class="manage-label">${t("deals.currencyLabel")}</label>
            <select class="manage-select" id="new-deal-currency">
              ${CURRENCIES.map((c) => `<option value="${c}"${c === defaultCurrency(state.lang) ? " selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
        </div>
        <label class="manage-label">${t("deals.deliverablesLabel")}</label>
        <input class="manage-input" id="new-deal-deliverables" placeholder="${t("deals.deliverablesPlaceholder")}" autocomplete="off" />
        <label class="manage-label">${t("deals.stageLabel")}</label>
        <select class="manage-select" id="new-deal-stage">
          ${Object.entries(DEAL_STAGE_META).map(([id, label]) => `<option value="${id}">${tx(label)}</option>`).join("")}
        </select>
        <label class="manage-label">${t("deals.accountLabel")}</label>
        <select class="manage-select" id="new-deal-account">
          <option value="">${t("deals.accountNone")}</option>
          ${connectedAccounts.map((a) => `<option value="${a.id}">${a.handle || tx(CHANNEL_META[a.channel].label)}</option>`).join("")}
        </select>
        <button class="btn btn-primary" id="btn-add-deal">${t("deals.addBtn")}</button>
      </div>
      `
      }
    </div>
  `;

  document.getElementById("btn-add-deal")?.addEventListener("click", async () => {
    const brand = document.getElementById("new-deal-brand").value.trim();
    const category = document.getElementById("new-deal-category").value.trim();
    const amount = Number(document.getElementById("new-deal-amount").value);
    const currency = document.getElementById("new-deal-currency").value;
    const deliverablesSummary = document.getElementById("new-deal-deliverables").value.trim();
    const stage = document.getElementById("new-deal-stage").value;
    const accountId = document.getElementById("new-deal-account").value || null;
    if (!brand || !category || !deliverablesSummary || !amount) return;
    try {
      const deal = await db.createDeal({ brand, category, amount, currency, deliverablesSummary, stage, accountId });
      state.deals.unshift(deal);
      renderKanban();
      renderDealManage();
      showToast(t("deals.added"), "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// ---------- Post-Deal Ops panel ----------

// If the deal's source thread came in over the EMAIL channel, its sender is
// already an email address — pre-fill with that; otherwise leave it for the
// user to type in (Instagram DM/Comment senders are handles, not emails).
function guessDealEmail(d) {
  if (!d.sourceThreadId) return "";
  const th = state.threads.find((x) => x.id === d.sourceThreadId);
  return th?.channel === "EMAIL" && th.sender.includes("@") ? th.sender : "";
}

// mailto: opens the device's own Mail app with a pre-filled draft — the
// user reviews and hits send themselves. No backend, no credentials, no
// message actually leaves the device until the user approves it.
function buildDealMailtoUrl(d, toEmail) {
  const subject = t("postdeal.mailSubjectPrefix") + d.brand;
  const bodyLines = [
    t("postdeal.mailGreetingPrefix") + d.brand + t("postdeal.mailGreetingSuffix"),
    "",
    `${t("deals.brandLabel")}: ${d.brand}`,
    `${t("deals.categoryLabel")}: ${tx(d.category)}`,
    `${t("deals.amountLabel")}: ${formatMoney(d)}`,
    `${t("deals.deliverablesLabel")}: ${tx(d.deliverablesSummary)}`,
    `${t("deals.stageLabel")}: ${tx(DEAL_STAGE_META[d.stage])}`,
    "",
    t("postdeal.mailSignoff"),
    state.profile?.name ?? "",
  ];
  return buildMailto(toEmail, subject, bodyLines.join("\n"));
}

function renderPostDealPanel() {
  const el = document.getElementById("postdeal-panel");
  const d = state.deals.find((x) => x.id === state.selectedDealId);

  if (!d) {
    el.innerHTML = `<div class="postdeal-empty">${t("postdeal.emptyHint")}</div>`;
    return;
  }

  const statusClass = { PUBLISHED: "ok", PENDING: "pending", PAID: "ok" };
  const signed = d.stage === "SIGNED";
  const guessedEmail = guessDealEmail(d);

  el.innerHTML = `
    <div class="postdeal-confirm${signed ? " is-signed" : ""}">
      ${
        signed
          ? `<span class="signed-label">${t("postdeal.signedNote")}</span>
             <input class="manage-input" id="deal-mail-recipient" placeholder="${t("postdeal.recipientEmailPlaceholder")}" value="${guessedEmail}" autocomplete="off" />
             <button class="btn btn-ghost btn-sm" id="btn-resend-deal-mail">${t("postdeal.resendMailBtn")}</button>`
          : `<input class="manage-input" id="deal-mail-recipient" placeholder="${t("postdeal.recipientEmailPlaceholder")}" value="${guessedEmail}" autocomplete="off" />
             <button class="btn btn-primary btn-sm" id="btn-confirm-deal">${t("postdeal.confirmMailBtn")}</button>`
      }
    </div>
    <div>
      <div class="postdeal-col-title">${d.brand} — ${t("postdeal.deliveryCol")}</div>
      ${d.deliverables.length === 0 ? `<div class="postdeal-empty">${t("postdeal.noDeliverables")}</div>` : ""}
      ${d.deliverables
        .map(
          (item) => `
        <div class="postdeal-row">
          <span>${tx(item.type)} · ${formatDueDate(item.dueDate)}</span>
          <span class="status-pill ${statusClass[item.status]}">${t("status." + item.status)}</span>
        </div>
        ${
          item.status === "PUBLISHED" && item.proofUrl
            ? `<div class="proof-line">
                <a href="${item.proofUrl}" target="_blank" rel="noopener noreferrer">${t("postdeal.viewProof")} ↗</a>
                ${item.proofNote ? ` · ${item.proofNote}` : ""}
                ${item.fulfilledAt ? ` · ${formatDueDate(item.fulfilledAt)} ${t("postdeal.fulfilledOn")}` : ""}
              </div>`
            : ""
        }
        ${
          item.status === "PENDING"
            ? `<div class="proof-form">
                <input class="manage-input proof-url-input" data-proof-url="${item.id}" placeholder="${t("postdeal.proofUrlPlaceholder")}" autocomplete="off" />
                <input class="manage-input proof-note-input" data-proof-note="${item.id}" placeholder="${t("postdeal.proofNotePlaceholder")}" autocomplete="off" />
                <button class="btn btn-ghost btn-sm" data-mark-fulfilled="${item.id}">${t("postdeal.markFulfilled")}</button>
              </div>`
            : ""
        }`
        )
        .join("")}
      <div class="proof-form">
        <input class="manage-input" id="new-deliverable-type" placeholder="${t("postdeal.deliverableTypePlaceholder")}" autocomplete="off" />
        <button class="btn btn-ghost btn-sm" id="btn-add-deliverable">${t("postdeal.deliverableAddBtn")}</button>
      </div>
    </div>
    <div>
      <div class="postdeal-col-title">${t("postdeal.paymentCol")}</div>
      ${d.payments
        .map(
          (p) => `
        <div class="postdeal-row">
          <span>${tx(p.milestone)}${p.dueDate ? ` · ${formatDueDate(p.dueDate)}` : ""}</span>
          <span class="status-pill ${statusClass[p.status]}">${t("status." + p.status)} · ${formatMoney(p)}</span>
        </div>`
        )
        .join("")}
    </div>
    <div>
      <div class="postdeal-col-title">${t("postdeal.perfCol")}</div>
      ${
        d.performance
          ? `
      <div class="perf-stat">
        <div class="perf-value">${Number(d.performance.reach).toLocaleString(locale())}</div>
        <div class="perf-label">${t("postdeal.reach")}</div>
      </div>
      <div class="perf-stat" style="margin-top:10px;">
        <div class="perf-value">${formatPercent(d.performance.engagementRate / 100, 1)}</div>
        <div class="perf-label">${t("postdeal.engagement")}</div>
      </div>
      <div class="perf-stat" style="margin-top:10px;">
        <div class="perf-value">${d.performance.linkClicks}</div>
        <div class="perf-label">${t("postdeal.linkClicks")}</div>
      </div>`
          : ""
      }
    </div>
  `;

  el.querySelectorAll("[data-mark-fulfilled]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.markFulfilled;
      const proofUrl = el.querySelector(`[data-proof-url="${id}"]`).value.trim();
      const proofNote = el.querySelector(`[data-proof-note="${id}"]`).value.trim();
      if (!proofUrl) {
        showToast(t("postdeal.proofUrlPlaceholder"), "error");
        return;
      }
      try {
        await db.markDeliverableFulfilled(id, { proofUrl, proofNote });
        state.deals = await db.getDeals();
        renderKanban();
        renderPostDealPanel();
        showToast(t("postdeal.proofSaved"), "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.getElementById("btn-add-deliverable")?.addEventListener("click", async () => {
    const type = document.getElementById("new-deliverable-type").value.trim();
    if (!type) return;
    try {
      const dueDate = new Date(Date.now() + 7 * 86400000).toISOString();
      await db.createDeliverable(d.id, { type, dueDate });
      state.deals = await db.getDeals();
      renderKanban();
      renderPostDealPanel();
      showToast(t("postdeal.deliverableAdded"), "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  document.getElementById("btn-confirm-deal")?.addEventListener("click", async () => {
    const toEmail = document.getElementById("deal-mail-recipient").value.trim();
    if (!toEmail) {
      showToast(t("postdeal.recipientEmailRequired"), "error");
      return;
    }
    try {
      await db.updateDealStage(d.id, "SIGNED");
      state.deals = await db.getDeals();
      renderKanban();
      renderPostDealPanel();
      showToast(t("postdeal.dealSigned"), "success");
      openExternal(buildDealMailtoUrl(d, toEmail));
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  document.getElementById("btn-resend-deal-mail")?.addEventListener("click", () => {
    const toEmail = document.getElementById("deal-mail-recipient").value.trim();
    if (!toEmail) {
      showToast(t("postdeal.recipientEmailRequired"), "error");
      return;
    }
    openExternal(buildDealMailtoUrl(d, toEmail));
  });
}

// ---------- Bookings ----------

function renderBookings() {
  const el = document.getElementById("booking-list");
  const note = document.getElementById("booking-empty-note");
  el.innerHTML = "";

  const justCreated = state.bookings.find((b) => state.createdBookingIds.has(b.id));
  const sourceThread = justCreated?.sourceThreadId ? state.threads.find((th) => th.id === justCreated.sourceThreadId) : null;
  if (justCreated && sourceThread) {
    note.textContent = `${t("booking.createdNotePrefix")}${sourceThread.sender}${t("booking.createdNoteSuffix")}`;
    note.classList.add("is-visible");
  } else {
    note.classList.remove("is-visible");
  }

  const pro = entitlements.isPro();
  state.bookings.filter(matchesActiveAccount).forEach((b) => {
    const row = document.createElement("div");
    row.className = "booking-row" + (state.createdBookingIds.has(b.id) ? " is-new" : "");
    row.innerHTML = `
      <div class="booking-date">${formatBookingDate(b.date)}</div>
      <div class="booking-time">${b.startTime} – ${b.endTime}</div>
      <div class="booking-title">${tx(b.title)}</div>
      <button class="btn btn-ghost btn-sm booking-calendar-btn${pro ? "" : " is-locked"}" data-export-booking="${b.id}">
        ${pro ? t("booking.addToCalendar") : t("booking.addToCalendarPro")}
      </button>
    `;
    el.appendChild(row);
  });

  el.querySelectorAll("[data-export-booking]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const booking = state.bookings.find((x) => x.id === btn.dataset.exportBooking);
      try {
        await exportBookingToCalendar(booking);
        showToast(t("booking.calendarExported"), "success");
      } catch (err) {
        if (err.message === "PRO_REQUIRED") {
          showToast(t("booking.calendarProRequired"), "info");
        } else {
          showToast(err.message, "error");
        }
      }
    });
  });
}

// ---------- Assistant (Pro) ----------

const ASSISTANT_EXAMPLE_KEYS = ["pending", "offers", "bookings", "deals", "overdue", "links"];

function renderAssistant() {
  const locked = document.getElementById("assistant-locked");
  const chat = document.getElementById("assistant-chat");
  if (!locked) return;
  document.getElementById("btn-open-assistant")?.setAttribute("aria-label", t("nav.assistant"));
  if (!entitlements.isPro()) {
    locked.style.display = "";
    chat.style.display = "none";
    locked.innerHTML = `<div class="manage-card"><div class="manage-limit-note">${t("assistant.proRequired")}</div></div>`;
    return;
  }
  locked.style.display = "none";
  chat.style.display = "";

  document.getElementById("assistant-input").placeholder = t("assistant.placeholder");
  document.getElementById("assistant-send").textContent = t("assistant.send");

  const msgs = state.assistantMessages.length ? state.assistantMessages : [{ role: "bot", text: t("assistant.welcome") }];
  const box = document.getElementById("assistant-messages");
  box.innerHTML = msgs
    .map((m) => {
      const tag = m.source === "local" ? t("assistant.tagLocal") : m.source === "ai" ? t("assistant.tagAi") : "";
      return `<div class="assistant-msg ${m.role === "user" ? "is-user" : "is-bot"}">${esc(m.text)}${tag ? `<span class="assistant-msg-tag">${tag}</span>` : ""}</div>`;
    })
    .join("");
  box.lastElementChild?.scrollIntoView({ block: "nearest" });

  const chips = document.getElementById("assistant-chips");
  chips.innerHTML = ASSISTANT_EXAMPLE_KEYS.map((k) => t(`assistant.ex.${k}`)).map((q) => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("");
  chips.querySelectorAll("[data-q]").forEach((btn) => btn.addEventListener("click", () => askAssistant(btn.dataset.q)));
}

async function askAssistant(query) {
  const q = query.trim();
  if (!q) return;
  if (!entitlements.isPro()) return showToast(t("assistant.proRequired"), "info");
  state.assistantMessages.push({ role: "user", text: q });
  state.assistantMessages.push({ role: "bot", text: t("assistant.thinking"), pending: true });
  renderAssistant();
  let reply;
  try {
    reply = await assistant.ask(q, { threads: state.threads, deals: state.deals, bookings: state.bookings, linkStats: state.linkStats });
  } catch (err) {
    reply = { text: err.message, source: "none" };
  }
  state.assistantMessages = state.assistantMessages.filter((m) => !m.pending);
  state.assistantMessages.push({ role: "bot", text: reply.text, source: reply.source });
  renderAssistant();
}

document.getElementById("assistant-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("assistant-input");
  const q = input.value;
  input.value = "";
  askAssistant(q);
});
document.getElementById("btn-open-assistant").addEventListener("click", () => setView("assistant"));

// ---------- Notifications (Pro): rules + settings ----------

const NOTIFY_DEFAULTS = {
  notify_dm_enabled: "1",
  notify_dm_threshold: "3",
  notify_brand_enabled: "1",
  notify_booking_enabled: "1",
  dm_since_notify: "0",
};

const SAMPLE_INCOMING = {
  tr: {
    dm: { sender: "yeni.takipci", handle: "yeni.takipci", text: "Selam, videolarına bayılıyorum çok tatlısın, bir sorum var" },
    brand: { sender: "Mert — Nova Teknoloji", handle: "novateknoloji", text: "Merhaba, iş birliği yapmak isteriz, yeni ürünümüz için bütçemiz 30.000 TL" },
    booking: { sender: "Selin — Bloom PR", handle: "bloom.pr", text: "Merhaba, önümüzdeki hafta çarşamba 15:00 için bir görüşme ayarlayabilir miyiz? Uygun musun" },
  },
  en: {
    dm: { sender: "new.follower", handle: "new.follower", text: "Hi, I love your videos, you're so sweet, I have a question" },
    brand: { sender: "Mert — Nova Tech", handle: "novatech", text: "Hello, we'd love to collaborate, our budget for the new product launch is 30,000 TRY" },
    booking: { sender: "Selin — Bloom PR", handle: "bloom.pr", text: "Hi, can we schedule a meeting next Wednesday at 3pm? Are you available?" },
  },
  de: {
    dm: { sender: "neue.followerin", handle: "neue.followerin", text: "Hallo, ich liebe deine Videos, du bist so toll, ich habe eine Frage" },
    brand: { sender: "Mert — Nova Tech", handle: "novatech", text: "Hallo, wir möchten gern zusammenarbeiten, unser Budget für den Produktlaunch beträgt 30.000 TRY" },
    booking: { sender: "Selin — Bloom PR", handle: "bloom.pr", text: "Hallo, können wir nächsten Mittwoch um 15 Uhr einen Termin vereinbaren? Bist du verfügbar?" },
  },
  fr: {
    dm: { sender: "nouvelle.abonnee", handle: "nouvelle.abonnee", text: "Coucou, j'adore tes vidéos, tu es géniale, j'ai une question" },
    brand: { sender: "Mert — Nova Tech", handle: "novatech", text: "Bonjour, nous aimerions collaborer, notre budget pour le lancement du produit est de 30 000 TRY" },
    booking: { sender: "Selin — Bloom PR", handle: "bloom.pr", text: "Bonjour, pouvons-nous fixer un rendez-vous mercredi prochain à 15 h ? Es-tu disponible ?" },
  },
  it: {
    dm: { sender: "nuova.follower", handle: "nuova.follower", text: "Ciao, adoro i tuoi video, sei bravissima, ho una domanda" },
    brand: { sender: "Mert — Nova Tech", handle: "novatech", text: "Buongiorno, vorremmo collaborare, il nostro budget per il lancio del nuovo prodotto è di 30.000 TRY" },
    booking: { sender: "Selin — Bloom PR", handle: "bloom.pr", text: "Buongiorno, possiamo fissare un appuntamento mercoledì prossimo alle 15? Sei disponibile?" },
  },
  es: {
    dm: { sender: "nueva.seguidora", handle: "nueva.seguidora", text: "Hola, me encantan tus vídeos, eres genial, tengo una pregunta" },
    brand: { sender: "Mert — Nova Tech", handle: "novatech", text: "Hola, nos gustaría colaborar, nuestro presupuesto para el lanzamiento del nuevo producto es de 30.000 TRY" },
    booking: { sender: "Selin — Bloom PR", handle: "bloom.pr", text: "Hola, ¿podemos programar una reunión el próximo miércoles a las 15:00? ¿Estás disponible?" },
  },
  ar: {
    dm: { sender: "new.follower", handle: "new.follower", text: "مرحبًا، أحب فيديوهاتك، أنتِ رائعة، لدي سؤال" },
    brand: { sender: "مراد — نوفا تك", handle: "novatech", text: "مرحبًا، نود التعاون معكِ، ميزانيتنا لإطلاق المنتج الجديد 30,000 ليرة" },
    booking: { sender: "سلين — بلوم للعلاقات", handle: "bloom.pr", text: "مرحبًا، هل يمكننا ترتيب موعد يوم الأربعاء القادم الساعة 3 مساءً؟ هل أنتِ متاحة؟" },
  },
};

function setting(key) {
  return state.settings[key] ?? NOTIFY_DEFAULTS[key];
}

async function saveSetting(key, value) {
  state.settings[key] = String(value);
  await db.setSetting(key, value);
}

// The single entry point for "a message just arrived": a real inbox
// connection would call this too. Brand offers and booking requests notify
// immediately; DMs notify once every N of them.
async function handleIncomingThread(th) {
  if (!entitlements.isPro() || th.intent === "SPAM") return;
  let notified = false;
  const body = `${th.sender}: ${th.snippet}`;
  if ((th.intent === "BRAND_DEAL" || th.intent === "COLLABORATION") && setting("notify_brand_enabled") === "1") {
    notified = await notifications.notifyNow(t("notify.brandTitle"), body);
  } else if (th.intent === "BOOKING_REQUEST" && setting("notify_booking_enabled") === "1") {
    notified = await notifications.notifyNow(t("notify.bookingTitle"), body);
  }
  if (th.channel === "INSTAGRAM_DM" && setting("notify_dm_enabled") === "1") {
    const count = Number(setting("dm_since_notify")) + 1;
    if (count >= Number(setting("notify_dm_threshold")) && !notified) {
      await saveSetting("dm_since_notify", 0);
      await notifications.notifyNow(t("notify.dmTitle"), `${count}${t("notify.dmBodySuffix")}`);
    } else {
      await saveSetting("dm_since_notify", count);
    }
  }
}

async function simulateIncoming(kind) {
  const sample = (SAMPLE_INCOMING[state.lang] ?? SAMPLE_INCOMING.en)[kind];
  const th = await db.createThread({ channel: "INSTAGRAM_DM", sender: sample.sender, senderHandle: sample.handle, fullMessage: sample.text });
  state.threads.unshift(th);
  renderThreadList();
  showToast(t("notify.simulated"), "success");
  await handleIncomingThread(th);
}

async function renderNotifySettings() {
  const el = document.getElementById("notify-settings");
  if (!el) return;
  if (!entitlements.isPro()) {
    el.innerHTML = `<div class="manage-card"><div class="manage-title">${t("notify.title")}</div><div class="manage-limit-note">${t("notify.proRequired")}</div></div>`;
    return;
  }
  const perm = await notifications.getPermission();
  const check = (key) => (setting(key) === "1" ? "checked" : "");
  el.innerHTML = `
    <div class="manage-card">
      <div class="manage-title">${t("notify.title")}</div>
      <label class="notify-row"><input type="checkbox" data-notify-key="notify_dm_enabled" ${check("notify_dm_enabled")} /> ${t("notify.dmRule")}</label>
      <div class="notify-row notify-threshold">
        <span>${t("notify.dmThresholdLabel")}</span>
        <select class="manage-select" id="notify-threshold">
          ${[1, 3, 5, 10].map((n) => `<option value="${n}" ${Number(setting("notify_dm_threshold")) === n ? "selected" : ""}>${n}</option>`).join("")}
        </select>
      </div>
      <label class="notify-row"><input type="checkbox" data-notify-key="notify_brand_enabled" ${check("notify_brand_enabled")} /> ${t("notify.brandRule")}</label>
      <label class="notify-row"><input type="checkbox" data-notify-key="notify_booking_enabled" ${check("notify_booking_enabled")} /> ${t("notify.bookingRule")}</label>
      ${
        perm === "granted"
          ? `<div class="manage-count">${t("notify.permissionOn")}</div>`
          : perm === "denied"
          ? `<div class="manage-limit-note">${t("notify.permissionDenied")}</div>`
          : `<button class="btn btn-primary btn-sm" id="btn-notify-permission">${t("notify.permissionBtn")}</button>`
      }
      <div class="manage-count" style="margin-top:12px;">${t("notify.note")}</div>
      <div class="detail-actions" style="margin-top:10px;">
        <button class="btn btn-ghost btn-sm" data-simulate="dm">${t("notify.simDm")}</button>
        <button class="btn btn-ghost btn-sm" data-simulate="brand">${t("notify.simBrand")}</button>
        <button class="btn btn-ghost btn-sm" data-simulate="booking">${t("notify.simBooking")}</button>
      </div>
    </div>`;

  el.querySelectorAll("[data-notify-key]").forEach((box) =>
    box.addEventListener("change", () => saveSetting(box.dataset.notifyKey, box.checked ? "1" : "0"))
  );
  document.getElementById("notify-threshold").addEventListener("change", (e) => {
    saveSetting("notify_dm_threshold", e.target.value);
    saveSetting("dm_since_notify", 0);
  });
  document.getElementById("btn-notify-permission")?.addEventListener("click", async () => {
    await notifications.requestPermission();
    renderNotifySettings();
  });
  el.querySelectorAll("[data-simulate]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        await simulateIncoming(btn.dataset.simulate);
      } catch (err) {
        showToast(err.message, "error");
      }
    })
  );
}

// If DMs are piling up unanswered when the app leaves the foreground, leave
// a reminder for later; coming back to the app cancels it.
function initLifecycle() {
  CapacitorApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      notifications.cancelReminder();
      return;
    }
    if (!entitlements.isPro() || setting("notify_dm_enabled") !== "1") return;
    const pending = state.threads.filter((th) => th.channel === "INSTAGRAM_DM" && th.status === "PENDING" && th.intent !== "SPAM").length;
    if (pending >= Number(setting("notify_dm_threshold"))) {
      notifications.scheduleReminder(t("notify.reminderTitle"), `${pending}${t("notify.reminderBodySuffix")}`, 2 * 3_600_000);
    }
  });
}

// ---------- Links: bundles + send tracking ----------

function formatBundleText(bundle) {
  const lines = bundle.items.map((it) => `• ${it.label ? `${it.label}: ` : ""}${it.url}`);
  return `${bundle.name}:\n${lines.join("\n")}`;
}

// One link per line: "Label | https://..." or just "https://...".
function parseBundleItems(raw) {
  return raw
    .split("\n")
    .map((line) => {
      const [first, ...rest] = line.split("|");
      const hasLabel = rest.length > 0;
      const url = (hasLabel ? rest.join("|") : first).trim();
      return { label: hasLabel ? first.trim() : "", url };
    })
    .filter((it) => /^https?:\/\/\S+$/i.test(it.url));
}

async function refreshLinks() {
  state.linkBundles = await db.getLinkBundles();
  state.linkStats = await db.getLinkStats();
  renderLinks();
  renderThreadDetail();
}

function renderLinks() {
  const statsEl = document.getElementById("link-stats");
  const listEl = document.getElementById("link-bundles");
  const manageEl = document.getElementById("link-manage");
  if (!statsEl) return;
  const stats = state.linkStats ?? { total: 0, last7: 0, byBundle: [], byRoute: [] };

  statsEl.innerHTML = `
    <div class="manage-card">
      <div class="manage-title">${t("links.statsTitle")}</div>
      <div class="link-stat-row">
        <div class="link-stat"><div class="link-stat-value">${stats.total}</div><div class="link-stat-label">${t("links.statsTotal")}</div></div>
        <div class="link-stat"><div class="link-stat-value">${stats.last7}</div><div class="link-stat-label">${t("links.statsWeek")}</div></div>
      </div>
      ${
        stats.byRoute.length
          ? `<div class="manage-label">${t("links.byRoute")}</div>
             ${stats.byRoute.map((r) => `<div class="link-route-row"><span>${t("route." + r.route)}</span><strong>${r.count}</strong></div>`).join("")}`
          : ""
      }
      <div class="manage-count" style="margin-top:12px;">${t("links.statsNote")}</div>
    </div>`;

  listEl.innerHTML = state.linkBundles
    .map((b) => {
      const sent = stats.byBundle.find((x) => x.bundleId === b.id)?.count ?? 0;
      return `
      <div class="manage-card link-bundle-card">
        <div class="manage-title">${esc(b.name)}</div>
        <div class="manage-count">${sent > 0 ? `${sent}${t("links.timesSent")}` : t("links.neverSent")}</div>
        ${b.items.map((it) => `<div class="link-item"><strong>${esc(it.label || "")}</strong> <span>${esc(it.url)}</span></div>`).join("")}
        <div class="detail-actions" style="margin-top:12px;">
          <button class="btn btn-ghost btn-sm" data-copy-bundle="${b.id}">${t("links.copyBundle")}</button>
          <button class="btn btn-ghost btn-sm" data-delete-bundle="${b.id}">${t("links.deleteBundle")}</button>
        </div>
      </div>`;
    })
    .join("");

  manageEl.innerHTML = !entitlements.isPro()
    ? `<div class="manage-card">
        <div class="manage-title">${t("links.addTitle")}</div>
        <div class="manage-limit-note">${t("links.proRequired")}</div>
      </div>`
    : `
    <div class="manage-card">
      <div class="manage-title">${t("links.addTitle")}</div>
      <div class="manage-form">
        <label class="manage-label">${t("links.nameLabel")}</label>
        <input class="manage-input" id="new-bundle-name" placeholder="${t("links.namePlaceholder")}" autocomplete="off" />
        <label class="manage-label">${t("links.itemsLabel")}</label>
        <textarea class="manage-input" id="new-bundle-items" rows="4" placeholder="${t("links.itemsPlaceholder")}"></textarea>
        <button class="btn btn-primary" id="btn-add-bundle-def">${t("links.addBtn")}</button>
      </div>
    </div>`;

  listEl.querySelectorAll("[data-copy-bundle]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const bundle = state.linkBundles.find((b) => b.id === btn.dataset.copyBundle);
      try {
        await Clipboard.write({ string: formatBundleText(bundle) });
        showToast(t("links.copied"), "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    })
  );
  listEl.querySelectorAll("[data-delete-bundle]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        await db.deleteLinkBundle(btn.dataset.deleteBundle);
        await refreshLinks();
        showToast(t("links.removed"), "info");
      } catch (err) {
        showToast(err.message, "error");
      }
    })
  );
  document.getElementById("btn-add-bundle-def")?.addEventListener("click", async () => {
    if (!entitlements.isPro()) return showToast(t("links.proRequired"), "info");
    const name = document.getElementById("new-bundle-name").value.trim();
    const items = parseBundleItems(document.getElementById("new-bundle-items").value);
    if (!name || items.length === 0) {
      showToast(t("links.invalid"), "error");
      return;
    }
    try {
      await db.createLinkBundle({ name, items });
      await refreshLinks();
      showToast(t("links.added"), "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// ---------- Persona ----------

async function selectPersona(personaId) {
  if (state.profile.activePersonaId === personaId) return;
  try {
    state.profile = await db.updateProfile({ activePersonaId: personaId });
    renderPersonaGrid();
    renderPersonaPreview();
    renderOnboardingCard();
    showToast(t("persona.updated"), "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderPersonaGrid() {
  const el = document.getElementById("persona-grid");
  el.innerHTML = "";
  state.personas.forEach((p) => {
    const card = document.createElement("div");
    card.className = "persona-card" + (p.id === state.profile?.activePersonaId ? " is-selected" : "");
    card.innerHTML = `
      <div class="persona-name">${tx(p.name)}</div>
      <div class="persona-desc">${tx(p.description)}</div>
    `;
    card.addEventListener("click", () => selectPersona(p.id));
    el.appendChild(card);
  });
}

function renderPersonaPreview() {
  const el = document.getElementById("persona-preview");
  const p = state.personas.find((x) => x.id === state.profile?.activePersonaId) ?? state.personas[0];
  if (!p) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="persona-preview-label">${t("persona.previewLabel")}</div>
    <div class="persona-preview-text">${tx(p.example)}</div>
  `;
}

// ---------- Onboarding ----------

function renderStepper() {
  const el = document.getElementById("stepper");
  el.innerHTML = ONBOARDING_STEPS.map((s) => {
    const cls = s.id < state.onboardingStep ? "is-done" : s.id === state.onboardingStep ? "is-active" : "";
    return `<div class="step-dot ${cls}"><div class="step-bar"></div><div class="step-label">${tx(s.label)}</div></div>`;
  }).join("");
}

function renderOnboardingCard() {
  const el = document.getElementById("onboarding-card");
  const step = ONBOARDING_STEPS.find((s) => s.id === state.onboardingStep);

  let extra = "";
  if (step.showIgCard) {
    extra = igMockCardHTML({ compact: true });
  }
  if (step.showPersonaPicker) {
    extra = `<div class="mini-persona-grid">${state.personas
      .map(
        (p) => `
      <div class="mini-persona-card ${p.id === state.profile?.activePersonaId ? "is-selected" : ""}" data-persona="${p.id}">${tx(p.name)}</div>`
      )
      .join("")}</div>`;
  }

  el.innerHTML = `
    <div class="onboarding-title">${tx(step.title)}</div>
    <div class="onboarding-body">${tx(step.body)}</div>
    ${extra}
    <div class="onboarding-actions">
      ${state.onboardingStep > 1 ? `<button class="btn btn-ghost" id="ob-back">${t("onboarding.back")}</button>` : ""}
      ${
        state.onboardingStep < ONBOARDING_STEPS.length
          ? `<button class="btn btn-primary" id="ob-next">${step.showIgCard ? t("onboarding.connectContinue") : t("onboarding.continue")}</button>`
          : `<button class="btn btn-primary" id="ob-finish">${t("onboarding.finish")}</button>`
      }
    </div>
  `;

  document.getElementById("ob-back")?.addEventListener("click", () => {
    state.onboardingStep -= 1;
    renderStepper();
    renderOnboardingCard();
  });
  document.getElementById("ob-next")?.addEventListener("click", () => {
    state.onboardingStep += 1;
    renderStepper();
    renderOnboardingCard();
  });
  document.getElementById("ob-finish")?.addEventListener("click", async () => {
    try {
      state.profile = await db.updateProfile({ onboardingCompleted: true });
    } catch (err) {
      showToast(err.message, "error");
    }
    setView("inbox");
  });
  el.querySelectorAll(".mini-persona-card").forEach((card) => {
    card.addEventListener("click", () => selectPersona(card.dataset.persona));
  });
}

// ---------- "Screenshot" style IG mock card (reused in Onboarding + Profile) ----------

function igMockCardHTML({ compact }) {
  const p = state.profile;
  if (!p) return "";
  return `
    <div class="ig-mock-card" style="${compact ? "max-width:340px;" : ""}">
      <div class="ig-mock-chrome">
        <div class="ig-mock-dot"></div><div class="ig-mock-dot"></div><div class="ig-mock-dot"></div>
        <div class="ig-mock-url">instagram.com/${p.handle.replace("@", "")}</div>
      </div>
      <div class="ig-mock-body">
        <div class="ig-mock-head">
          <div class="ig-mock-avatar"><div class="ig-mock-avatar-inner">EK</div></div>
          <div class="ig-mock-stats">
            <div><div class="ig-mock-stat-value">${p.postsCount.toLocaleString(locale())}</div><div class="ig-mock-stat-label">${t("ig.posts")}</div></div>
            <div><div class="ig-mock-stat-value">${formatCompactNumber(p.followersCount)}</div><div class="ig-mock-stat-label">${t("ig.followers")}</div></div>
            <div><div class="ig-mock-stat-value">${p.followingCount}</div><div class="ig-mock-stat-label">${t("ig.following")}</div></div>
          </div>
        </div>
        <div class="ig-mock-bio"><strong>${p.name}</strong><br>${tx(p.bio)}</div>
        <div class="ig-mock-grid">
          ${IG_MOCK_THUMBS.map((c) => `<div class="ig-mock-thumb" style="background:${c};"></div>`).join("")}
        </div>
        <div class="ig-mock-connected-tag">${t("ig.connected")}</div>
      </div>
    </div>
  `;
}

// ---------- Profile ----------

function renderProfileCard() {
  document.getElementById("profile-card").innerHTML = igMockCardHTML({ compact: false });
}

function renderAccountsList() {
  const el = document.getElementById("accounts-list");
  el.innerHTML = state.accounts
    .map((a) => {
      const meta = CHANNEL_META[a.channel];
      const connected = a.connectionState === "CONNECTED";
      const metaLine = connected
        ? `${a.handle ?? ""} · ${t("profile.connectedSincePrefix")}${formatPlainDate(a.connectedSince)}${t("profile.connectedSinceSuffix")}`
        : a.restrictionReason || t("profile.notConnectedYet");
      return `
      <div class="account-row ${connected ? "is-connected" : "is-pending"}">
        <div class="account-row-icon">${meta.icon}</div>
        <div>
          <div class="account-row-name">${tx(meta.label)}</div>
          <div class="account-row-meta">${metaLine}</div>
        </div>
        ${
          connected
            ? `<span class="account-row-status">${t("profile.connected")}</span><button class="account-row-remove" data-remove-account="${a.id}" aria-label="${t("accounts.removeBtn")}">✕</button>`
            : `<span class="account-row-status info-tip" tabindex="0">${t("profile.restricted")}<span class="info-tip-bubble">${a.restrictionReason || ""}</span></span>`
        }
      </div>`;
    })
    .join("");

  el.querySelectorAll("[data-remove-account]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await db.deleteAccount(btn.dataset.removeAccount);
        state.profile = await db.getProfile();
        state.accounts = state.profile.accounts;
        state.threads = await db.getThreads();
        renderAccountsList();
        renderAccountManage();
        renderDealManage();
        renderChannelBar();
        renderAccountTabs();
        renderThreadList();
        showToast(t("accounts.removed"), "info");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

const CONNECTABLE_CHANNELS = ["INSTAGRAM_DM", "INSTAGRAM_COMMENT", "EMAIL"];
const MAX_FREE_ACCOUNTS = 2;

function renderAccountManage() {
  const el = document.getElementById("account-manage");
  if (!el) return;
  const connectedCount = state.accounts.filter((a) => a.connectionState === "CONNECTED").length;
  const pro = entitlements.isPro();
  const atLimit = !pro && connectedCount >= MAX_FREE_ACCOUNTS;
  const countLine = pro ? `${connectedCount} ${t("accounts.limitPro")}` : `${connectedCount}/${MAX_FREE_ACCOUNTS} ${t("accounts.limitFree")}`;

  el.innerHTML = `
    <div class="manage-card">
      <div class="manage-title">${t("accounts.addTitle")}</div>
      <div class="manage-count">${countLine}</div>
      ${
        atLimit
          ? `<div class="manage-limit-note">${t("accounts.limitReached")}</div>`
          : `
        <div class="manage-form">
          <label class="manage-label">${t("accounts.channelLabel")}</label>
          <select class="manage-select" id="new-account-channel">
            ${CONNECTABLE_CHANNELS.map((c) => `<option value="${c}">${tx(CHANNEL_META[c].label)}</option>`).join("")}
          </select>
          <label class="manage-label">${t("accounts.handleLabel")}</label>
          <input class="manage-input" id="new-account-handle" placeholder="${t("accounts.handlePlaceholder")}" autocomplete="off" />
          <button class="btn btn-primary" id="btn-add-account">${t("accounts.addBtn")}</button>
        </div>
      `
      }
    </div>
  `;

  document.getElementById("btn-add-account")?.addEventListener("click", async () => {
    const channel = document.getElementById("new-account-channel").value;
    const handle = document.getElementById("new-account-handle").value.trim();
    if (!handle) return;
    try {
      await db.createAccount({ channel, handle });
      state.profile = await db.getProfile();
      state.accounts = state.profile.accounts;
      renderAccountsList();
      renderAccountManage();
      renderDealManage();
      renderChannelBar();
      renderAccountTabs();
      showToast(t("accounts.added"), "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

function renderProfileActions() {
  const el = document.getElementById("profile-actions");
  if (!el) return;
  el.innerHTML = `<button class="btn btn-ghost" id="btn-restart-onboarding">${t("onboarding.restartBtn")}</button>`;
  document.getElementById("btn-restart-onboarding").addEventListener("click", () => {
    state.onboardingStep = 1;
    renderStepper();
    renderOnboardingCard();
    setView("onboarding");
  });
}

// ---------- Pro / OpenAI key (Profile screen) ----------

async function renderProUpsell() {
  const el = document.getElementById("pro-section");
  const pro = entitlements.isPro();

  if (!pro) {
    el.innerHTML = `
      <div class="pro-card">
        <div class="pro-title">${t("pro.title")}</div>
        <div class="pro-desc">${t("pro.freeDesc")}</div>
        <div class="pro-actions">
          <button class="btn btn-primary" id="btn-upgrade-pro">${t("pro.upgradeBtn")}</button>
          <button class="btn btn-ghost" id="btn-restore-pro">${t("pro.restoreBtn")}</button>
        </div>
      </div>
    `;
    document.getElementById("btn-upgrade-pro").addEventListener("click", async () => {
      try {
        const offerings = await entitlements.getOfferings();
        const pkg = offerings?.current?.availablePackages?.[0];
        await entitlements.purchasePro(pkg);
        await renderProUpsell();
        renderAccountManage();
        renderDealManage();
        renderLinks();
        renderThreadDetail();
        renderNotifySettings();
        showToast(t("pro.activeLabel"), "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
    document.getElementById("btn-restore-pro").addEventListener("click", async () => {
      try {
        const restored = await entitlements.restorePurchases();
        if (restored) {
          await renderProUpsell();
          renderAccountManage();
          renderDealManage();
          renderLinks();
          renderThreadDetail();
          renderNotifySettings();
        }
        showToast(restored ? t("pro.activeLabel") : "—", restored ? "success" : "info");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
    return;
  }

  const existingKey = await entitlements.getOpenAiKey();
  el.innerHTML = `
    <div class="pro-card is-active">
      <div class="pro-title">${t("pro.title")} <span class="pro-badge">${t("pro.activeLabel")}</span></div>
      <label class="pro-key-label" for="openai-key-input">${t("pro.keyLabel")}</label>
      <div class="pro-key-row">
        <input type="password" id="openai-key-input" class="pro-key-input" placeholder="${t("pro.keyPlaceholder")}" value="${existingKey ?? ""}" autocomplete="off" />
        <button class="btn btn-primary" id="btn-save-key">${t("pro.keySave")}</button>
      </div>
      <div class="pro-key-hint">${t("pro.keyHint")}</div>
      <div class="pro-key-saved-note" id="key-saved-note">${t("pro.keySaved")}</div>
    </div>
  `;
  document.getElementById("btn-save-key").addEventListener("click", async () => {
    const value = document.getElementById("openai-key-input").value.trim();
    await entitlements.setOpenAiKey(value);
    document.getElementById("key-saved-note").classList.add("is-visible");
  });
}

// ---------- Render everything (used on init and on language switch) ----------

function renderAll() {
  applyI18n();
  renderLangSwitch();
  renderInfoTips();
  renderChannelBar();
  renderAccountTabs();
  renderFilterChips();
  renderThreadList();
  renderThreadDetail();
  renderKanban();
  renderDealManage();
  renderPostDealPanel();
  renderBookings();
  renderLinks();
  renderPersonaGrid();
  renderPersonaPreview();
  renderStepper();
  renderOnboardingCard();
  renderProfileCard();
  renderAccountsList();
  renderAccountManage();
  renderProfileActions();
  renderProUpsell();
  renderNotifySettings();
  renderAssistant();
}

// ---------- Boot: init the on-device DB + entitlements, then load & render ----------

async function loadAll() {
  await db.init();
  await entitlements.configure();

  const [threads, deals, bookings, personas, profile] = await Promise.all([
    db.getThreads(),
    db.getDeals(),
    db.getBookings(),
    db.getPersonas(),
    db.getProfile(),
  ]);

  const personaOrder = ["samimi", "profesyonel", "esprili"];

  state.threads = threads;
  state.deals = deals;
  state.bookings = bookings;
  state.personas = [...personas].sort((a, b) => personaOrder.indexOf(a.id) - personaOrder.indexOf(b.id));
  state.profile = profile;
  state.accounts = profile.accounts ?? [];
  state.settings = await db.getSettings();
  state.linkBundles = await db.getLinkBundles();
  state.linkStats = await db.getLinkStats();

  state.selectedThreadId = threads.find((th) => th.status === "PENDING")?.id ?? threads[0]?.id ?? null;
  state.selectedDealId = deals.find((d) => d.deliverables?.length)?.id ?? deals[0]?.id ?? null;
}

async function boot() {
  document.getElementById("boot-overlay").style.display = "flex";
  document.getElementById("boot-error").style.display = "none";
  try {
    await loadAll();
  } catch (err) {
    document.getElementById("boot-overlay").style.display = "none";
    document.getElementById("boot-error").style.display = "flex";
    document.getElementById("boot-error-message").textContent = err.message;
    return;
  }
  document.getElementById("boot-overlay").style.display = "none";
  document.getElementById("app-root").style.display = "";
  if (!state.profile.onboardingCompleted) {
    setView("onboarding");
  }
  renderAll();
  if (pendingDeepLink) {
    const link = pendingDeepLink;
    pendingDeepLink = null;
    lastDeepLink = { url: "", at: 0 };
    handleDeepLink(link);
  }
}

document.getElementById("boot-retry").addEventListener("click", boot);

// ---------- Deep links: launcher shortcuts open the assistant with a command ----------

const SHORTCUT_COMMANDS = new Set(["pending", "offers", "bookings", "deals", "overdue", "links"]);

let pendingDeepLink = null;
let lastDeepLink = { url: "", at: 0 };

function handleDeepLink(url) {
  // A cold start can report the same link twice (launch URL + new-intent event).
  if (url === lastDeepLink.url && Date.now() - lastDeepLink.at < 5000) return;
  lastDeepLink = { url, at: Date.now() };
  if (!state.profile) {
    pendingDeepLink = url; // app still booting; boot() replays it
    return;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "creatoros:" || parsed.hostname !== "assistant") return;
  const cmd = parsed.searchParams.get("cmd");
  setView("assistant");
  if (SHORTCUT_COMMANDS.has(cmd)) askAssistant(t(`assistant.ex.${cmd}`));
}

CapacitorApp.addListener("appUrlOpen", ({ url }) => handleDeepLink(url));
CapacitorApp.getLaunchUrl()
  .then((launch) => launch?.url && handleDeepLink(launch.url))
  .catch(() => {});

// ---------- Android-only: system bar style + hardware back button ----------

function initAndroid() {
  if (Capacitor.getPlatform() !== "android") return;

  // The top bar is dark in both themes, so the status bar needs light icons
  // regardless of the device theme. The navigation bar keeps DEFAULT so it
  // follows the device theme like our light/dark bottom nav does.
  SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar }).catch(() => {});

  // Back should peel back one level (thread detail -> list -> Inbox) and only
  // exit the app from the Inbox list, instead of always closing the app.
  CapacitorApp.addListener("backButton", () => {
    const layout = document.querySelector(".inbox-layout");
    if (state.view === "inbox" && layout?.classList.contains("show-detail")) {
      layout.classList.remove("show-detail");
    } else if (state.view !== "inbox") {
      setView("inbox");
    } else {
      CapacitorApp.exitApp();
    }
  });
}

// Language: the saved choice, else the device language (English if the device
// uses none of ours). Detection is not persisted, so an unset user keeps
// following the device; an explicit pick in the selector is remembered.
mergeDataTranslations();
applyLangToDocument(readStoredLang() ?? detectDeviceLang());
Preferences.set({ key: "creatoros_lang", value: state.lang }).catch(() => {});
applyI18n();

initAndroid();
initLifecycle();
boot();
