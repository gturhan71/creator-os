# Mağaza gizlilik formları için cevaplar

Bu cevaplar uygulamanın **bugünkü** hâline göre yazıldı (24 Eylül 2026 itibarıyla). Formları doldururken
son karar sizde; işaretli (⚠) maddeleri RevenueCat'in ve OpenAI'ın kendi rehberleriyle karşılaştırın.

## Apple — App Store Connect → Uygulama Gizliliği ("nutrition label")

- **İzleme (tracking):** Hayır. Reklam ve izleme yok. (`NSPrivacyTracking = false`)
- **Toplanan veri türleri** (`PrivacyInfo.xcprivacy` ile aynı tutuldu):

| Veri türü | Kullanıcıya bağlı mı | İzleme | Amaç | Neden |
|---|---|---|---|---|
| Satın Alma Geçmişi | Evet | Hayır | Uygulama işlevselliği | RevenueCat, Pro aboneliğini yönetir |
| Kullanıcı Kimliği | Evet | Hayır | Uygulama işlevselliği | RevenueCat anonim uygulama kullanıcı kimliği |
| Diğer Kullanıcı İçeriği ⚠ | Hayır | Hayır | Uygulama işlevselliği | Pro + kendi OpenAI anahtarı: mesaj metni OpenAI'a gider. Bu veri bize gelmez; yine de üçüncü tarafa gittiği için muhafazakâr davranıp bildirdik |

- İletişim bilgisi, konum, kişiler, fotoğraf, tanılama, reklam verisi: **toplanmıyor**.
- Gizlilik politikası URL'si: https://creator-os-five-xi.vercel.app/privacy (Türkçe: /tr/privacy).
- Şifreleme: `ITSAppUsesNonExemptEncryption = false` (yalnızca HTTPS).

## Google Play — Data safety

- **Veri paylaşımı / toplama:**
  - *Satın alma geçmişi* → Toplanır, üçüncü tarafla (RevenueCat) paylaşılır, amaç: Uygulama işlevselliği. Zorunlu (Pro için).
  - *Kullanıcı veya cihaz kimlikleri* (RevenueCat anonim kimliği) → Aynı şekilde.
  - *Mesajlar / kullanıcı içeriği* ⚠ → Yalnızca Pro + kendi OpenAI anahtarı; OpenAI'a gönderilir, isteğe bağlı (kullanıcı anahtar girerse).
- **Şifreleme aktarım sırasında:** Evet (HTTPS).
- **Silme isteği yolu:** Veri cihazda; uygulamayı silmek her şeyi kaldırır. Uygulama içinde öğe silme mümkün.
- **Reklam kimliği:** Kullanılmıyor.
- **Hedef kitle:** 13 yaş ve üzeri; çocuklara yönelik değil.

## Mağaza metninde dikkat (Apple 2.3 / Google Metadata politikası)

Uygulama bugün **gerçek Instagram, e-posta, TikTok veya WhatsApp gelen kutusuna bağlı değil**; gelen kutusu
örnek verilerle çalışıyor ve gerçek mesajlar bu sürümde uygulamaya otomatik gelmiyor. Bu yüzden:

- "Instagram DM'lerini otomatik yanıtlar / gelen kutunu bağlar" gibi ifadeler **kullanmayın**.
- Doğru anlatım: yanıt taslakları, teklif/anlaşma takibi, randevular ve link paketleri; yanıtı Instagram'a veya
  posta uygulamasına **sen gönderirsin**.
- Örnek verilerin kurgusal olduğu ekran görüntülerinde de mağaza açıklamasında da belirtilmeli.
- Ekran görüntülerinde Pro ekranları (Asistan, Linkler, bildirimler) varsa açıklamada "Pro" olarak işaretleyin.

## Yayından önce doldurulacak boşluklar

- Politika web sitesinde yayınlanır (`website/`, Vercel): `/privacy` ve `/tr/privacy`; mağaza formlarına bu adresi girin.
- Mağaza posta adresi isterse politikaya ekleyin.
