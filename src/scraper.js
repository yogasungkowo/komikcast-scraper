import axios from "axios";
import * as cheerio from "cheerio";

export const BASE_URL = "https://v1.komikcast.ac";

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

export const slugFromHref = (href) =>
  (href || "").split("/").filter(Boolean).pop() || null;

export const numberFromText = (v) => {
  const m = clean(v).match(/(?:chapter|ch\.?)\s*[-–:]?\s*(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : null;
};

export const chapterNumberFromSlug = (v) => {
  const m = clean(v).match(/-chapter-(\d+(?:[-.]\d+)?)$/i);
  if (m) {
    return Number(m[1].replace("-", "."));
  }
  return numberFromText(v);
};

export function parseMangaCards(html) {
  const $ = cheerio.load(html);
  return $("a[href^='/manga/']")
    .filter((_, e) => $(e).find("h3").length > 0)
    .map((_, e) => {
      const href = $(e).attr("href");
      const title = clean($(e).find("h3").first().text());
      const slug = slugFromHref(href);
      const poster = $(e).find("img").first().attr("src") || null;
      const type =
        clean($(e).find(".badge").first().text()) ||
        clean($(e).find("span").first().text()) ||
        null;

      return {
        title,
        slug,
        poster,
        type: type && /Manga|Manhwa|Manhua/i.test(type) ? type : null,
      };
    })
    .get();
}

export function parseRanking(html) {
  const $ = cheerio.load(html);
  return $("a[href^='/manga/']")
    .filter((_, e) => $(e).find("h3").length > 0)
    .map((_, e) => {
      const text = clean($(e).text());
      const r = ($(e).find("[aria-label*='Rating']").attr("aria-label") || "").match(
        /([\d.]+)\s*(?:dari|\/)/i
      );
      const meta = $(e)
        .find("div")
        .last()
        .text()
        .split("·")
        .map(clean)
        .filter(Boolean);
      const type = meta.find((x) => /Manga|Manhwa|Manhua/i.test(x));
      const fallback = $(e)
        .find("span")
        .map((_, s) => clean($(s).text()))
        .get()
        .filter(
          (x) =>
            x &&
            !x.includes("★") &&
            !x.includes("Rating") &&
            !/^\d+$/.test(x) &&
            !/👁/.test(x) &&
            !/Manga|Manhwa|Manhua/i.test(x) &&
            !/Ongoing|Completed|Berjalan|Tamat/i.test(x)
        );

      const authorEl =
        clean($(e).find("span.line-clamp-1").first().text()) ||
        fallback[0] ||
        (meta[0] && !meta[0].includes("★") ? meta[0] : null) ||
        null;

      const viewsMatch = text.match(/👁\s*([\d,.KMB]+)/i);
      let views = null;
      if (viewsMatch) {
        const raw = viewsMatch[1].replace(/,/g, "");
        const num = Number(raw);
        views = Number.isNaN(num) ? viewsMatch[1] : num;
      }

      return {
        rank: Number(clean($(e).find("span").first().text())),
        title: clean($(e).find("h3").text()),
        slug: slugFromHref($(e).attr("href")),
        poster: $(e).find("img").attr("src") || null,
        rating: r ? Number(r[1]) : null,
        author: authorEl,
        type: type
          ? type.match(/(Manga|Manhwa|Manhua)/i)?.[1]
          : $(e)
              .find("span")
              .map((_, s) => clean($(s).text()))
              .get()
              .find((x) => /Manga|Manhwa|Manhua/i.test(x))
              ?.match(/(Manga|Manhwa|Manhua)/i)?.[1] || null,
        status:
          meta.find((x) => /Ongoing|Completed|Berjalan|Tamat/i.test(x)) ||
          $(e)
            .find("span")
            .map((_, s) => clean($(s).text()))
            .get()
            .find((x) => /Ongoing|Completed|Berjalan|Tamat/i.test(x)) ||
          null,
        views,
      };
    })
    .get()
    .filter((x) => x.rank > 0);
}

export function parseMangaDetail(html, slug) {
  const $ = cheerio.load(html);
  const main = $("main");
  const title = clean(main.find("h1").first().text());
  const subtitle = clean(main.find("h1").first().next("p").text()) || null;

  const poster =
    main
      .find("img")
      .filter((_, e) => {
        const src = $(e).attr("src") || "";
        return (
          !src.includes(".gif") &&
          (src.includes("/uploads/") || $(e).attr("alt") === title)
        );
      })
      .first()
      .attr("src") || null;

  const badges = main
    .find(".badge")
    .map((_, e) => clean($(e).text()))
    .get();
  const fullText = clean(main.text());

  const rankMatch = fullText.match(/RANK\s*#\s*(\d+)/i);
  const rank = rankMatch ? Number(rankMatch[1]) : null;

  const authorMatch =
    fullText.match(/✎\s*Author\s*([^\n\r·]+)/i) ||
    fullText.match(
      /(?:Author|Pengarang)\s*([^\n\r·]+?)(?:Status|Format|Type|Release|Genre|$)/i
    );
  const author = authorMatch ? clean(authorMatch[1].replace(/Format.*$/, "")) : null;

  const statusMatch = fullText.match(/Status\s*(Ongoing|Completed|Berjalan|Tamat)/i);
  const status = statusMatch ? statusMatch[1] : null;

  const type =
    badges.find((x) => /Manga|Manhwa|Manhua/i.test(x))?.match(/(Manga|Manhwa|Manhua)/i)?.[1] ||
    fullText.match(/(?:🇨🇳|🇯🇵|🇰🇷)\s*(Manga|Manhwa|Manhua)/i)?.[1] ||
    fullText.match(/\b(Manga|Manhwa|Manhua)\b/i)?.[1] ||
    null;

  const genres = badges.filter((x) => !/RANK|Manga|Manhwa|Manhua/i.test(x));

  const synopsis =
    clean(main.find("p.whitespace-pre-line").first().text()) ||
    clean(
      main
        .find("p")
        .filter(
          (_, e) =>
            clean($(e).text()).length > 20 &&
            !$(e).hasClass("subtitle") &&
            !/Manusia Terakhir/.test($(e).text())
        )
        .first()
        .text()
    ) ||
    null;

  let first_chapter = null;
  let latest_chapter = null;
  const bacaPertama = $(`a[href*='/manga/${slug}/']`)
    .filter((_, e) => clean($(e).text()) === "Baca Pertama")
    .first();
  if (bacaPertama.length) {
    first_chapter = {
      slug: slugFromHref(bacaPertama.attr("href")),
      url: bacaPertama.attr("href"),
    };
  }
  const bacaTerbaru = $(`a[href*='/manga/${slug}/']`)
    .filter((_, e) => clean($(e).text()) === "Baca Terbaru")
    .first();
  if (bacaTerbaru.length) {
    latest_chapter = {
      slug: slugFromHref(bacaTerbaru.attr("href")),
      url: bacaTerbaru.attr("href"),
    };
  }

  const chaptersMap = new Map();
  $(`a[href^='/manga/${slug}/']`).each((_, e) => {
    const text = clean($(e).text());
    if (text === "Baca Pertama" || text === "Baca Terbaru") return;
    const href = $(e).attr("href");
    const chSlug = slugFromHref(href);
    if (!chSlug || chaptersMap.has(chSlug)) return;

    const titleSpan = clean(
      $(e).find("span.truncate, span[class*='truncate']").first().text()
    );
    const firstSpan = clean($(e).find("span").first().text());
    const dateSpan = $(e).find("span[title]").first();
    const date = clean(dateSpan.attr("title") || dateSpan.text()) || null;
    const chTitle = titleSpan || firstSpan || text;
    const num = chapterNumberFromSlug(chSlug) ?? numberFromText(chTitle);

    chaptersMap.set(chSlug, {
      number: num,
      title: chTitle,
      slug: chSlug,
      date,
      url: href,
    });
  });

  const chapters = Array.from(chaptersMap.values());

  return {
    title,
    slug,
    subtitle,
    poster,
    rank,
    author,
    type,
    status,
    genres,
    synopsis,
    total_chapters: chapters.length,
    first_chapter,
    latest_chapter,
    chapters,
  };
}

export function parseChapter(html, mangaSlug, chapterSlug) {
  const $ = cheerio.load(html);
  const title = clean($("title").text().replace(/—\s*Komikcast.*$/i, ""));
  const images = $("img[alt^='Halaman']")
    .map((_, e) => ({
      order: Number(clean($(e).attr("alt")).match(/(\d+)/)?.[1]),
      url: $(e).attr("src"),
    }))
    .get()
    .sort((a, b) => a.order - b.order);

  const prev_url =
    $("a")
      .filter((_, e) => /prev\s*chapter|‹\s*prev/i.test(clean($(e).text())))
      .first()
      .attr("href") || null;

  const next_url =
    $("a")
      .filter((_, e) => /next\s*chapter|next\s*›/i.test(clean($(e).text())))
      .first()
      .attr("href") || null;

  const series_url =
    $(`a[href='/manga/${mangaSlug}']`).attr("href") || `/manga/${mangaSlug}`;

  const prevMatch = html.match(/"prev\\":\\"(.*?)\\"/);
  const nextMatch = html.match(/"next\\":\\"(.*?)\\"/);
  const prevChapterSlug = prevMatch ? prevMatch[1] : (prev_url ? slugFromHref(prev_url) : null);
  const nextChapterSlug = nextMatch ? nextMatch[1] : (next_url ? slugFromHref(next_url) : null);

  let allChapters = [];
  const allChaptersMatch = html.match(/allChapters\\":(\[\{.*?\}\])/);
  if (allChaptersMatch) {
    try {
      const parsed = JSON.parse(allChaptersMatch[1].replace(/\\"/g, '"'));
      allChapters = parsed.map((c) => ({
        slug: c.slug,
        title: `Chapter ${c.num}`,
        chapter_number: Number(c.num) || c.num,
        date: c.date,
      }));
    } catch {}
  }

  const chNum = chapterNumberFromSlug(chapterSlug);

  return {
    title,
    manga_slug: mangaSlug,
    chapter_slug: chapterSlug,
    chapter_number: chNum,
    images,
    prev_url,
    next_url,
    series_url,
    manga: {
      slug: mangaSlug,
      title: clean(title.replace(/\s*Chapter.*$/i, "")) || mangaSlug,
    },
    chapter: {
      title,
      slug: chapterSlug,
      chapter_number: chNum,
      images,
    },
    prev: prevChapterSlug
      ? {
          slug: prevChapterSlug,
          chapter_number: chapterNumberFromSlug(prevChapterSlug),
          url: `/manga/${mangaSlug}/${prevChapterSlug}`,
        }
      : null,
    next: nextChapterSlug
      ? {
          slug: nextChapterSlug,
          chapter_number: chapterNumberFromSlug(nextChapterSlug),
          url: `/manga/${mangaSlug}/${nextChapterSlug}`,
        }
      : null,
    all_chapters: allChapters,
  };
}

export function parsePagination($, currentPage = 1) {
  let has_next = false;
  let next_page = null;
  let has_prev = false;
  let prev_page = null;
  let last_page = currentPage;

  $("nav a").each((_, el) => {
    const text = clean($(el).text());
    const href = $(el).attr("href") || "";
    if (!href.includes("/explore")) return;

    if (/Next|›/i.test(text)) {
      has_next = true;
      const m = href.match(/page=(\d+)/);
      next_page = m ? Number(m[1]) : currentPage + 1;
    } else if (/Prev|‹/i.test(text)) {
      has_prev = true;
      const m = href.match(/page=(\d+)/);
      prev_page = m ? Number(m[1]) : Math.max(1, currentPage - 1);
    } else if (/^\d+$/.test(text)) {
      const pageNum = Number(text);
      if (pageNum > last_page) {
        last_page = pageNum;
      }
    }
  });

  if (currentPage > 1) {
    has_prev = true;
    prev_page = prev_page || currentPage - 1;
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

export function parseGenres(html) {
  const $ = cheerio.load(html);
  const genres = [];
  const seen = new Set();

  $('button[title*="— ketuk untuk memasukkan."]').each((_, el) => {
    const name = clean($(el).text());
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      genres.push({ name, slug });
    }
  });

  return genres;
}

let cachedGenres = null;

export async function getMangaList({
  page = 1,
  type,
  sort,
  order,
  genre,
  status,
  search,
} = {}) {
  const params = new URLSearchParams();
  if (page && Number(page) > 1) params.set("page", String(page));

  const orderValue = order || sort;
  if (orderValue) params.set("order", orderValue);
  if (type) params.set("type", type.toLowerCase());
  if (status) params.set("status", status.toLowerCase());
  if (genre) {
    const genreParam = Array.isArray(genre) ? genre.join(",") : genre;
    params.set("genre", genreParam);
  }
  if (search) params.set("search", search);

  const queryStr = params.toString();
  const path = `/explore${queryStr ? `?${queryStr}` : ""}`;
  const html = await fetchHtml(path);
  const $ = cheerio.load(html);

  const extractedGenres = parseGenres(html);
  if (extractedGenres.length > 0) {
    cachedGenres = extractedGenres;
  }

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
        search: search || null,
      },
    },
  };
}

export async function getMangaDetail(slug) {
  const html = await fetchHtml(`/manga/${slug}`);
  return {
    status: "Ok",
    data: parseMangaDetail(html, slug),
  };
}

export async function getChapter(mangaSlug, chapterIdentifier) {
  const identifier = String(chapterIdentifier).trim();

  // If already a full chapter slug (e.g. "tales-of-demons-and-gods-chapter-1")
  if (identifier.includes("-chapter-") || identifier.startsWith(`${mangaSlug}-`)) {
    const html = await fetchHtml(`/manga/${mangaSlug}/${identifier}`);
    return {
      status: "Ok",
      data: parseChapter(html, mangaSlug, identifier),
    };
  }

  // Otherwise, try standard naming convention first: ${mangaSlug}-chapter-${identifier}
  const guessedSlug = `${mangaSlug}-chapter-${identifier}`;
  try {
    const html = await fetchHtml(`/manga/${mangaSlug}/${guessedSlug}`);
    return {
      status: "Ok",
      data: parseChapter(html, mangaSlug, guessedSlug),
    };
  } catch (err) {
    // If not found, fetch manga detail to find actual chapter slug
    const detail = await getMangaDetail(mangaSlug);
    const targetNum = Number(identifier);
    const matched = detail.data.chapters.find(
      (c) =>
        c.number === targetNum ||
        c.slug === identifier ||
        c.slug.endsWith(`-chapter-${identifier}`)
    );

    if (matched) {
      const html = await fetchHtml(`/manga/${mangaSlug}/${matched.slug}`);
      return {
        status: "Ok",
        data: parseChapter(html, mangaSlug, matched.slug),
      };
    }

    throw err;
  }
}

export async function searchManga(query, options = {}) {
  return getMangaList({ ...options, search: query });
}

export async function getGenres() {
  if (cachedGenres && cachedGenres.length > 0) {
    return { status: "Ok", data: cachedGenres };
  }
  const html = await fetchHtml("/explore");
  const genres = parseGenres(html);
  if (genres.length > 0) cachedGenres = genres;
  return { status: "Ok", data: genres };
}

export async function getRanking(period) {
  const path = `/ranking${period ? `?period=${encodeURIComponent(period)}` : ""}`;
  const html = await fetchHtml(path);
  return {
    status: "Ok",
    data: {
      rankings: parseRanking(html),
      period: period || "daily",
    },
  };
}
