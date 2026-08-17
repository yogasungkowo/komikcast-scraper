# Komikcast API

API tidak resmi berbasis Node.js untuk [komikcast.app](https://komikcast.app) — melakukan scraping data JSON Inertia.js yang tertanam di halaman dan menyajikannya sebagai REST API yang bersih.

## Daftar Isi

- [Tentang](#tentang)
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Instalasi](#instalasi)
- [Cara Menjalankan](#cara-menjalankan)
- [Endpoint API](#endpoint-api)
- [Parameter Query](#parameter-query)
- [Contoh Penggunaan](#contoh-penggunaan)
- [Struktur Respons](#struktur-respons)
- [Struktur Project](#struktur-project)
- [Cara Kerja Scraper](#cara-kerja-scraper)
- [Catatan Pencarian](#catatan-pencarian)
- [Deployment](#deployment)

---

## Tentang

Komikcast API adalah layanan scraping yang mengekstrak data dari situs komikcast.app dan membungkusnya menjadi API REST. Scraper tidak memparsing HTML yang sudah dirender melainkan mengekstrak payload JSON dari atribut `data-page` pada elemen `#app` (Inertia.js), sehingga lebih cepat dan tahan terhadap perubahan tampilan UI.

## Fitur

- **Daftar Manga** — Menampilkan semua manga dengan pagination (24 manga per halaman)
- **Filter Tipe** — Filter berdasarkan tipe: `Manga`, `Manhwa`, atau `Manhua`
- **Sortir** — Urutkan berdasarkan: `latest_update`, `popular`, `rating`, atau `title`
- **Filter Genre** — Filter berdasarkan slug genre (contoh: `action`, `fantasy`, `drama`)
- **Detail Manga** — Synopsis, genre, status, author, chapter list, rank, dan manga terkait
- **Baca Chapter** — Mengembalikan daftar URL gambar untuk setiap halaman chapter
- **Navigasi Chapter** — Chapter sebelumnya dan selanjutnya
- **Pencarian** — Cari manga berdasarkan judul
- **Daftar Genre** — Daftar semua genre yang tersedia lengkap dengan ikon
- **Rate Limiting** — Batas 60 request per menit
- **Security Headers** — Helmet untuk keamanan HTTP
- **CORS** — Cross-Origin Resource Sharing diaktifkan
- **Kompresi Gzip** — Menggunakan compression untuk respons yang lebih ringan

## Teknologi

| Library | Fungsi |
|---------|--------|
| [Express](https://expressjs.com/) | Framework HTTP server |
| [Axios](https://axios-http.com/) | HTTP client untuk fetching halaman |
| [Cheerio](https://cheerio.js.org/) | Parsing HTML & ekstraksi atribut `data-page` |
| [Helmet](https://helmetjs.github.io/) | Security headers |
| [express-rate-limit](https://express-rate-limit.mintlify.app/) | Rate limiting |
| [Compression](https://github.com/expressjs/compression) | Kompresi gzip |
| [Morgan](https://github.com/expressjs/morgan) | HTTP request logging |
| [CORS](https://github.com/expressjs/cors) | Cross-Origin Resource Sharing |

## Instalasi

```bash
# Clone atau masuk ke direktori project
cd manga-api

# Install dependencies
npm install
```

## Cara Menjalankan

```bash
# Mode produksi
npm start

# Mode development (auto-restart saat file berubah via --watch)
npm run dev
```

Server berjalan di `http://localhost:3002`. Port dapat diubah dengan environment variable:

```bash
PORT=8080 npm start
```

## Endpoint API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/` | Informasi API dan daftar endpoint |
| `GET` | `/manga` | Daftar manga dengan pagination, filter, dan sort |
| `GET` | `/manga/:slug` | Detail manga beserta daftar chapter |
| `GET` | `/manga/:slug/chapter/:number` | Membaca chapter — mengembalikan URL gambar |
| `GET` | `/search?q=keyword` | Mencari manga berdasarkan judul |
| `GET` | `/genres` | Daftar semua genre yang tersedia |

## Parameter Query

### `/manga`

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| `page` | number | Tidak | Nomor halaman (default: `1`) |
| `type` | string | Tidak | Tipe manga: `Manga`, `Manhwa`, atau `Manhua` |
| `sort` | string | Tidak | Sortir berdasarkan: `latest_update`, `popular`, `rating`, atau `title` |
| `genre` | string | Tidak | Slug genre (contoh: `action`, `fantasy`, `drama`) |

### `/search`

| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| `q` | string | Ya | Kata kunci pencarian |
| `page` | number | Tidak | Nomor halaman (default: `1`) |

> **Catatan:** Endpoint `/search` menerima parameter `q` dari client, lalu meneruskannya sebagai parameter `search` ke komikcast.app. Hal ini karena komikcast menggunakan nama parameter `search` (bukan `q`) untuk pencarian manga.

## Contoh Penggunaan

### Daftar Manga (Default)

```bash
curl http://localhost:3002/manga
```

### Filter Manhwa dengan Sortir Popular

```bash
curl "http://localhost:3002/manga?type=Manhwa&sort=popular"
```

### Filter Genre Action, Halaman 2

```bash
curl "http://localhost:3002/manga?genre=action&page=2"
```

### Sortir Berdasarkan Rating

```bash
curl "http://localhost:3002/manga?sort=rating"
```

### Detail Manga

```bash
curl http://localhost:3002/manga/regressing-with-the-kings-power
```

### Baca Chapter 156

```bash
curl http://localhost:3002/manga/regressing-with-the-kings-power/chapter/156
```

### Pencarian Manga

```bash
curl "http://localhost:3002/search?q=regressing"
```

### Daftar Genre

```bash
curl http://localhost:3002/genres
```

## Struktur Respons

### Daftar Manga (`GET /manga`)

```json
{
  "status": "Ok",
  "data": {
    "mangas": [
      {
        "id": 3156,
        "title": "When Trying to Get Back at the Hometown Bullies...",
        "slug": "when-trying-to-get-back-at-the-hometown-bullies...",
        "poster": "https://thumbnail.komiku.org/uploads/manga/.../manga_thumbnail-....jpg?w=500",
        "type": "Manga",
        "status": "Ongoing",
        "rating": null,
        "release_year": 2026,
        "author": "-",
        "artist": "-",
        "views_count": 980,
        "is_featured": false,
        "synopsis": "Cerita ini mengisahkan...",
        "genres": [
          { "id": 3, "name": "Comedy", "slug": "comedy" }
        ],
        "last_chapter": {
          "id": 394589,
          "title": "Chapter 78",
          "chapter_number": 78,
          "slug": "chapter-78",
          "created_at": "2026-08-16T01:24:05.000000Z"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "last_page": 314,
      "per_page": 24,
      "total": 7526,
      "from": 1,
      "to": 24,
      "has_next": true,
      "has_prev": false,
      "next_page": 2,
      "prev_page": null
    },
    "filters": {},
    "genres": [
      { "id": 1, "name": "Action", "slug": "action", "icon": "⚔️" }
    ]
  }
}
```

### Detail Manga (`GET /manga/:slug`)

```json
{
  "status": "Ok",
  "data": {
    "id": 7524,
    "title": "Regressing With The King's Power",
    "slug": "regressing-with-the-kings-power",
    "poster": "https://thumbnail.komiku.org/uploads/manga/.../manga_thumbnail-....jpg?w=500",
    "type": "Manhwa",
    "status": "Ongoing",
    "rating": null,
    "release_year": 2026,
    "author": "-",
    "artist": "-",
    "views_count": 1224,
    "is_featured": false,
    "synopsis": "Cerita ini mengikuti perjalanan...",
    "source_url": "https://komiku.org/manga/regressing-with-the-kings-power/",
    "genres": [
      { "id": 1, "name": "Action", "slug": "action", "icon": "⚔️" }
    ],
    "chapters": [
      {
        "id": 394586,
        "title": "Chapter 156",
        "slug": "chapter-156",
        "chapter_number": 156,
        "source_url": "https://komiku.org/regressing-with-the-kings-power-chapter-156/",
        "views_count": 50,
        "created_at": "2026-08-16T01:24:03.000000Z",
        "updated_at": "2026-08-16T19:16:06.000000Z"
      }
    ],
    "manga_rank": 793,
    "total_raters": 445,
    "first_chapter": {
      "id": 392668,
      "title": "Chapter 1",
      "slug": "chapter-1",
      "chapter_number": 1
    },
    "related_mangas": []
  }
}
```

### Baca Chapter (`GET /manga/:slug/chapter/:number`)

```json
{
  "status": "Ok",
  "data": {
    "manga": {
      "id": 7524,
      "title": "Regressing With The King's Power",
      "slug": "regressing-with-the-kings-power",
      "poster": "https://thumbnail.komiku.org/...",
      "type": "Manhwa"
    },
    "chapter": {
      "id": 394586,
      "title": "Chapter 156",
      "slug": "chapter-156",
      "chapter_number": 156,
      "views_count": 50,
      "created_at": "2026-08-16T01:24:03.000000Z",
      "updated_at": "2026-08-16T19:16:06.000000Z",
      "source_url": "https://komiku.org/regressing-with-the-kings-power-chapter-156/",
      "images": [
        { "id": 16051295, "order": 0, "url": "https://img.komiku.org/cover/wmkomiku2.webp" },
        { "id": 16051296, "order": 1, "url": "https://img.komiku.org/upload5/regressing-with-the-king-s-power/156/2026-08-15/1.webp" }
      ]
    },
    "prev": {
      "id": 394274,
      "title": "Chapter 155",
      "slug": "chapter-155",
      "chapter_number": 155
    },
    "next": null,
    "all_chapters": [
      { "id": 394586, "title": "Chapter 156", "slug": "chapter-156", "chapter_number": 156 }
    ]
  }
}
```

### Pencarian (`GET /search?q=keyword`)

```json
{
  "status": "Ok",
  "data": {
    "query": "regressing",
    "results": [
      {
        "id": 7524,
        "title": "Regressing With The King's Power",
        "slug": "regressing-with-the-kings-power",
        "poster": "https://thumbnail.komiku.org/...",
        "type": "Manhwa",
        "status": "Ongoing",
        "rating": null,
        "release_year": 2026,
        "author": "-",
        "artist": "-",
        "views_count": 1224,
        "is_featured": false,
        "synopsis": "Cerita ini mengikuti...",
        "genres": [
          { "id": 1, "name": "Action", "slug": "action" }
        ],
        "last_chapter": {
          "id": 394586,
          "title": "Chapter 156",
          "chapter_number": 156,
          "slug": "chapter-156",
          "created_at": "2026-08-16T01:24:05.000000Z"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 24,
      "total": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### Daftar Genre (`GET /genres`)

```json
{
  "status": "Ok",
  "data": [
    { "id": 1, "name": "Action", "slug": "action", "icon": "⚔️" },
    { "id": 2, "name": "Adventure", "slug": "adventure", "icon": "🏔️" },
    { "id": 3, "name": "Comedy", "slug": "comedy", "icon": "😂" }
  ]
}
```

## Struktur Project

```
manga-api/
├── package.json          # Dependencies & scripts
├── README.md            # Dokumentasi (file ini)
├── src/
│   ├── index.js         # Server Express & definisi route
│   └── scraper.js       # Modul scraper (fetch & ekstraksi data Inertia.js)
```

### `src/index.js`

Mendefinisikan server Express dengan middleware (helmet, cors, compression, morgan, rate-limit) dan 6 route endpoint. Setiap route menerima query parameter dari client, memanggil fungsi scraper yang sesuai, dan mengembalikan respons JSON.

### `src/scraper.js`

Berisi semua logika scraping. Fungsi utama:

| Fungsi | Deskripsi |
|--------|-----------|
| `fetchPage(path)` | Fetch halaman komikcast, ekstrak & parse atribut `data-page` |
| `mapMangaCard(m)` | Mapping raw manga object dari Inertia ke struktur API yang bersih |
| `mapChapter(c)` | Mapping raw chapter object dari Inertia ke struktur API |
| `getMangaList({ page, type, sort, genre })` | Daftar manga dengan filter & pagination |
| `getMangaDetail(slug)` | Detail manga beserta chapters, rank, dan related mangas |
| `getChapter(slug, chapterNumber)` | Baca chapter — daftar gambar + navigasi prev/next |
| `searchManga(query, { page })` | Pencarian manga berdasarkan judul |
| `getGenres()` | Daftar semua genre |

## Cara Kerja Scraper

Komikcast adalah aplikasi Single Page Application (SPA) yang dibangun dengan Laravel + Inertia.js. Alih-alih merender konten manga sebagai HTML server-side, seluruh data manga dikirim sebagai JSON di dalam atribut `data-page` pada elemen `<div id="app">`.

Proses scraping:

1. **Fetch halaman** — Axios melakukan request GET ke URL komikcast (misal `/manga?type=Manhwa`)
2. **Parsing HTML** — Cheerio memuat HTML dan mencari elemen `#app`
3. **Ekstraksi JSON** — Membaca atribut `data-page` yang berisi JSON lengkap
4. **Mapping data** — Data JSON dipetakan ke struktur respons API yang lebih bersih

```javascript
const $ = cheerio.load(html);
const dataPageAttr = $("#app").attr("data-page");
const pageData = JSON.parse(dataPageAttr);
// Akses: pageData.props.mangas.data, pageData.props.manga, dll.
```

Pendekatan ini memberikan keuntungan:

- **Cepat** — tidak perlu menunggu render JavaScript
- **Tahan perubahan UI** — tidak bergantung pada class CSS atau struktur DOM
- **Data lengkap** — semua field database tersedia langsung di JSON

## Catatan Pencarian

Endpoint `/search?q=keyword` menerima parameter `q` dari client. Secara internal, scraper meneruskan kata kunci tersebut sebagai parameter `search` ke komikcast.app (`/manga?search=keyword`).

> **Penting:** Komikcast menggunakan nama parameter `search` (bukan `q`) untuk melakukan pencarian manga. Jika parameter `q` digunakan langsung, komikcast akan mengabaikan query pencarian dan mengembalikan daftar manga default (sorted by latest update). Oleh karena itu, API ini melakukan translasi `q` → `search` secara otomatis di dalam `searchManga()`.

## Deployment

### Menjalankan dengan PM2 (Production)

```bash
# Install PM2 secara global
npm install -g pm2

# Jalankan server
pm2 start src/index.js --name komikcast-api

# Simpan & aktifkan saat startup
pm2 save
pm2 startup
```

### Menjalankan dengan Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3002
CMD ["node", "src/index.js"]
```

```bash
docker build -t komikcast-api .
docker run -p 3002:3002 --name komikcast-api komikcast-api
```

### Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `3002` | Port server |

---

> **Catatan:** Proyek ini adalah scraper tidak resmi untuk tujuan edukasi. Tidak berafiliasi dengan komikcast.app. Gunakan dengan bijak dan hormati ketentuan layanan situs.
