# Library Loans API

REST API untuk mencatat peminjaman buku oleh anggota perpustakaan. Proyek Responsi PPB Modul 1 ini menggunakan Node.js, Express.js, dan Supabase (PostgreSQL), serta di-deploy di Vercel.

| | Link |
| --- | --- |
| Repository | [github.com/nafilo/library-loans-api](https://github.com/nafilo/library-loans-api) |
| API production (branch `main`) | [library-loans-api-git-main-arkannurcahyo-8143s-projects.vercel.app](https://library-loans-api-git-main-arkannurcahyo-8143s-projects.vercel.app/) |
| URL deployment ini | [library-loans-oq4bcqmvc-arkannurcahyo-8143s-projects.vercel.app](https://library-loans-oq4bcqmvc-arkannurcahyo-8143s-projects.vercel.app/) |
| Contoh filter | [GET /loans?status=Terlambat](https://library-loans-api-git-main-arkannurcahyo-8143s-projects.vercel.app/loans?status=Terlambat) |

## Fitur

- CRUD peminjaman dengan `POST`, `GET`, `PUT`, `PATCH`, dan `DELETE`.
- Filter berdasarkan status, kode anggota, atau kode buku; filter bisa digabung.
- Pagination melalui `page` dan `limit`.
- Validasi ID, field, tanggal, serta konsistensi status dan tanggal pengembalian.
- Supabase memeriksa constraint data dan mengisi timestamp pembaruan secara otomatis.

Status `Terlambat` diatur melalui API. Sistem mencatat snapshot nama/kode anggota dan judul/kode buku pada setiap peminjaman; master anggota/buku dan stok berada di luar cakupan proyek.

## Endpoint

| Method | Path | Fungsi |
| --- | --- | --- |
| `GET` | `/` | Informasi API |
| `GET` | `/health` | Pemeriksaan layanan |
| `GET` | `/loans` | Daftar dan filter peminjaman |
| `POST` | `/loans` | Tambah peminjaman |
| `GET` | `/loans/:id` | Detail peminjaman |
| `PUT` | `/loans/:id` | Ganti data peminjaman |
| `PATCH` | `/loans/:id` | Perbarui sebagian data |
| `DELETE` | `/loans/:id` | Hapus peminjaman |

Parameter `status` menerima `Dipinjam`, `Dikembalikan`, atau `Terlambat`. Filter opsional lainnya: `member_code` dan `book_code`. `page` default ke `1`, sedangkan `limit` default ke `20` dan maksimal `100`.

## Schema

Satu tabel `public.loans` menyimpan:

| Field | Jenis | Keterangan |
| --- | --- | --- |
| `id` | UUID | Primary key, dibuat otomatis |
| `member_code`, `member_name` | text | Kode dan nama anggota |
| `book_code`, `book_title` | text | Kode dan judul buku |
| `loan_date`, `due_date` | date | Tanggal peminjaman dan jatuh tempo |
| `return_date` | date atau null | Tanggal pengembalian |
| `status` | text | `Dipinjam`, `Dikembalikan`, atau `Terlambat` |
| `notes` | text atau null | Catatan tambahan |
| `created_at`, `updated_at` | timestamptz | Timestamp pencatatan dan perubahan |

`Dikembalikan` harus memiliki `return_date`; status lainnya harus mengirim `return_date: null`. Skema, index, trigger, dan pengaturan RLS tersedia di [`supabase/schema.sql`](supabase/schema.sql). Data contoh opsional ada di [`supabase/seed.sql`](supabase/seed.sql).

## Contoh penggunaan

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

API mengisi `status` awal sebagai `Dipinjam`, membuat ID, dan mencatat timestamp. Respons `201 Created`:

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
    "created_at": "2026-10-01T06:37:13.145902+00:00",
    "updated_at": "2026-10-01T06:37:13.145902+00:00"
  }
}
```

Contoh filter:

```http
GET /loans?status=Terlambat&page=1&limit=20
```

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
      "created_at": "2026-10-01T06:37:13.145902+00:00",
      "updated_at": "2026-10-01T06:37:13.145902+00:00"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
}
```

Contoh di atas menunjukkan bentuk response; waktu dan urutan data pada database aktif bisa berbeda.

## Menjalankan lokal

Butuh Node.js 24.x, npm, dan proyek Supabase. Jalankan `supabase/schema.sql` di SQL Editor Supabase, lalu salin Project URL dan secret/server key Supabase. Jangan gunakan anon/publishable key untuk konfigurasi backend ini.

```powershell
npm ci
Copy-Item .env.example .env
```

Isi `.env`:

```dotenv
PORT=3000
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_KEY=SUPABASE_SERVER_KEY
```

Kemudian jalankan server:

```powershell
npm run dev
```

Buka `http://localhost:3000/loans`. Untuk contoh pengujian, impor koleksi [`docs/postman_collection.json`](docs/postman_collection.json) atau ikuti request di [`docs/requests.http`](docs/requests.http).

## Struktur proyek

```text
src/                  # Express app, model, controller, route, dan middleware
supabase/             # SQL schema dan data contoh
tests/                # Pengujian API dan query SDK Supabase
scripts/smoke-test.js # Uji CRUD terhadap server/database yang aktif
docs/                 # Koleksi Postman dan contoh request
```

## Deployment dan pengujian

Proyek Vercel memakai default export dari `src/app.js`. Tambahkan `SUPABASE_URL` dan `SUPABASE_KEY` pada Environment Variables proyek Vercel.

- Jalankan `npm test` untuk pengujian otomatis menggunakan database tiruan.
- Jalankan `npm run test:live` saat API lokal berjalan untuk menguji CRUD dengan Supabase.
- Untuk menguji deployment, isi `$env:BASE_URL = "https://URL-KAMU.vercel.app"`, jalankan `npm run test:live`, lalu hapus variabel dengan `Remove-Item Env:BASE_URL`.

