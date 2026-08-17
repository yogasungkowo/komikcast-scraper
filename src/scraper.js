import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://komikcast.app";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Referer: BASE_URL,
  },
});

async function fetchPage(path) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const { data: html } = await client.get(url);
  const $ = cheerio.load(html);
  const dataPageAttr = $("#app").attr("data-page");
  if (!dataPageAttr) {
    throw new Error("data-page attribute not found — page may be blocked or changed structure");
  }
  return JSON.parse(dataPageAttr);
}

function mapMangaCard(m) {
  return {
    id: m.id,
    title: m.title,
    slug: m.slug,
    poster: m.poster,
    type: m.type,
    status: m.status,
    rating: m.rating,
    release_year: m.release_year,
    author: m.author,
    artist: m.artist,
    views_count: m.views_count,
    is_featured: Boolean(m.is_featured),
    synopsis: m.synopsis,
    genres: (m.genres || []).map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
    last_chapter: m.last_chapter
      ? {
          id: m.last_chapter.id,
          title: m.last_chapter.title,
          chapter_number: m.last_chapter.chapter_number,
          slug: m.last_chapter.slug,
          created_at: m.last_chapter.created_at,
        }
      : null,
  };
}

function mapChapter(c) {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    chapter_number: c.chapter_number,
    source_url: c.source_url,
    views_count: c.views_count,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

export async function getMangaList({ page = 1, type, sort, genre } = {}) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (type) params.set("type", type);
  if (sort) params.set("sort", sort);
  if (genre) params.set("genre", genre);

  const path = `/manga?${params.toString()}`;
  const pageData = await fetchPage(path);

  const mangasData = pageData.props.mangas;
  const genres = pageData.props.genres || [];
  const filters = pageData.props.filters || {};

  return {
    status: "Ok",
    data: {
      mangas: mangasData.data.map(mapMangaCard),
      pagination: {
        current_page: mangasData.current_page,
        last_page: mangasData.last_page,
        per_page: mangasData.per_page,
        total: mangasData.total,
        from: mangasData.from,
        to: mangasData.to,
        has_next: Boolean(mangasData.next_page_url),
        has_prev: Boolean(mangasData.prev_page_url),
        next_page: mangasData.next_page_url
          ? Number(new URL(mangasData.next_page_url).searchParams.get("page"))
          : null,
        prev_page: mangasData.prev_page_url
          ? Number(new URL(mangasData.prev_page_url).searchParams.get("page"))
          : null,
      },
      filters,
      genres: genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug, icon: g.icon })),
    },
  };
}

export async function getMangaDetail(slug) {
  const pageData = await fetchPage(`/manga/${slug}`);
  const m = pageData.props.manga;

  return {
    status: "Ok",
    data: {
      id: m.id,
      title: m.title,
      slug: m.slug,
      poster: m.poster,
      type: m.type,
      status: m.status,
      rating: m.rating,
      release_year: m.release_year,
      author: m.author,
      artist: m.artist,
      views_count: m.views_count,
      is_featured: Boolean(m.is_featured),
      synopsis: m.synopsis,
      source_url: m.source_url,
      genres: (m.genres || []).map((g) => ({ id: g.id, name: g.name, slug: g.slug, icon: g.icon })),
      chapters: (m.chapters || []).map(mapChapter),
      manga_rank: pageData.props.mangaRank ?? null,
      total_raters: pageData.props.totalRaters ?? null,
      first_chapter: pageData.props.firstChapter
        ? mapChapter(pageData.props.firstChapter)
        : null,
      related_mangas: (pageData.props.relatedMangas || []).map(mapMangaCard),
    },
  };
}

export async function getChapter(slug, chapterNumber) {
  const pageData = await fetchPage(`/manga/${slug}/chapter/${chapterNumber}`);
  const m = pageData.props.manga;
  const ch = pageData.props.chapter;

  return {
    status: "Ok",
    data: {
      manga: {
        id: m.id,
        title: m.title,
        slug: m.slug,
        poster: m.poster,
        type: m.type,
      },
      chapter: {
        id: ch.id,
        title: ch.title,
        slug: ch.slug,
        chapter_number: ch.chapter_number,
        views_count: ch.views_count,
        created_at: ch.created_at,
        updated_at: ch.updated_at,
        source_url: ch.source_url,
        images: (ch.images || [])
          .sort((a, b) => a.order - b.order)
          .map((img) => ({
            id: img.id,
            order: img.order,
            url: img.image_path,
          })),
      },
      prev: pageData.props.prev
        ? mapChapter(pageData.props.prev)
        : null,
      next: pageData.props.next
        ? mapChapter(pageData.props.next)
        : null,
      all_chapters: (pageData.props.chapters || []).map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        chapter_number: c.chapter_number,
        created_at: c.created_at,
      })),
    },
  };
}

export async function searchManga(query, { page = 1 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("search", query);
  if (page) params.set("page", String(page));

  const path = `/manga?${params.toString()}`;
  const pageData = await fetchPage(path);
  const mangasData = pageData.props.mangas;

  return {
    status: "Ok",
    data: {
      query,
      results: mangasData.data.map(mapMangaCard),
      pagination: {
        current_page: mangasData.current_page,
        last_page: mangasData.last_page,
        per_page: mangasData.per_page,
        total: mangasData.total,
        has_next: Boolean(mangasData.next_page_url),
        has_prev: Boolean(mangasData.prev_page_url),
      },
    },
  };
}

export async function getGenres() {
  const pageData = await fetchPage("/manga");
  return {
    status: "Ok",
    data: (pageData.props.genres || []).map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      icon: g.icon,
    })),
  };
}

export { BASE_URL };
