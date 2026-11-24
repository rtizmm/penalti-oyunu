# Penaltı Oyunu 3D (V3 — Online 1v1)

Three.js, saf ES modülleri ve WebSocket ile geliştirilmiş, tamamen Türkçe arayüzlü 3D stadyum penaltı oyunu.

## Özellikler
- **7 Oyun Modu**
  - **Online 1v1 (Oda Kodu):** 4 harfli oda kodu veya tek tıkla kopyalanan davet linki (`/?oda=XXXX`) ile gerçek zamanlı WebSocket penaltı düellosu! Gizli nişan/dalış (commit-reveal), canlı kaleci hareketi, 15 sn tur sayacı, hızlı emote çubuğu ve rövanş.
  - **Penaltıcı Ol:** 5 penaltı atışı yap, yapay zekâ kaleciyi geç.
  - **Kaleci Ol:** Kaleye geç, yapay zekâ penaltıcının 5 şutunu kurtar.
  - **Seri Penaltı:** Sırayla 5'er penaltı atışı; eşitlikte ani ölüm (sudden death).
  - **2 Kişilik Lokal:** Aynı klavyede P1 şut (nişangah güç dolarken gizlenir!) vs P2 kaleci (`J/K/L + I`).
  - **Turnuva / Kupa:** Çeyrek Final → Yarı Final → Final eleme turu, artan zorluk ve Şampiyonluk Kupası!
  - **Hedef Vurma:** 10 atışlık 3D ışıklı hedef meydan okuması, 90'a asma bonusları (300 puan) ve kombo çarpanı (`x2`, `x3`...).
- **Gelişmiş Şut Mekanikleri**
  - **4 Şut Tipi:** `1` Normal · `2` Plase (ekstra isabet & kavis) · `3` Panenka (aşırtma) · `4` Trivela (ayak dışı keskin kavis).
  - **Şaşırtma (Stutter-Step):** Koşarken `Shift` veya `Sağ Tık` ile kaleciyi erken atlat!
  - **Zamanlı Vuruş (Timed Finishing):** Koşarken yeşil bölgede `Boşluk`/tık ile `+10%` hız ve altın top izi!
  - **Rüzgar & Hava Fiziği:** Gündüz / Gün Batımı / Gece ışıklandırması, Açık / Yağmurlu / Karlı hava (rüzgar kavis etkisi, ıslak kaygan çim).
- **8 Kamera Açısı & Otomatik Tekrar:** TV Yayını, Penaltıcı Gözü, Kaleci Gözü, Kale Arkası, Yan Açı, Sinematik, Drone ve Top Gözü (`C` ile geçiş). Gollerde ve kurtarışlarda otomatik `0.35×` ağır çekim `TEKRAR` yayını!
- **Özelleştirme & İstatistikler:** 6 takım forması, forma numarası, 4 top tasarımı (Klasik, Yıldız, Neon, Altın), Türkçe spiker (`Web Speech API`) ve kalıcı istatistik/rekor ekranı.

## Kurulum ve Çalıştırma

### 1) VS Code ile (Önerilen)
1. Bu klasörü VS Code'da aç (`File → Open Folder...` → `penalti-oyunu`).
2. **`F5`** tuşuna bas (`.vscode/launch.json` sunucuyu otomatik başlatır ve oyunu tarayıcıda açar).

### 2) Terminal ile
```bash
npm install
node server.js
```
Tarayıcıda **http://localhost:5188** adresini aç.

### 3) Online 1v1 & Buluta Yayınlama (Render / Docker)
- **Aynı ağda (LAN):** Sunucu `0.0.0.0:5188` üzerinde dinler; aynı Wi-Fi'daki arkadaşın `http://<SENIN-IP>:5188` adresinden bağlanabilir.
- **Render (Ücretsiz Web Service):** Projeyi GitHub'a yükle, Render'da **New → Blueprint** seç — depodaki `render.yaml` otomatik olarak `npm install` + `node server.js` ile HTTPS + WSS (`wss://...`) sunucusunu ayağa kaldırır.
- **Docker:**
  ```bash
  docker build -t penalti-oyunu .
  docker run -p 5188:5188 penalti-oyunu
  ```

## Kontroller

### Penaltıcıyken
| Tuş / Fare | İşlev |
|---|---|
| `Fare` veya `← ↑ ↓ →` / `WASD` | Kale üzerinde nişan al |
| `Sol tık` / `Boşluk` (basılı tut → bırak) | Şut gücünü ayarla ve vur |
| `1` / `2` / `3` / `4` | Normal / Plase / Panenka / Trivela |
| `Q` / `E` | Sola / sağa falso |
| `Shift` veya `Sağ Tık` (koşarken) | Şaşırtmalı koşu (stutter-step) |
| `Boşluk` / `Sol Tık` (koşarken yeşil bölgede) | Zamanlı Vuruş bonusu |

### Kaleciyken & 2 Kişilik Lokal
| Tuş | İşlev |
|---|---|
| Tek kişilik: `A/←` · `S/↓` · `D/→` (+ `W/↑` yüksek) | Ekran yönüne göre uç (butonlar kaleci perspektifini gösterir) |
| 2 Kişilik P2: `J` (sol) · `K` (orta) · `L` (sağ) (+ `I` yüksek) | 2. Oyuncu kaleci atlayışı |

### Genel
| Tuş | İşlev |
|---|---|
| `C` | Kamera açısını değiştir |
| `M` | Sesi aç / kapat |
| `Boşluk` (tekrarda) | Tekrarı geç |
| `Esc` | Duraklat |
