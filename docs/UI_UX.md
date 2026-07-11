# UI/UX Design Specification — LEPS Soft Brutal

**Status:** Draft for review  
**Date:** 2026-07-11

## 1. Design Direction

LEPS memakai **Soft Brutal**: struktur neobrutalist yang tegas, tetapi dengan warna hangat, radius moderat, spacing lapang, dan kepadatan yang nyaman untuk penggunaan dashboard jangka panjang.

Pilihan brainstorming yang telah dikunci:

- Public web: **C1 — Product Story**.
- Login: **L1 — Centered Card**.
- Dashboard: **D1 — Sidebar Workspace**.

Tujuan utama redesign adalah menghilangkan kesan template AI generik. Desain harus terasa disengaja, operasional, dan sesuai produk licensing backend-heavy.

## 2. Prinsip

1. **Data before decoration:** data dan tindakan admin selalu lebih penting daripada ornamen.
2. **Few strong shapes:** gunakan beberapa border/shadow tegas, bukan banyak kartu identik.
3. **Text-led navigation:** label teks jelas; ikon hanya pendukung.
4. **Honest content:** tidak ada testimonial, statistik, logo customer, atau klaim palsu.
5. **Responsive by layout:** komponen mengalir berdasarkan ruang, bukan meniru ukuran device tertentu.
6. **Accessible by default:** keyboard, focus, contrast, semantics, dan reduced motion merupakan requirement.

## 3. Color System

### Brand Colors

| Token | Value | Penggunaan |
|---|---|---|
| `--color-sand` | `#DCC9A9` | Page background, secondary surface, neutral emphasis |
| `--color-red` | `#B83A2D` | Primary CTA, destructive emphasis, critical status |
| `--color-green` | `#4E6851` | Sidebar, success status, solid shadow, stable system state |

### Supporting Neutrals

| Token | Value | Penggunaan |
|---|---|---|
| `--color-ink` | `#273229` | Body text, borders, primary foreground |
| `--color-paper` | `#FBF4E8` | Main background/surface |
| `--color-white` | `#FFFDF8` | Elevated cards, input, table surface |

Supporting neutrals boleh disesuaikan sedikit ketika contrast check membutuhkan, tetapi tiga warna brand utama tidak berubah.

Status tidak boleh hanya memakai warna. Badge harus memuat label seperti `ACTIVE`, `SUSPENDED`, atau `EXPIRED`.

## 4. Typography

- Heading: system sans bold/black.
- Body: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Code dan license key: system monospace.
- Tidak menambah font package atau remote webfont.
- Heading boleh memakai tighter letter spacing, tetapi body tetap normal.
- Uppercase hanya untuk label singkat, kicker, status, dan action—bukan paragraf.

Suggested scale:

| Role | Desktop | Mobile |
|---|---:|---:|
| Hero | clamp 48–80 px | clamp 38–52 px |
| Page title | 32–40 px | 28–34 px |
| Section title | 22–28 px | 20–24 px |
| Body | 16–18 px | 16 px |
| Small/meta | 12–14 px | 12–14 px |

## 5. Shape, Border, dan Shadow

- Standard border: `2px solid var(--color-ink)`.
- Emphasis border: `3px solid var(--color-ink)`.
- Radius: 8 px untuk controls; 10–12 px untuk card/dialog.
- Small shadow: `3px 3px 0 var(--color-green)`.
- Standard shadow: `6px 6px 0 var(--color-green)`.
- Red shadow hanya untuk emphasis terbatas.
- Hover boleh menggeser elemen maksimum 2 px.
- Shadow tidak digunakan pada setiap container; section besar boleh hanya memakai border.

## 6. Spacing dan Layout

- Base spacing unit: 4 px.
- Control gap umum: 8–12 px.
- Card padding: 16–24 px.
- Page content gap: 24–32 px.
- Public section vertical padding: 64–96 px desktop, 40–64 px mobile.
- Dashboard content max-width tidak dibuat sempit; tabel memakai ruang yang tersedia.

## 7. Motion

