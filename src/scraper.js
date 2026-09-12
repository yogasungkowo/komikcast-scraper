import dns from "node:dns";
import axios from "axios";
import * as cheerio from "cheerio";

dns.setDefaultResultOrder?.("ipv4first");

export const BASE_URL = "https://komikcast.app";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
  },
});

export async function fetchHtml(path) {
  const { data } = await client.get(path);
  if (typeof data !== "string" || !data.includes("<html")) {
    throw new Error("Invalid HTML response");
  }
  return data;
}

export const clean = (v) => (v || "").replace(/\s+/g, " ").trim();

export const slugFromHref = (href) => {
  const segs = (href || "").replace(/^https?:\/\/[^/]+/, "").split("/").filter(Boolean);
  // "/manga/<slug>/chapter/<num>" -> chapter slug is the number part
  if (segs.length >= 4 && segs[2] === "chapter") return segs[3];
  // "/manga/<slug>" -> slug
  return segs[1] || null;
};

export const numberFromText = (v) => {
  const m = clean(v).match(/(?:chapter|ch\.?)\s*[-–:]?\s*(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : null;
};

export const chapterNumberFromSlug = (v) => {
  const s = clean(v);
  const m = s.match(/\/chapter\/(\d+(?:\.\d+)?)\/?$/i) || s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);
  return numberFromText(v);
};

// ---- List page (/manga) ----------------------------------------------------

export function parseMangaCards(html) {
  const $ = cheerio.load(html);
  return $("article.system-content-card")
    .map((_, card) => {
      const $card = $(card);
      const link = $card.find("a[href*='/manga/']").first();
      const href = link.attr("href");
      const title =
        clean(link.attr("aria-label")) ||
        clean($card.find("h3").first().text());
      const poster = $card.find("img").first().attr("src") || null;
      const badgeText = clean($card.find("[class*='system-badge']").first().text());
      const rating = clean($card.find("[class*='system-rating']").last().text());
      const chapters = $card
        .find("a[href*='/chapter/']")
        .map((_, ch) => {
          const chSlug = slugFromHref($(ch).attr("href"));
          const label = clean($(ch).find("[class*='__label']").text());
          const date = clean($(ch).find("time").text()) || null;
          return {
            number: chapterNumberFromSlug(chSlug),
            slug: chSlug,
            title: label,
            date,
          };
        })
        .get();

      return {
        title,
        slug: slugFromHref(href),
        poster,
        type: /Manga|Manhwa|Manhua/i.test(badgeText) ? badgeText : null,
        rating: rating ? Number(rating) || null : null,
        latest_chapters: chapters,
        // FE (kurunime) mapListComic reads `latest_chapter` for the chapter badge.
        latest_chapter: chapters[0]
          ? { ...chapters[0], chapter_number: chapters[0].number }
          : null,
      };
    })
    .get()
    .filter((x) => x.slug && x.slug !== "manga");
}

export function parsePagination($, currentPage = 1) {
  let has_next = false;
  let next_page = null;
  let has_prev = false;
  let prev_page = null;
  let last_page = currentPage;

  $("nav[aria-label*='halaman'] a, .system-pagination a").each((_, el) => {
    const text = clean($(el).text());
    const href = $(el).attr("href") || "";
    const m = href.match(/page=(\d+)/);
    if (/^next$/i.test($(el).attr("rel") || "") || m) {
      if (m) {
        const pageNum = Number(m[1]);
        if (pageNum > last_page) last_page = pageNum;
      }
    }
    if (/^next$/i.test($(el).attr("rel") || "")) {
      has_next = true;
      next_page = m ? Number(m[1]) : currentPage + 1;
    }
  });

  if (currentPage > 1) {
    has_prev = true;
    prev_page = currentPage - 1;
  }

  return {
    current_page: currentPage,
    last_page,
    has_next,
    next_page,
    has_prev,
    prev_page,
  };
}

// Sort values used by komikcast.app: new_manga, latest_update, popular, rating, title
const SORT_MAP = {
  update: "latest_update",
  latest: "new_manga",
  popular: "popular",
  rating: "rating",
  title: "title",
};

export async function getMangaList({
  page = 1,
  type,
  sort,
  order,
  genre,
  status,
  search,
  q,
} = {}) {
  const params = new URLSearchParams();
  if (page && Number(page) > 1) params.set("page", String(page));

  const orderValue = order || sort;
  if (orderValue) {
    const mapped = SORT_MAP[String(orderValue).toLowerCase()];
    if (mapped) params.set("sort", mapped);
  }
  if (type && type.toLowerCase() !== "all") params.set("type", type.toLowerCase());
  if (status && status.toLowerCase() !== "all") params.set("status", status.toLowerCase());
  if (genre) {
    const genreParam = Array.isArray(genre) ? genre.join(",") : genre;
    params.set("genre", genreParam);
  }
  const searchQuery = search || q;
  if (searchQuery) params.set("search", searchQuery);

  const queryStr = params.toString();
  const path = `/manga${queryStr ? `?${queryStr}` : ""}`;
  const html = await fetchHtml(path);
  const $ = cheerio.load(html);

  return {
    status: "Ok",
    data: {
      mangas: parseMangaCards(html),
      pagination: parsePagination($, Number(page) || 1),
      filters: {
        page: Number(page) || 1,
        type: type || null,
        status: status || null,
        order: orderValue || null,
        genre: genre || null,
        search: searchQuery || null,
      },
    },
  };
}

// ---- Detail page (/manga/:slug) --------------------------------------------

export function parseMangaDetail(html, slug) {
  const $ = cheerio.load(html);
  const main = $("main");
  const title = clean(main.find("h1").first().text());
  const poster = main.find("img[data-cover-image], [data-cover] img").first().attr("src") || null;

  const badges = main
    .find("[class*='system-badge']")
    .map((_, e) => clean($(e).text()))
    .get();

  const type =
    badges.find((x) => /Manga|Manhwa|Manhua/i.test(x))?.match(/(Manga|Manhwa|Manhua)/i)?.[1] ||
    null;
  const status =
    badges.find((x) => /Ongoing|Completed|Tamat|Berjalan/i.test(x)) || null;
  const year = badges.find((x) => /^(19|20)\d{2}$/.test(x)) || null;

  const ratingText = clean(main.find("[role='img'][aria-label*='Rating']").first().text());
  const rating = ratingText ? Number(ratingText) || null : null;

  const rankMatch = clean(main.text()).match(/Rank\s*#?\s*(\d+)/i);
  const rank = rankMatch ? Number(rankMatch[1]) : null;

  // Meta rows: "Author -", "Artist -" etc.
  const metaText = clean(main.text());
  const authorMatch = metaText.match(/Author\s*([-–—]?\s*[\w\s.&',]+?)(?:Artist|Status|Type|Genre|Sinopsis|Chapter|$)/i);
  const author = authorMatch ? clean(authorMatch[1].replace(/^[-–—]\s*/, "")) || null : null;

  // Genres: links like /manga?genre=action
  const genres = [];
  const seen = new Set();
  $("a[href*='genre=']").each((_, e) => {
    const name = clean($(e).text());
    const gSlug =
      ($(e).attr("href") || "").match(/[?&]genre=([a-z0-9-]+)/i)?.[1] || null;
    if (name && gSlug && !seen.has(gSlug)) {
      seen.add(gSlug);
      genres.push({ name, slug: gSlug });
    }
  });

  // Synopsis: paragraph(s) following the "Sinopsis" heading
  let synopsis = null;
  main.find("h2, h3").each((_, e) => {
    if (synopsis) return;
    if (/sinopsis/i.test(clean($(e).text()))) {
      const next = $(e).next();
      synopsis = clean(next.text()) || null;
    }
  });
  if (!synopsis) {
    const metaDesc = $('meta[name="description"]').attr("content");
    if (metaDesc) synopsis = clean(metaDesc.replace(/^Ini adalah sinopsis untuk\s*/i, ""));
  }

  // Chapter list
  const chaptersMap = new Map();
  $(`a[href*='/manga/${slug}/chapter/']`).each((_, e) => {
    const href = $(e).attr("href");
    const chSlug = href.split("/").filter(Boolean).pop(); // e.g. "34.00"
    if (!chSlug || chaptersMap.has(chSlug)) return;
    const label = clean($(e).find("span.truncate").first().text()) ||
      clean($(e).find("span").first().text());
    const date = clean($(e).find("span.font-mono").first().text()) || null;
    const num = Number(chSlug);
    chaptersMap.set(chSlug, {
      number: Number.isNaN(num) ? null : num,
      title: label || `Chapter ${chSlug}`,
      // FE (kurunime) expects "<manga>-chapter-<N>" slugs; keep the real
      // source path in `url`.
      slug: `${slug}-chapter-${chSlug.replace(/\.00$/, "")}`,
      date,
      url: href,
    });
  });
  const chapters = Array.from(chaptersMap.values());

  const chapterNumbers = chapters.map((c) => c.number).filter((n) => n != null);
  const firstChapter = chapters.length ? chapters[chapters.length - 1] : null;
  const latestChapter = chapters.length ? chapters[0] : null;

  return {
    title,
    slug,
    poster,
    type,
    status,
    year,
    rating,
    rank,
    author,
    genres,
    synopsis,
    total_chapters: chapters.length,
    latest_chapter_number: chapterNumbers.length ? Math.max(...chapterNumbers) : null,
    first_chapter: firstChapter
      ? { slug: firstChapter.slug, url: firstChapter.url, number: firstChapter.number }
      : null,
    latest_chapter: latestChapter
      ? { slug: latestChapter.slug, url: latestChapter.url, number: latestChapter.number }
      : null,
    chapters,
  };
}

export async function getMangaDetail(slug) {
  const html = await fetchHtml(`/manga/${slug}`);
  return {
    status: "Ok",
    data: parseMangaDetail(html, slug),
  };
}

// ---- Chapter page (/manga/:slug/chapter/:num) -------------------------------

export function parseChapter(html, mangaSlug, chapterSlug) {
  const $ = cheerio.load(html);
  const title = clean($("title").text().replace(/—\s*Komikcast.*$/i, ""));
  const images = $("main img[src], [data-cover-image] img[src]")
    .map((_, e) => {
      const src = $(e).attr("src") || "";
      return src && /^https?:\/\//.test(src) ? { url: src } : null;
    })
    .get()
    .filter(Boolean);

  // Fallback: every content image on the page (reading container)
  const finalImages = images.length
    ? images
    : $("img[src*='uploads'], img[src*='img.'], img[src*='.jpg'], img[src*='.webp'], img[src*='.png']")
        .map((_, e) => ({ url: $(e).attr("src") }))
        .get()
        .filter((x) => x.url && /^https?:\/\//.test(x.url));

  const prev_url =
    $("a[rel='prev']").attr("href") ||
    $("a")
      .filter((_, e) => /prev|sebelumnya/i.test(clean($(e).text())))
      .first()
      .attr("href") ||
    null;

  const next_url =
    $("a[rel='next']").attr("href") ||
    $("a")
      .filter((_, e) => /next|berikutnya/i.test(clean($(e).text())))
      .first()
      .attr("href") ||
    null;

  const series_url = `/manga/${mangaSlug}`;
  const chNum = Number(String(chapterSlug).replace(/\.00$/, "")) || null;
  // FE (kurunime) expects "<manga>-chapter-<N>" slugs.
  const feSlug = `${mangaSlug}-chapter-${String(chapterSlug).replace(/\.00$/, "")}`;

  const nav = (u) => {
    if (!u) return null;
    const pathname = new URL(u, BASE_URL).pathname;
    const lastSeg = pathname.split("/").filter(Boolean).pop();
    return {
      slug: `${mangaSlug}-chapter-${String(lastSeg).replace(/\.00$/, "")}`,
      chapter_number: Number(String(lastSeg).replace(/\.00$/, "")) || null,
      url: pathname,
    };
  };

  return {
    title,
    manga_slug: mangaSlug,
    chapter_slug: feSlug,
    chapter_number: chNum,
    images: finalImages.map((img, i) => ({ order: i + 1, url: img.url })),
    prev_url,
    next_url,
    series_url,
    manga: {
      slug: mangaSlug,
      title: clean(title.replace(/\s*Chapter.*$/i, "")) || mangaSlug,
    },
    chapter: {
      title,
      slug: feSlug,
      chapter_number: chNum,
      images: finalImages.map((img, i) => ({ order: i + 1, url: img.url })),
    },
    prev: nav(prev_url),
    next: nav(next_url),
    all_chapters: [],
  };
}

export async function getChapter(mangaSlug, chapterIdentifier) {
  let identifier = String(chapterIdentifier).trim();
  // Accept FE-style slugs like "<manga>-chapter-2" or trailing "-chapter-2.5".
  const feMatch = identifier.match(/-chapter-(\d+(?:\.\d+)?)$/i);
  if (feMatch) identifier = feMatch[1];
  // Accept "1", "34.5", or "34.00".
  const chapterPart = identifier.replace(/\.00$/, "");
  const html = await fetchHtml(`/manga/${mangaSlug}/chapter/${chapterPart}`);
  return {
    status: "Ok",
    data: parseChapter(html, mangaSlug, chapterPart),
  };
}

// ---- Genres & ranking -------------------------------------------------------

let cachedGenres = null;

export async function getGenres() {
  if (cachedGenres && cachedGenres.length > 0) {
    return { status: "Ok", data: cachedGenres };
  }
  // Genre options live in the catalog filter: <select name="genre[]">
  const html = await fetchHtml("/manga");
  const $ = cheerio.load(html);
  const genres = [];
  const seen = new Set();
  $('select[name="genre[]"] option').each((_, e) => {
    const gSlug = clean($(e).attr("value"));
    const name = clean($(e).text());
    if (gSlug && gSlug !== "all" && name && !seen.has(gSlug)) {
      seen.add(gSlug);
      genres.push({ name, slug: gSlug });
    }
  });
  if (genres.length === 0) {
    // Fallback: detail pages carry genre links server-side.
    const detailHtml = await fetchHtml("/manga/overgeared");
    const $$ = cheerio.load(detailHtml);
    $$("a[href*='genre=']").each((_, e) => {
      const name = clean($$(e).text());
      const gSlug = ($$(e).attr("href") || "").match(/[?&]genre=([a-z0-9-]+)/i)?.[1];
      if (name && gSlug && !seen.has(gSlug)) {
        seen.add(gSlug);
        genres.push({ name, slug: gSlug });
      }
    });
  }
  if (genres.length > 0) cachedGenres = genres;
  // FE (kurunime) extractList() expects `data` to be the array itself.
  return { status: "Ok", data: genres };
}

export async function getRanking(period) {
  // komikcast.app has no manga ranking page (its leaderboard ranks users),
  // so build the ranking from the catalog sorted by popularity.
  const html = await fetchHtml("/manga?sort=popular");
  const $ = cheerio.load(html);
  const items = parseMangaCards(html).map((m, i) => ({
    rank: i + 1,
    title: m.title,
    slug: m.slug,
    poster: m.poster,
    rating: m.rating,
    type: m.type,
  }));
  return {
    status: "Ok",
    data: { rankings: items, period: period || "all" },
  };
}

export async function searchManga(query, { page = 1 } = {}) {
  return getMangaList({ search: query, page });
}
