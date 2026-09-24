# Creator OS — Gizlilik Politikası

**Yürürlük tarihi:** 24 Eylül 2026
**Geliştirici:** Gökhan TURHAN · **İletişim:** gokhanturhan71@gmail.com
**Uygulama:** Creator OS (paket / bundle kimliği: `com.creatoros.app`)

## Özet

Creator OS cihazında çalışır. Uygulama için bir sunucu işletmiyoruz, kullanıcı
hesabı yok ve verilerini almıyor, saklamıyor ya da satmıyoruz. Uygulamada reklam,
analitik veya izleme yazılımı bulunmaz.

## 1. Cihazında kalanlar

Uygulamada çalıştığın her şey yalnızca telefonundaki bir veritabanında tutulur:
mesajlar ve yanıt taslakları, anlaşmalar, teslimatlar ve kanıt bağlantıları,
randevular, link paketleri, persona'lar, bildirim ayarları ve seçtiğin dil. Bunları
biz göremeyiz. Uygulamayı sildiğinde kaldırılır.

- iOS'ta işletim sistemi, kendi cihaz ayarlarına göre uygulama verisini cihaz veya
  iCloud yedeklerine dahil edebilir.
- OpenAI anahtarın (Pro, aşağıya bak) veritabanında değil, iOS Anahtar Zinciri /
  Android Keystore'da saklanır.
- Uygulama, denemen için kurgusal örnek verilerle gelir; gerçek kişilere ait
  bilgi değildir.

## 2. Uygulamanın yapmadıkları

- Instagram, e-posta veya başka bir sosyal hesabına giriş yapmaz, oradan okumaz,
  oradan göndermez. Yanıtla düğmesi, hazırlanan metinle posta uygulamanı veya
  Instagram'ı açar; gönder tuşuna sen basarsın.
- Rehberine, fotoğraflarına, konumuna, mikrofonuna veya kamerana erişmez.
- Bizde hesap açmaz; adını veya e-postanı istemez.

## 3. Veri alan üçüncü taraflar

Uygulama aşağıdaki servislerle doğrudan cihazından konuşur. Aradan geçmiyoruz ve
bir kopyasını almıyoruz.

| Servis | Ne zaman | Ne gönderilir | Neden |
|---|---|---|---|
| **OpenAI** (api.openai.com) | Yalnızca kendi OpenAI API anahtarını girmiş Pro kullanıcılarında, YZ yanıt taslağı veya asistan cevabı istendiğinde | Yanıtlanan mesajın metni, gönderen adı ve seçili persona; asistan için gelen kutun, randevuların ve anlaşmalarının kısa bir özeti (gönderenler, mesaj başlıkları, marka adları, tutarlar, aşamalar) ve sorun | Taslağı veya cevabı üretmek için. **Senin** OpenAI hesabınla çalışır; OpenAI'ın verileri nasıl sakladığı dahil, OpenAI'ın şartları ve gizlilik politikası geçerlidir. Anahtar yoksa OpenAI'a hiçbir şey gitmez. |
| **RevenueCat** (revenuecat.com) | Uygulama açılırken ve Pro aboneliğini görüntülerken, satın alırken veya geri yüklerken | Anonim uygulama kullanıcı kimliği, satın alma/makbuz bilgisi, cihaz ve uygulama sürümü bilgisi | Pro aboneliğini yönetmek için. Ödemeyi Apple (App Store) veya Google (Google Play) işler; ödeme bilgilerini biz görmeyiz. |

Arayüzde kullanılan yazı tipleri uygulamanın içinde gömülüdür; bu yüzden bir yazı tipi sağlayıcısına bağlanılmaz.

## 4. Senin başlattığın cihaz içi özellikler

- **Bildirimler** cihazında yerel olarak planlanır; hiçbir bildirim sunucusuna
  bir şey gönderilmez.
- **Panoya kopyalama** yalnızca yanıt düğmesine dokunduğunda olur.
- **Takvim aktarımı (Pro)**, sistem paylaşım menüsüyle senin paylaştığın bir dosya
  üretir.
- **Instagram'ı veya posta uygulamanı açmak** yalnızca düğmeye dokunduğunda olur.
- **Siri / başlatıcı kısayolları (Pro)** sana cevap vermek için aynı cihaz içi
  veritabanını okur; bunun için cihazdan dışarı bir şey çıkmaz.

## 5. Hukuki dayanak ve haklarların (AEA, Birleşik Krallık, Türkiye ve benzeri yasalar)

Kişisel verini toplamadığımız ve elimizde tutmadığımız için erişilecek, düzeltilecek,
dışa aktarılacak ya da silinecek bir şey genellikle yoktur. Verini doğrudan sen
yönetirsin: uygulama içinde öğeleri düzenleyebilir veya silebilir, Profil'den
OpenAI anahtarını kaldırabilir, uygulamayı silerek her şeyi kaldırabilirsin.
OpenAI, RevenueCat, Google, Apple veya Google Play'de tutulan veriler için o
şirketlere başvur. Bu servislerin işlemesi, istediğin bir özelliği sunmak için
gerektiğinde, istediğin hizmetin yerine getirilmesine (OpenAI için ayrıca kendi
anahtarını girme tercihine) dayanır.

Gizlilikle ilgili her soru için gokhanturhan71@gmail.com adresine yazabilirsin;
bulunduğun yerdeki veri koruma otoritesine şikâyet hakkın da vardır (Türkiye'de
KVKK Kurumu).

## 6. Çocuklar

Creator OS 13 yaşın altındaki (yerel yasa bu yaşı 16 olarak belirliyorsa 16'nın
altındaki) çocuklara yönelik değildir ve onlardan bilerek veri toplamayız.

## 7. Güvenlik

Veriler cihazının uygulama alanında, API anahtarın sistemin güvenli deposunda
durur. Üçüncü taraflarla bağlantılar HTTPS kullanır.

## 8. Değişiklikler

Bu politikayı değiştirirsek — örneğin dış bir servise bağlanan bir özellik
eklersek — bu sayfayı ve yürürlük tarihini güncelleriz; uygulama, politika
tanımlamadan yeni türde veri göndermeye başlamaz.

## 9. İletişim

Gökhan TURHAN · gokhanturhan71@gmail.com