- Duration interaksi: sekitar 120–180 ms.
- Hanya transform, opacity, atau color transitions sederhana.
- Tidak ada scroll-triggered animation, parallax, marquee, atau cursor effect.
- `prefers-reduced-motion: reduce` menghapus motion non-esensial.

## 8. Public Web — C1 Product Story

### Struktur

1. **Header**
   - LEPS wordmark sederhana.
   - Link ke how it works dan security bila section tersedia.
   - CTA `Admin Login`.

2. **Hero**
   - Kicker: licensing engine for PHP scripts.
   - Headline ringkas dan spesifik.
   - Penjelasan domain, path, dan Telegram binding.
   - Primary CTA menuju alur produk atau login.

3. **Three-step Flow**
   - Create license.
   - Verify request.
   - Allow or block.

4. **Feature Grid**
   - Domain/path binding.
   - Redis cache/rate limit.
   - Audit attempts.
   - Suspend/expiry control.

5. **Security Summary**
   - Authenticated admin.
   - Hashed Telegram token.
   - Signed valid response.

6. **Final CTA**
   - Menuju login, bukan signup.

### Content Rules

- Hindari slogan generik seperti “next-generation platform”.
- Hindari fake metrics dan customer logos.
- Copy boleh bilingual terbatas bila konsisten, tetapi versi final memilih satu bahasa utama per section.
- Technical terms dipakai hanya ketika membantu memahami produk.
- Bahasa utama public web dan dashboard adalah Bahasa Indonesia; API status/error code tetap berbahasa teknis yang stabil.

### Rendering

- Public page diprerender.
- Tidak memerlukan client-side data fetching.
- Header tidak wajib sticky.

## 9. Login — L1 Centered Card

### Layout

- Small brand header dengan link kembali ke public web.
- Card login berada di tengah viewport.
- Background memakai pembagian sand/paper sederhana, bukan gradient kompleks.
- Card memuat eyebrow, title, supporting text, email, password, submit, dan safe error.

### Behavior

- Enter melakukan submit.
- Submit disabled dan menunjukkan progress selama request.
- Credential error tidak membedakan email dan password.
- Field invalid memiliki label, message, dan focus state jelas.
- Session aktif mengarahkan ke dashboard.
- Tidak ada signup atau forgot password link.

## 10. Dashboard — D1 Sidebar Workspace

### Shell

- Desktop sidebar memakai green surface.
- Wordmark dan navigation text selalu terlihat pada desktop.
- Active item memakai sand surface, dark border, dan label text.
- User/email serta logout berada di bagian bawah sidebar.
- Main content memakai paper background dan white data surfaces.

### Overview

- Page title dan primary `New License` action.
- Metric cards hanya untuk angka yang benar-benar tersedia.
- Recent licenses.
- Recent verification activity.
- Tidak ada chart bila table/count sudah menjawab kebutuhan.

### License Management

- Search, status filter, create action, table, dan pagination.
- License key memakai monospace dan copy action yang accessible.
- Table action tidak disembunyikan seluruhnya di icon-only menu bila label muat.
- Create/edit memakai dialog desktop.
- Mobile memakai near-fullscreen dialog/sheet.
- Telegram token pada edit ditampilkan sebagai empty replacement field.
- Delete dan suspend membutuhkan confirmation yang menyebut target.

### Audit Logs

- Filter status, domain, dan date range.
- Table memakai timestamp, fingerprint/key reference, domain/path, IP, dan result.
- Status result tetap terbaca tanpa mengandalkan warna.
- Detail sensitif tidak ditampilkan.

## 11. Component Inventory

Komponen reusable minimum:

- `Button`
- `TextInput`
- `Select`
- `Badge`
- `Card`
- `Dialog`
- `Drawer`
- `Table`
- `Pagination`
- `EmptyState`
- `InlineAlert`
- `LoadingSkeleton`
- `AppSidebar`

Komponen dibuat hanya ketika dipakai lebih dari sekali atau memiliki behavior/accessibility yang layak dipusatkan. Tidak dibuat design-system package terpisah.

Ikon memakai inline SVG kecil bila diperlukan. Library ikon baru tidak ditambah hanya untuk beberapa glyph.

