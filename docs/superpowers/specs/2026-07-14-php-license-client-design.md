# PHP License Client Local Smoke Design

## Tujuan

Menyediakan client PHP tanpa framework yang memverifikasi lisensi ke LEPS, membatasi verifikasi normal menjadi sekitar lima request per 24 jam per instalasi aktif, memeriksa expiry secara lokal pada setiap pengiriman, dan mengirim satu pesan Telegram nyata dalam smoke test lokal.

## Batasan

- Client tidak menjadi relay data melalui LEPS. Setelah lisensi valid, PHP mengirim pesan langsung ke Telegram Bot API.
- Tidak ada cron, queue, webhook, dependency Composer, atau service tambahan.
- Secret dan nilai instalasi dibaca dari environment, bukan ditulis di source atau cache.
- Server tidak diberi hard limit lima request per hari berdasarkan license key karena mekanisme tersebut dapat dipakai untuk menghabiskan kuota lisensi pihak lain.
- Rate limit IP LEPS yang sudah ada tetap menjadi perlindungan abuse.

## Komponen

### Client PHP

Satu class PHP menyediakan dua operasi:

1. Memastikan instalasi memiliki authorization LEPS yang valid.
2. Mengirim pesan ke Telegram hanya setelah authorization berhasil.

Client menggunakan extension bawaan PHP yang sudah tersedia di mesin lokal: cURL untuk HTTP, Sodium untuk verifikasi Ed25519, dan JSON/file API untuk cache.

### Konfigurasi

Nilai berikut dibaca dari environment:

- URL API LEPS.
- License key.
- Domain dan absolute request path instalasi.
- Telegram bot token dan chat ID.
- Public key Ed25519 LEPS dalam format SPKI DER base64.
- Lokasi cache opsional; default berada di temporary directory sistem dengan nama berbasis hash license key.

Startup gagal dengan pesan aman bila konfigurasi wajib tidak tersedia. Secret tidak dicetak pada error atau output smoke test.

### Cache authorization

Cache JSON menyimpan response bertandatangan, waktu verifikasi sukses terakhir, dan waktu percobaan API berikutnya. File dibuka dengan exclusive lock selama keputusan revalidation agar proses PHP paralel tidak menghasilkan request LEPS ganda.

Interval revalidation adalah 17.280 detik atau 4 jam 48 menit. Setiap percobaan API, berhasil maupun gagal, memajukan waktu percobaan berikutnya sebesar interval tersebut. Dengan aktivitas terus-menerus, satu instalasi melakukan maksimal sekitar lima request dalam 24 jam dan kegagalan API tidak menimbulkan retry storm. Pemeriksaan bersifat lazy: bila tidak ada pengiriman Telegram, tidak ada request LEPS.

Cache tidak menyimpan Telegram bot token. Cache yang rusak, tidak lengkap, binding-nya berbeda, atau signature-nya tidak valid diperlakukan sebagai tidak tersedia dan memicu verifikasi baru.

## Alur Pengiriman

1. Ambil lock cache.
2. Baca dan validasi response cache.
3. Verifikasi signature Ed25519 atas byte hasil decode `signed_payload`.
4. Pastikan `license_key`, `domain`, dan `request_path` pada signed payload sama dengan konfigurasi lokal.
5. Jika waktu percobaan API belum tiba, bandingkan waktu sekarang dengan `expires_at`. Jika sudah mencapai expiry, tolak pengiriman langsung tanpa memanggil LEPS; bila belum, gunakan authorization lokal.
6. Jika cache belum ada atau waktu percobaan API sudah tiba, simpan jadwal percobaan berikutnya terlebih dahulu lalu panggil `POST /api/v1/license/verify` satu kali di dalam lock.
7. Validasi response, signature, binding, dan expiry lalu tulis authorization baru secara atomik. Revalidation yang dijadwalkan tetap memungkinkan perpanjangan license terdeteksi setelah cache lama mencapai expiry.
8. Lepaskan lock dan kirim pesan langsung ke Telegram Bot API.

Suspend atau perubahan binding dapat terlambat terdeteksi maksimal sekitar 4 jam 48 menit. Expiry tetap berlaku tepat waktu karena selalu diperiksa secara lokal.

## Penanganan Error

- HTTP timeout, response LEPS bukan `200`, JSON invalid, signature invalid, atau cache kedaluwarsa saat revalidation diperlukan: fail closed dan jangan kirim ke Telegram. Percobaan berikutnya mengikuti jadwal agar kegagalan tidak menghasilkan request berulang.
- License expired: jangan kirim ke Telegram. Cache tetap menyimpan jadwal sehingga perpanjangan dapat ditemukan pada revalidation berikutnya tanpa request tambahan tepat saat expiry.
- Telegram API gagal: tampilkan error aman tanpa bot token; authorization cache tetap dapat digunakan karena kegagalan Telegram bukan kegagalan lisensi.
- Penulisan cache gagal: fail closed agar pembatasan request tidak diam-diam rusak.

## Verifikasi

Tes PHP tanpa framework membuktikan:

- Response Ed25519 valid diterima dan response yang dimodifikasi ditolak.
- Cache valid mencegah request LEPS kedua.
- Cache yang telah berumur 17.280 detik memicu tepat satu revalidation.
- Kegagalan API tidak dapat memicu percobaan kedua sebelum interval berikutnya.
- Dua pemanggilan berurutan menggunakan satu response API.
- Expiry menolak pengiriman secara lokal walaupun jadwal revalidation belum tiba.
- Binding yang berbeda dan cache rusak ditolak.

Smoke test lokal menggunakan LEPS yang berjalan di `http://localhost:5173`, membuat atau memakai lisensi test yang sesuai, memanggil endpoint verification nyata, mengirim tepat satu pesan Telegram nyata, lalu menjalankan authorization kedua untuk membuktikan sumbernya adalah cache. Token, key lengkap, dan chat ID tidak dicetak.

## Kriteria Selesai

- Tes PHP lulus dengan PHP CLI lokal.
- Endpoint LEPS menerima satu verification pada smoke awal.
- Telegram menerima tepat satu pesan smoke.
- Authorization berikutnya tidak membuat verification log LEPS baru.
- Test LEPS yang sudah ada, type-check, dan format check tetap lulus.
