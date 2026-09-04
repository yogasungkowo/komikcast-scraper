# Komikcast API

REST API tidak resmi berbasis Node.js untuk scraping dan menyajikan data dari [v1.komikcast.ac](https://v1.komikcast.ac/). Mendukung filter explore, ranking komik, detail manga lengkap dengan daftar chapter, reader gambar komik, pencarian, dan daftar genre.

Dilengkapi panduan cUrl lengkap untuk terminal Windows (PowerShell & Command Prompt) serta Linux/macOS.

---

## Daftar Isi

1. [Sumber Data (v1.komikcast.ac)](#sumber-data-v1komikcastac)
2. [Fitur Utama](#fitur-utama)
3. [Teknologi & Stack](#teknologi--stack)
4. [Instalasi & Menjalankan](#instalasi--menjalankan)
5. [Daftar Endpoint API](#daftar-endpoint-api)
6. [Parameter Query](#parameter-query)
7. [Panduan cUrl di Terminal Windows](#panduan-curl-di-terminal-windows)
   - [Windows PowerShell](#windows-powershell)
   - [Windows Command Prompt (CMD)](#windows-command-prompt-cmd)
   - [Linux / macOS (Bash / Zsh)](#linux--macos-bash--zsh)
8. [Contoh Pemanggilan cUrl per Kasus](#contoh-pemanggilan-curl-per-kasus)
   - [1. Explore Komik (Genre, Tipe, Status, Urutan)](#1-explore-komik)
   - [2. Ranking Komik](#2-ranking-komik)
   - [3. Detail Komik](#3-detail-komik)
   - [4. Baca Chapter Komik](#4-baca-chapter-komik)
   - [5. Pencarian Manga](#5-pencarian-manga)
   - [6. Daftar Genre](#6-daftar-genre)
9. [Struktur Respons JSON](#struktur-respons-json)
10. [Error Handling & Status Code](#error-handling--status-code)
11. [Testing](#testing)
12. [Deployment (PM2 & Docker)](#deployment-pm2--docker)

---

## Sumber Data (v1.komikcast.ac)

API ini mengambil data secara langsung dari situs versi baru Komikcast:

| Fitur | URL Sumber | Deskripsi |
|---|---|---|
| **Explore & Filter** | `https://v1.komikcast.ac/explore?genre=shoujo-ai%2Caction&type=manga&status=ongoing&order=update` | Katalog komik dengan multi-filter |
| **Ranking** | `https://v1.komikcast.ac/ranking` | Peringkat komik terpopuler harian/mingguan/bulanan |
| **Detail Komik** | `https://v1.komikcast.ac/manga/tales-demons-gods` | Profil komik dan seluruh daftar chapter |
| **Baca Chapter** | `https://v1.komikcast.ac/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1` | Halaman baca gambar per chapter |

---

## Fitur Utama

- **Filter Explore Lengkap**:
  - **Genre**: Mendukung multi-genre (contoh: `shoujo-ai,action` atau `shoujo-ai%2Caction`).
  - **Tipe**: `manga`, `manhwa`, `manhua`.
  - **Status**: `ongoing` (berjalan), `completed` (tamat).
  - **Urutan (Order)**: `update` (baru diupdate), `latest` (terbaru), `popular` (terpopuler), `title` (A-Z).
  - **Pencarian**: Mendukung query pencarian judul di halaman explore.
  - **Pagination**: Informasi `current_page`, `last_page`, `has_next`, `next_page`, `has_prev`, `prev_page`.
- **Ranking Komik**: Menampilkan peringkat, rating, pengarang (author), views (contoh: `1.3K`), dan status.
- **Detail Komik Komprehensif**: Judul, subtitle (nama alternatif), sampul poster beresolusi tinggi, ranking badge, pengarang, tipe, genre, sinopsis, tombol baca pertama (`first_chapter`), tombol baca terbaru (`latest_chapter`), dan seluruh chapter (deduplikasi rapi).
- **Reader Chapter**: Menampilkan seluruh tautan gambar per halaman yang diurutkan (`order: 1`, `2`, dst.), tautan `prev_url`, `next_url`, serta `series_url`.
- **Dukungan URL Fleksibel**:
  - Baca via slug asli: `/manga/:slug/:chapterSlug` (contoh: `/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1`).
  - Baca via nomor chapter: `/manga/:slug/chapter/:chapter` (contoh: `/manga/tales-demons-gods/chapter/1` atau `/manga/tales-demons-gods/chapter/529.1`).
- **Daftar Genre Lengkap**: Mengekstrak otomatis 140+ genre komik yang tersedia.
- **Production Ready**: Security headers (Helmet), kompresi gzip (Compression), CORS diaktifkan, dan Rate Limiter (60 req/menit).

---

## Teknologi & Stack

- **Runtime**: Node.js (ESM Module)
- **Framework**: Express.js 4.x
- **Scraper / Parser**: Axios & Cheerio
- **Keamanan & Utilitas**: Helmet, Cors, Compression, Express-Rate-Limit, Morgan

---

## Instalasi & Menjalankan

### Persyaratan
- Node.js versi 18 ke atas (direkomendasikan versi 20 atau 22 LTS).

### Langkah-langkah
```bash
# 1. Clone repository atau buka folder project
cd manga-api

# 2. Pasang dependencies
npm install

# 3. Jalankan server
npm start
```

Server default berjalan pada port `3002`: `http://localhost:3002` (atau `http://127.0.0.1:3002`).

Untuk development dengan auto-reload saat file diedit:
```bash
npm run dev
```

Mengubah port server:
```bash
# Di Windows PowerShell:
$env:PORT="8080"; npm start

# Di Windows CMD:
set PORT=8080 && npm start

# Di Linux / macOS:
PORT=8080 npm start
```

---

## Daftar Endpoint API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Informasi API, daftar route, opsi filter, dan contoh cUrl |
| `GET` | `/explore` | Filter dan telusuri komik |
| `GET` | `/manga` | Alias ke `/explore` |
| `GET` | `/ranking` | Daftar peringkat komik terpopuler |
| `GET` | `/manga/:slug` | Detail informasi komik dan seluruh chapter |
| `GET` | `/manga/:slug/:chapterSlug` | Membaca chapter menggunakan chapter slug asli |
| `GET` | `/manga/:slug/chapter/:chapter` | Membaca chapter menggunakan nomor atau slug |
| `GET` | `/search?q=keyword` | Mencari komik berdasarkan kata kunci |
| `GET` | `/genres` | Daftar seluruh 140+ genre komik |

---

## Parameter Query

### Endpoint `/explore` & `/manga`

| Parameter | Tipe | Wajib | Pilihan / Format | Deskripsi |
|---|---|---|---|---|
| `page` | Integer | Tidak | `1`, `2`, `3`, dst. (default: `1`) | Nomor halaman |
| `genre` | String | Tidak | `action`, `shoujo-ai,action` | Satu atau lebih slug genre (dipisahkan koma) |
| `type` | String | Tidak | `manga`, `manhwa`, `manhua` | Tipe komik |
| `status` | String | Tidak | `ongoing` (berjalan), `completed` (tamat) | Status penerbitan komik |
| `order` / `sort` | String | Tidak | `update`, `latest`, `popular`, `title` | Urutan penyajian |
| `search` / `q` | String | Tidak | Kata kunci pencarian (misal: `tales`) | Cari judul manga |

### Endpoint `/ranking`

| Parameter | Tipe | Wajib | Pilihan Nilai |
|---|---|---|---|
| `period` | String | Tidak | `daily` (default), `weekly`, `monthly`, `all` |

---

## Panduan cUrl di Terminal Windows

### Windows PowerShell

1. **Gunakan `curl.exe`**: Pada PowerShell standar, perintah `curl` merupakan alias bawaan untuk cmdlet `Invoke-WebRequest`. Gunakan `curl.exe` agar mengeksekusi biner curl asli.
2. **Kutip URL Ganda (`"..."`)**: Karakter `&` di PowerShell dianggap sebagai statement separator atau call operator jika tidak dikutip.
3. **Gunakan Host `127.0.0.1` atau `localhost`**: `http://127.0.0.1:3002` lebih direkomendasikan untuk menghindari resolusi IPv6 `::1`.

Contoh PowerShell:
```powershell
curl.exe -s "http://127.0.0.1:3002/explore?genre=shoujo-ai,action&type=manga&status=ongoing&order=update"
```

### Windows Command Prompt (CMD)

Di CMD, gunakan kutip dua `""` untuk parameter URL yang mengandung `&`:
```cmd
curl.exe -s "http://127.0.0.1:3002/explore?genre=shoujo-ai,action&type=manga&status=ongoing&order=update"
```

### Linux / macOS (Bash / Zsh)

```bash
curl -s "http://127.0.0.1:3002/explore?genre=shoujo-ai,action&type=manga&status=ongoing&order=update"
```

---

## Contoh Pemanggilan cUrl per Kasus

### 1. Explore Komik

Mengambil daftar komik bergenre *shoujo-ai* dan *action*, tipe *manga*, status *ongoing*, diurutkan berdasarkan *update*:

- **Ke API lokal:**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/explore?genre=shoujo-ai,action&type=manga&status=ongoing&order=update"
  ```
- **Langsung ke situs v1.komikcast.ac:**
  ```powershell
  curl.exe -s "https://v1.komikcast.ac/explore?genre=shoujo-ai%2Caction&type=manga&status=ongoing&order=update"
  ```

### 2. Ranking Komik

- **Ke API lokal:**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/ranking"
  ```
- **Langsung ke sumber:**
  ```powershell
  curl.exe -s "https://v1.komikcast.ac/ranking"
  ```

### 3. Detail Komik

Melihat informasi komik *Tales of Demons and Gods*:

- **Ke API lokal:**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/manga/tales-demons-gods"
  ```
- **Langsung ke sumber:**
  ```powershell
  curl.exe -s "https://v1.komikcast.ac/manga/tales-demons-gods"
  ```

### 4. Baca Chapter Komik

Membaca Chapter 1 dari *Tales of Demons and Gods*:

- **Ke API lokal (format slug asli):**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1"
  ```
- **Ke API lokal (format nomor chapter):**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/manga/tales-demons-gods/chapter/1"
  ```
- **Langsung ke sumber:**
  ```powershell
  curl.exe -s "https://v1.komikcast.ac/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1"
  ```

### 5. Pencarian Manga

- **Berdasarkan kata kunci:**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/search?q=tales"
  ```

### 6. Daftar Genre

- **Mendapatkan daftar semua genre:**
  ```powershell
  curl.exe -s "http://127.0.0.1:3002/genres"
  ```

---

## Struktur Respons JSON

### A. Explore (`GET /explore`)

```json
{
  "status": "Ok",
  "data": {
    "mangas": [
      {
        "title": "Ah, It’s Wonderful To Be Alive",
        "slug": "ah-its-wonderful-to-be-alive",
        "poster": "https://thumbnail.komiku.org/uploads/manga/ah-its-wonderful-to-be-alive/manga_thumbnail-A2-Ah-Its-Wonderful-To-Be-Alive.jpg?w=500",
        "type": "Manga"
      }
    ],
    "pagination": {
      "current_page": 1,
      "last_page": 286,
      "has_next": true,
      "next_page": 2,
      "has_prev": false,
      "prev_page": null
    },
    "filters": {
      "page": 1,
      "type": "manga",
      "status": "ongoing",
      "order": "update",
      "genre": "shoujo-ai,action",
      "search": null
    }
  }
}
```

### B. Ranking (`GET /ranking`)

```json
{
  "status": "Ok",
  "data": {
    "rankings": [
      {
        "rank": 1,
        "title": "Tales of Demons and Gods",
        "slug": "tales-demons-gods",
        "poster": "https://thumbnail.komiku.org/uploads/manga/tales-demons-gods/manga_thumbnail-Komik-Tales-of-Demons-and-Gods.jpg?w=500",
        "rating": 5,
        "author": "Mad Snail",
        "type": "Manhua",
        "status": "Ongoing",
        "views": "1.3K"
      }
    ],
    "period": "daily"
  }
}
```

### C. Detail Manga (`GET /manga/:slug`)

```json
{
  "status": "Ok",
  "data": {
    "title": "Tales of Demons and Gods",
    "slug": "tales-demons-gods",
    "subtitle": "Kisah Para Dewa dan Iblis",
    "poster": "https://thumbnail.komiku.org/uploads/manga/tales-demons-gods/manga_thumbnail-Komik-Tales-of-Demons-and-Gods.jpg?w=500",
    "rank": 1,
    "author": "Mad Snail",
    "type": "Manhua",
    "status": "Ongoing",
    "genres": ["Fantasi"],
    "synopsis": "Nie Li, Spiritualis Iblis terkuat di kehidupannya yang lalu...",
    "total_chapters": 980,
    "first_chapter": {
      "slug": "tales-of-demons-and-gods-chapter-1",
      "url": "/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1"
    },
    "latest_chapter": {
      "slug": "tales-of-demons-and-gods-chapter-529-1",
      "url": "/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-529-1"
    },
    "chapters": [
      {
        "number": 529.1,
        "title": "Chapter 529.1",
        "slug": "tales-of-demons-and-gods-chapter-529-1",
        "date": "3 Sep 2026, 15.17 WIB",
        "url": "/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-529-1"
      },
      {
        "number": 1,
        "title": "Chapter 1",
        "slug": "tales-of-demons-and-gods-chapter-1",
        "date": "26 Feb 2026, 08.15 WIB",
        "url": "/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1"
      }
    ]
  }
}
```

### D. Baca Chapter (`GET /manga/:slug/:chapterSlug`)

```json
{
  "status": "Ok",
  "data": {
    "title": "Tales of Demons and Gods Chapter 1",
    "manga_slug": "tales-demons-gods",
    "chapter_slug": "tales-of-demons-and-gods-chapter-1",
    "chapter_number": 1,
    "images": [
      {
        "order": 1,
        "url": "https://img.komiku.org/wp-content/uploads/46187-1.jpg"
      },
      {
        "order": 2,
        "url": "https://img.komiku.org/wp-content/uploads/46187-2.jpg"
      }
    ],
    "prev_url": null,
    "next_url": "/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-2",
    "series_url": "/manga/tales-demons-gods"
  }
}
```

### E. Daftar Genre (`GET /genres`)

```json
{
  "status": "Ok",
  "data": [
    { "name": "Action", "slug": "action" },
    { "name": "Adventure", "slug": "adventure" },
    { "name": "Shoujo Ai", "slug": "shoujo-ai" }
  ]
}
```

---

## Error Handling & Status Code

| Status Code | Kondisi | Contoh Format JSON |
|---|---|---|
| `200 OK` | Request berhasil | `{"status": "Ok", "data": { ... }}` |
| `400 Bad Request` | Query wajib belum disertakan (misal: parameter `q` pada `/search`) | `{"status": "Error", "message": "Query parameter 'q' or 'search' is required"}` |
| `404 Not Found` | Manga atau chapter tidak ditemukan | `{"status": "Error", "message": "Manga not found"}` |
| `429 Too Many Requests` | Melebihi batasan rate limit (60 request per menit) | `{"status": "Error", "message": "Too many requests, please try again later."}` |
| `502 Bad Gateway` | Gagal mengambil data HTML dari server hulu (`v1.komikcast.ac`) | `{"status": "Error", "message": "Failed to fetch manga detail", "error": "..."}` |
| `500 Internal Server Error` | Terjadi kesalahan internal pada server API | `{"status": "Error", "message": "Internal server error"}` |

---

## Testing

Proyek ini telah dilengkapi unit test bawaan menggunakan Node.js Test Runner:

```bash
npm test
```

Menjalankan pengujian:
- Parsing kartu komik halaman explore
- Parsing metadata ranking
- Parsing detail manga dan daftar chapter
- Parsing reader halaman gambar dan tombol prev/next
- Logika pagination
- Ekstraksi slug dan nama genre

---

## Deployment (PM2 & Docker)

### PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start src/index.js --name komikcast-api
pm2 save
```

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3002
CMD ["node", "src/index.js"]
```

Build dan jalankan:
```bash
docker build -t komikcast-api .
docker run -d -p 3002:3002 --name komikcast-api --restart always komikcast-api
```

---

> **Disclaimer**: Proyek ini merupakan API scraping tidak resmi untuk tujuan pembelajaran dan riset. Seluruh konten komik dan aset gambar adalah hak milik masing-masing penerbit, author, dan situs sumber [v1.komikcast.ac](https://v1.komikcast.ac/).