## 12. UI States

### Loading

- Initial page loading memakai skeleton yang mempertahankan layout.
- Mutation memakai disabled action dan progress label.
- Jangan menutupi seluruh dashboard dengan spinner untuk mutation lokal.

### Empty

- Empty dataset: jelaskan belum ada data dan tampilkan action relevan.
- Empty filter result: jelaskan filter tidak menemukan hasil dan sediakan reset filter.

### Error

- Validation error dekat input.
- Page/API load error memakai inline alert dengan retry bila aman.
- Authentication expiry mengarahkan ke login dengan message singkat.
- Destructive mutation error mempertahankan dialog dan input user.

### Success

- Mutation success memakai inline feedback atau toast singkat.
- UI me-refresh data terkait tanpa reload penuh.

### Disabled

- Disabled control tetap memiliki contrast yang cukup.
- Tooltip tidak menjadi satu-satunya penjelasan mengapa action disabled.

## 13. Responsive Matrix

### 360–767 px

- Sidebar menjadi drawer.
- Header dashboard menampilkan menu button dan page title.
- Metric grid satu kolom atau dua kolom bila content aman.
- Form field satu kolom.
- Dialog mendekati full-screen dengan action tetap dapat dijangkau.
- Table memakai horizontal scroll dengan visual affordance.
- Public hero dan section bertumpuk vertikal.

### 768–1023 px

- Sidebar boleh compact/collapsible.
- Metric grid dua atau tiga kolom berdasarkan content.
- Form boleh dua kolom untuk field pendek.
- Table mempertahankan kolom penting dan scroll untuk sisanya.

### 1024–1439 px

- Sidebar tetap terbuka.
- Main content memakai full workspace width.
- Dialog memiliki width terbatas dan tidak memenuhi layar.

### ≥1440 px

- Content tidak diregangkan tanpa batas; spacing bertambah secara moderat.
- Table memanfaatkan ruang untuk kolom yang berguna.
- Public marketing content memakai readable max-width.

QA wajib dilakukan pada 360, 768, 1024, dan 1440 px, ditambah satu ukuran di antara breakpoint bila layout berubah signifikan.

## 14. Accessibility

- Keyboard dapat mencapai seluruh navigation, form, table actions, dialog, dan drawer.
- Focus indicator minimal 2 px dan terlihat pada seluruh surface.
- Dialog/drawer mengunci focus, menutup dengan Escape, dan mengembalikan focus.
- Input mempunyai visible label.
- Error summary diumumkan dengan live region seperlunya.
- Button icon-only wajib memiliki accessible name; sebisa mungkin gunakan text label.
- Color contrast diverifikasi pada kombinasi sand/red/green/ink.
- Table memakai caption atau accessible heading context.
- Pagination memiliki current-page semantics.
- Touch target action utama sekitar 44 px.

## 15. Anti-patterns yang Dilarang

- Gradient dekoratif kompleks.
- Glassmorphism atau blur cards.
- Kumpulan card seragam untuk setiap potongan konten.
- Dashboard chart tanpa keputusan yang didukung chart tersebut.
- Icon-only navigation desktop.
- Lorem ipsum atau fake production data dalam UI final.
- Excessive pill shapes.
- Animasi masuk untuk setiap section.
- Mobile layout yang hanya mengecilkan desktop.
- Menyembunyikan table columns penting tanpa akses alternatif.

## 16. Visual Acceptance Checklist

- Palet utama konsisten dengan `#DCC9A9`, `#B83A2D`, dan `#4E6851`.
- Public page mengikuti Product Story.
- Login mengikuti Centered Card.
- Dashboard mengikuti Sidebar Workspace.
- Neobrutalist border/shadow tidak dipakai berlebihan.
- Semua viewport target bebas horizontal page overflow.
- Table overflow hanya terjadi di container table.
- Focus, hover, active, disabled, loading, empty, error, dan success state tersedia.
- UI tidak memuat content marketing palsu.
- Screenshot QA dibandingkan terhadap keputusan visual sebelum release.
