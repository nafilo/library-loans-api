# Panduan Setup dan Pengumpulan

REST API sederhana untuk mencatat peminjaman buku perpustakaan oleh anggota. Proyek ini dibuat untuk Responsi PPB Modul 1 menggunakan **Node.js, Express.js, dan Supabase (PostgreSQL)**, dengan target deployment **Vercel**.

API menyediakan CRUD peminjaman, filter berdasarkan status/anggota/buku, dan pagination. Struktur model–controller–router mengikuti pola modul praktikum; domain penjualan pada contoh modul disesuaikan menjadi peminjaman perpustakaan.

## Link proyek

| Output | Link |
| --- | --- |
| Repository GitHub publik | [github.com/nafilo/library-loans-api](https://github.com/nafilo/library-loans-api) |
| Base URL Vercel | [library-loans-api-ebon.vercel.app](https://library-loans-api-ebon.vercel.app/) |

Endpoint production yang berhasil diuji melalui browser: [`/loans`](https://library-loans-api-ebon.vercel.app/loans) dan [`/loans?status=Terlambat`](https://library-loans-api-ebon.vercel.app/loans?status=Terlambat).

## Fitur dan batasan

- Create, read, update penuh (`PUT`), update sebagian (`PATCH`), dan delete peminjaman.
- Filter `status`, `member_code`, dan `book_code`; filter dapat digabung (AND).
- Pagination dengan `page` dan `limit` (maksimal 100).
- Validasi UUID, field wajib, panjang teks, tanggal kalender, dan status pengembalian.
- Respons JSON dan penanganan error terpusat.
- Timestamp `updated_at` otomatis melalui trigger PostgreSQL.

Satu record menyimpan snapshot identitas anggota dan buku pada saat pencatatan. Proyek ini tidak mengelola stok, login pengguna, atau master anggota/buku. **Status dicatat dan diperbarui secara manual melalui API**, termasuk `Terlambat`; tidak ada penjadwal yang mengubah status otomatis ketika tanggal jatuh tempo terlewati.

API demo ini dapat dibaca dan diubah tanpa autentikasi agar endpoint mudah diuji saat responsi. Gunakan **data fiktif**. Akses langsung database dengan anon/publishable key ditutup menggunakan RLS; server menggunakan secret/service_role key melalui environment variables.

## Struktur proyek

```text
src/
  app.js                     # Express app dan default export untuk Vercel
  server.js                  # Listener untuk menjalankan lokal
  config/supabaseClient.js   # Client Supabase dari environment variables
  models/loanModel.js        # Query database
  controllers/loanController.js
  routes/loanRoutes.js
  middleware/validation.js
  middleware/errorHandler.js
  utils/HttpError.js
supabase/
  schema.sql                 # Tabel, constraint, index, trigger, dan RLS
  seed.sql                   # Tiga record fiktif opsional
docs/
  requests.http              # Contoh request untuk REST Client
  postman_collection.json    # Koleksi impor Postman
scripts/smoke-test.js         # Pengujian CRUD pada server/database nyata
tests/                       # Pengujian otomatis dengan database tiruan
.env.example
vercel.json
package.json
package-lock.json
README.md
```

## Schema database

Tabel: `public.loans`. Setiap baris mewakili peminjaman satu buku oleh satu anggota.

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `id` | UUID | Primary key, otomatis `gen_random_uuid()` |
| `member_code` | text | Wajib, 1–50 karakter |
| `member_name` | text | Wajib, 1–150 karakter |
| `book_code` | text | Wajib, 1–50 karakter |
| `book_title` | text | Wajib, 1–250 karakter |
| `loan_date` | date | Wajib, `YYYY-MM-DD` |
| `due_date` | date | Wajib, tidak sebelum `loan_date` |
| `return_date` | date | Nullable, tidak sebelum `loan_date` |
| `status` | text | `Dipinjam`, `Dikembalikan`, atau `Terlambat`; default `Dipinjam` |
| `notes` | text | Nullable, 1–1000 karakter jika diisi |
| `created_at` | timestamptz | Otomatis ketika dibuat |
| `updated_at` | timestamptz | Otomatis ketika dibuat/diperbarui |

Status `Dikembalikan` wajib memiliki `return_date`. Status `Dipinjam` dan `Terlambat` wajib memiliki `return_date: null`. Tanggal tanpa jam merupakan tanggal kalender; timestamp memakai format ISO 8601.

`id`, `created_at`, dan `updated_at` tidak boleh dikirim dalam body create/update. Field yang tidak dikenal ditolak. Nilai `member_code` dan `book_code` dapat digunakan pada beberapa peminjaman; bukan primary key atau foreign key.

## Instalasi dan menjalankan lokal

Prasyarat: **Node.js 24.x**, npm, akun Supabase, serta Git untuk upload ke GitHub. Tidak perlu PostgreSQL lokal.

### 1. Siapkan Supabase dari awal

1. Buka [Supabase Dashboard](https://supabase.com/dashboard), daftar/login, dan buat organisasi jika belum ada.
2. Pilih **New project**, beri nama `library-loans-api`, tentukan password database yang kuat, lalu pilih region yang tersedia dan dekat dengan pengguna.
3. Tunggu proyek siap. Buka **SQL Editor → New query**.
4. Salin seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu **Run**. Jalankan sekali pada database baru; jangan jalankan lagi jika tabel `loans` sudah ada.
5. Opsional: jalankan [`supabase/seed.sql`](supabase/seed.sql) untuk menyediakan contoh ketiga status. Seed dapat dijalankan ulang karena menggunakan `ON CONFLICT`.
6. Buka **Table Editor** dan pastikan tabel `loans` muncul.
7. Salin **Project URL** dari bagian **Connect** atau **Settings → Data API**.
8. Buka **Settings → API Keys**, ambil **secret key** (`sb_secret_...`), atau legacy **service_role** key bila tersedia. Key ini hanya digunakan server. **Jangan gunakan anon/publishable key** dengan schema proyek ini karena akses role tersebut ditutup.

Kunci server disimpan di `.env` lokal dan Environment Variables Vercel. Jangan tempelkan key di kode, README, koleksi Postman, atau GitHub.

### 2. Pasang dependency

Jika kode sudah berada di folder lokal, buka terminal di folder yang berisi `package.json`:

```powershell
npm ci
Copy-Item .env.example .env
```

Jika menggunakan macOS/Linux, ganti perintah salin menjadi `cp .env.example .env`. Jika baru mengunduh dari GitHub, clone repository milikmu terlebih dahulu dan masuk ke folder hasil clone.

Edit `.env` dengan nilai asli dari Supabase:

```dotenv
PORT=3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_SERVER_KEY
```

`.env` sudah diabaikan Git. Jangan mengganti `.env.example` dengan key asli.

### 3. Jalankan server

```powershell
npm run dev
```

Atau gunakan `npm start` tanpa mode watch. Server lokal berjalan di `http://localhost:3000`. Buka `http://localhost:3000/loans` untuk mengecek akses database. `/health` hanya memeriksa proses HTTP; tidak memverifikasi koneksi database.

## Endpoint

Semua endpoint memakai JSON. Untuk POST/PUT/PATCH, gunakan header `Content-Type: application/json`.

| Method | Path | Fungsi | Sukses |
| --- | --- | --- | --- |
| GET | `/` | Informasi API | 200 |
| GET | `/health` | Status proses HTTP | 200 |
| POST | `/loans` | Buat peminjaman | 201 |
| GET | `/loans` | Daftar/filter peminjaman | 200 |
| GET | `/loans/:id` | Detail satu peminjaman | 200 |
| PUT | `/loans/:id` | Ganti semua field peminjaman | 200 |
| PATCH | `/loans/:id` | Ubah sebagian field | 200 |
| DELETE | `/loans/:id` | Hapus peminjaman permanen | 200 |

`PUT` membutuhkan semua enam field wajib seperti POST. Jika field opsional tidak dikirim, `status` kembali menjadi `Dipinjam`, sedangkan `return_date` dan `notes` menjadi `null`. `PATCH` hanya mengubah field yang dikirim. Untuk mengosongkan catatan, kirim `notes: null`.

### Filter query

| Parameter | Contoh | Keterangan |
| --- | --- | --- |
| `status` | `Terlambat` | Harus persis salah satu nilai status |
| `member_code` | `AGT-001` | Pencocokan kode anggota secara tepat |
| `book_code` | `BK-001` | Pencocokan kode buku secara tepat |
| `page` | `1` | Bilangan bulat positif, default 1 |
| `limit` | `20` | 1–100, default 20 |

```http
GET /loans?status=Terlambat
GET /loans?status=Dipinjam&member_code=AGT-001&page=1&limit=10
```

Data diurutkan berdasarkan `created_at` terbaru, lalu `id`. Hasil kosong tetap `200` dengan `data: []`. `pagination.total` menghitung seluruh baris yang cocok dengan filter, sebelum pagination.

## Contoh request dan response

Contoh berikut memakai nilai fiktif. ID dan timestamp pada response asli dibuat oleh database. Pada PowerShell gunakan `curl.exe`; pada macOS/Linux gunakan `curl`. Ganti base URL lokal dengan base URL Vercel untuk menguji deployment.

### Create

```http
POST /loans
Content-Type: application/json

{
  "member_code": "AGT-001",
  "member_name": "Nadia Contoh",
  "book_code": "BK-001",
  "book_title": "Belajar REST API",
  "loan_date": "2026-10-01",
  "due_date": "2026-10-08"
}
```

Response `201 Created` dengan header `Location: /loans/<id>`:

```json
{
  "success": true,
  "message": "Peminjaman berhasil dibuat.",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "member_code": "AGT-001",
    "member_name": "Nadia Contoh",
    "book_code": "BK-001",
    "book_title": "Belajar REST API",
    "loan_date": "2026-10-01",
    "due_date": "2026-10-08",
    "return_date": null,
    "status": "Dipinjam",
    "notes": null,
    "created_at": "2026-10-01T03:00:00+00:00",
    "updated_at": "2026-10-01T03:00:00+00:00"
  }
}
```

### Read dan filter

```powershell
curl.exe "http://localhost:3000/loans?status=Terlambat&limit=10"
```

Jika menggunakan data seed, response `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "member_code": "AGT-002",
      "member_name": "Bima Contoh",
      "book_code": "BK-002",
      "book_title": "Belajar REST API",
      "loan_date": "2026-09-15",
      "due_date": "2026-09-22",
      "return_date": null,
      "status": "Terlambat",
      "notes": "Data contoh filter status",
      "created_at": "2026-10-01T03:00:00+00:00",
      "updated_at": "2026-10-01T03:00:00+00:00"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "total_pages": 1 }
}
```

Detail:

```http
GET /loans/11111111-1111-4111-8111-111111111111
```

Response `200 OK` berbentuk `{ "success": true, "data": { ... } }`, dengan objek peminjaman lengkap seperti objek `data` pada contoh create.

### Update penuh

```http
PUT /loans/11111111-1111-4111-8111-111111111111
Content-Type: application/json

{
  "member_code": "AGT-001",
  "member_name": "Nadia Contoh",
  "book_code": "BK-001",
  "book_title": "Belajar REST API",
  "loan_date": "2026-10-01",
  "due_date": "2026-10-10",
  "status": "Terlambat",
  "return_date": null,
  "notes": "Status diperbarui petugas"
}
```

Response `200 OK` berisi `success: true`, `message: "Peminjaman berhasil diperbarui."`, dan `data` lengkap dengan `due_date`, `status`, `notes`, serta `updated_at` terbaru.

### Update sebagian / pengembalian

```http
PATCH /loans/11111111-1111-4111-8111-111111111111
Content-Type: application/json

{
  "status": "Dikembalikan",
  "return_date": "2026-10-06"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "message": "Peminjaman berhasil diperbarui.",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "member_code": "AGT-001",
    "member_name": "Nadia Contoh",
    "book_code": "BK-001",
    "book_title": "Belajar REST API",
    "loan_date": "2026-10-01",
    "due_date": "2026-10-10",
    "return_date": "2026-10-06",
    "status": "Dikembalikan",
    "notes": "Status diperbarui petugas",
    "created_at": "2026-10-01T03:00:00+00:00",
    "updated_at": "2026-10-01T03:05:00+00:00"
  }
}
```

Saat memakai PATCH, kirim `status` dan `return_date` bersama agar constraint tetap terpenuhi. Untuk mengubah kembali menjadi `Dipinjam` atau `Terlambat`, kirim juga `return_date: null`. PostgreSQL memeriksa aturan berdasarkan baris akhir sehingga perubahan sebagian tidak bisa melewati validasi tanggal/status.

### Delete

```http
DELETE /loans/11111111-1111-4111-8111-111111111111
```

Response `200 OK`:

```json
{ "success": true, "message": "Peminjaman berhasil dihapus." }
```

Membaca/mengubah/menghapus ID yang tidak ada menghasilkan `404`:

```json
{ "success": false, "message": "Data peminjaman tidak ditemukan." }
```

### Error

| Kode HTTP | Kondisi |
| --- | --- |
| 400 | Body/query/UUID/tanggal/status invalid atau constraint database dilanggar |
| 404 | Endpoint atau record tidak ditemukan |
| 409 | Konflik data unik dari database |
| 413 | Body melebihi 16 KB |
| 500 | Konfigurasi, koneksi, atau operasi database gagal |

Contoh `GET /loans?status=Salah` menghasilkan `400`:

```json
{
  "success": false,
  "message": "status harus salah satu dari: Dipinjam, Dikembalikan, Terlambat."
}
```

## Pengujian

### Tes otomatis tanpa kredensial

```powershell
npm test
```

Tes menggunakan database tiruan dan respons HTTP Supabase tiruan. Tes mencakup siklus CRUD, filter/pagination, validasi, mapping error, dan query dari SDK Supabase. Ini **tidak membuktikan** schema/RLS/kredensial di proyek Supabase nyata sudah benar.

### Uji lokal dengan Supabase nyata

Jalankan server lokal dahulu di terminal pertama. Pada terminal kedua:

```powershell
npm run test:live
```

Script membuat satu record fiktif, menguji CRUD/filter/constraint dan timestamp, lalu menghapus record uji. Jika pembersihan gagal, script menampilkan ID yang perlu dihapus melalui API/Table Editor.

### Uji Vercel

Setelah deploy, ganti URL berikut dengan URL asli:

```powershell
$env:BASE_URL = "https://NAMA-PROYEK.vercel.app"
npm run test:live
Remove-Item Env:BASE_URL
```

### Postman

1. Pilih **Import**, masukkan [`docs/postman_collection.json`](docs/postman_collection.json).
2. Buka collection variables dan isi `baseUrl` dengan URL lokal atau URL Vercel **tanpa slash di akhir**.
3. Jalankan **Create loan**. Script response otomatis mengisi variable `loanId` dari `data.id`.
4. Jalankan detail, update, filter, pengembalian, lalu delete. Gunakan record baru dari create agar tidak menghapus data seed.

Alternatif: buka [`docs/requests.http`](docs/requests.http) dengan REST Client, lalu ganti `loanId` dengan ID hasil create.

## Upload ke GitHub publik

1. Login ke [GitHub](https://github.com) dan pilih **New repository**.
2. Isi nama `library-loans-api`, pilih **Public**. Jangan centang pembuatan README, `.gitignore`, atau license karena file proyek sudah ada.
3. Pilih **Create repository** dan salin URL repository milikmu.
4. Di terminal folder proyek, jalankan perintah berikut. **Ganti `USERNAME` dengan username GitHub asli.**

```powershell
git init
git add .
git status
git commit -m "Build library loans REST API"
git branch -M main
git remote add origin https://github.com/USERNAME/library-loans-api.git
git push -u origin main
```

Jika Git meminta identitas, jalankan `git config user.name "Nama Kamu"` dan `git config user.email "email-kamu"`, lalu ulangi commit. Jika push meminta login, ikuti login Git Credential Manager; password akun GitHub tidak dipakai sebagai password Git.

Sebelum commit, pastikan `git status` tidak menampilkan `.env` atau `node_modules`. Kode, SQL, dokumentasi, contoh request, tests, dan `package-lock.json` perlu ikut terunggah. Setelah push, cek bahwa repository dapat dibuka tanpa login (public).

## Deployment ke Vercel dari awal

1. Buka [Vercel](https://vercel.com), daftar/login menggunakan akun GitHub.
2. Pilih **Add New → Project**, izinkan akses repository bila diminta, lalu **Import** `library-loans-api`.
3. Pastikan **Root Directory** berisi `package.json` dan `src/`. Pilih/deteksi preset **Express**. Node.js menggunakan **24.x**, sesuai `engines` pada `package.json`.
4. Gunakan pengaturan build/output bawaan Express. Proyek backend ini tidak memakai folder `dist` dan tidak membutuhkan build frontend.
5. Pada **Environment Variables**, tambahkan `SUPABASE_URL` dan `SUPABASE_KEY` dengan nilai asli dari Supabase. Aktifkan untuk **Production**; isi juga **Preview** jika ingin preview terhubung ke database.
6. Pilih **Deploy**. Vercel mendeteksi default export dari `src/app.js` dan menjalankan Express sebagai function. Tidak diperlukan rewrite `/api`; endpoint tetap `/loans`.
7. Buka URL production dari dashboard deployment. Pastikan `/`, `/loans`, dan `/loans?status=Terlambat` bisa diakses.
8. Cek **Settings → Deployment Protection**: URL production yang dikumpulkan harus bisa diakses publik tanpa login Vercel. Uji melalui jendela incognito.
9. Jalankan `npm run test:live` terhadap URL production sesuai bagian pengujian.
10. README utama repository sudah mencantumkan URL GitHub dan Vercel. Jika mengubah dokumentasi, unggah perubahan dengan:

```powershell
git add README.md
git commit -m "Document public repository and deployment URLs"
git push
```

Push berikutnya akan memicu deployment baru jika integrasi Git Vercel aktif. Jika mengubah environment variables setelah deploy, lakukan **Redeploy** agar nilai baru digunakan.

## Troubleshooting

- **Server lokal langsung berhenti:** pastikan `.env` terisi, URL valid, dan port 3000 tidak dipakai proses lain.
- **`/health` sukses tetapi `/loans` error:** cek kredensial, project Supabase aktif, schema `public.loans` sudah dibuat, dan Data API tersedia untuk schema `public`.
- **Izin database ditolak / API gagal:** gunakan secret/server key atau service_role, bukan anon/publishable. Pertahankan RLS seperti dalam schema.
- **SQL mengatakan tabel sudah ada:** schema sudah pernah dijalankan. Periksa tabel yang ada; jangan menghapus tabel berisi data untuk sekadar mengulang setup.
- **PATCH pengembalian mendapat 400:** kirim `status: "Dikembalikan"` bersama `return_date` valid; tanggal kembali tidak boleh sebelum tanggal pinjam.
- **Filter tidak menampilkan data:** status case-sensitive. `Terlambat` diisi secara manual. Jalankan seed opsional untuk contoh status.
- **Vercel meminta login saat URL dibuka:** periksa URL production dan Deployment Protection.
- **Vercel gagal import/build:** cek Root Directory, `package-lock.json`, preset Express, Node.js 24.x, dan build log.

## Checklist sebelum pengumpulan

- [ ] Supabase schema sudah dibuat dan koneksi `/loans` berhasil.
- [ ] `npm test` lulus.
- [ ] `npm run test:live` lulus terhadap deployment nyata.
- [ ] Repository **public**, bersih, dengan README dan kode sumber lengkap.
- [ ] `.env`, secret key, dan `node_modules` tidak terunggah.
- [ ] Link repository dan base URL production asli sudah tercantum di README.
- [ ] Base URL dapat diakses tanpa login Vercel.
- [ ] Endpoint CRUD dan `GET /loans?status=Terlambat` sudah diuji.

## Referensi

- Modul 1 praktikum Application Programming Interface (API), sebagai acuan arsitektur proyek.
- [Express error handling](https://expressjs.com/en/guide/error-handling.html)
- [Supabase JavaScript client](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
