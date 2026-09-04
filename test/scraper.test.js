import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMangaCards,
  parseRanking,
  parseMangaDetail,
  parseChapter,
  parsePagination,
  parseGenres,
} from "../src/scraper.js";
import * as cheerio from "cheerio";

const cardHtml = `
  <a class="group block" href="/manga/the-last-human">
    <img src="https://img.example/poster.jpg" alt="The Last Human">
    <span class="badge">Manhua</span><h3>The Last Human</h3>
  </a>`;

test("parses manga cards from v1 HTML", () => {
  assert.deepEqual(parseMangaCards(cardHtml), [
    {
      title: "The Last Human",
      slug: "the-last-human",
      poster: "https://img.example/poster.jpg",
      type: "Manhua",
    },
  ]);
});

test("parses ranking entries and rank metadata", () => {
  const html = `<a href="/manga/the-last-human"><span>1</span><img src="poster.jpg" alt="The Last Human"><h3>The Last Human</h3><span aria-label="Rating 5 dari 5">★★★★★</span><span>WOW Studios</span><span>🇨🇳 Manhua</span><span>Ongoing</span><span>👁 931</span></a>`;
  assert.deepEqual(parseRanking(html), [
    {
      rank: 1,
      title: "The Last Human",
      slug: "the-last-human",
      poster: "poster.jpg",
      rating: 5,
      author: "WOW Studios",
      type: "Manhua",
      status: "Ongoing",
      views: 931,
    },
  ]);
});

test("parses detail chapters using chapter slug URLs", () => {
  const html = `<main><h1>The Last Human</h1><p class="subtitle">Manusia Terakhir</p><div><span class="badge">📈 RANK #57</span><span class="badge">Manhua</span><span class="badge">Horor</span></div><p class="whitespace-pre-line synopsis">Synopsis text</p><img alt="The Last Human" src="poster.jpg"><a href="/manga/the-last-human/the-last-human-chapter-601"><span>Chapter 601</span><span>5 bln</span></a><h2>586 Chapter</h2></main>`;
  assert.deepEqual(parseMangaDetail(html, "the-last-human"), {
    title: "The Last Human",
    slug: "the-last-human",
    subtitle: "Manusia Terakhir",
    poster: "poster.jpg",
    rank: 57,
    author: null,
    type: "Manhua",
    status: null,
    genres: ["Horor"],
    synopsis: "Synopsis text",
    total_chapters: 1,
    first_chapter: null,
    latest_chapter: null,
    chapters: [
      {
        number: 601,
        title: "Chapter 601",
        slug: "the-last-human-chapter-601",
        date: null,
        url: "/manga/the-last-human/the-last-human-chapter-601",
      },
    ],
  });
});

test("parses chapter reader images and navigation", () => {
  const html = `<main><img alt="Halaman 2" src="2.jpg"><img alt="Halaman 1" src="1.jpg"><a href="/manga/x/x-chapter-600">Prev Chapter</a><a href="/manga/x">Semua chapter</a></main>`;
  assert.deepEqual(parseChapter(html, "x", "x-chapter-601"), {
    title: "",
    manga_slug: "x",
    chapter_slug: "x-chapter-601",
    chapter_number: 601,
    images: [
      { order: 1, url: "1.jpg" },
      { order: 2, url: "2.jpg" },
    ],
    prev_url: "/manga/x/x-chapter-600",
    next_url: null,
    series_url: "/manga/x",
    manga: {
      slug: "x",
      title: "x",
    },
    chapter: {
      title: "",
      slug: "x-chapter-601",
      chapter_number: 601,
      images: [
        { order: 1, url: "1.jpg" },
        { order: 2, url: "2.jpg" },
      ],
    },
    prev: {
      slug: "x-chapter-600",
      chapter_number: 600,
      url: "/manga/x/x-chapter-600",
    },
    next: null,
    all_chapters: [],
  });
});

test("parses pagination correctly", () => {
  const html = `<nav><a href="/explore">1</a><a href="/explore?page=2">2</a><a href="/explore?page=10">10</a><a href="/explore?page=2">Next ›</a></nav>`;
  const $ = cheerio.load(html);
  assert.deepEqual(parsePagination($, 1), {
    current_page: 1,
    last_page: 10,
    has_next: true,
    next_page: 2,
    has_prev: false,
    prev_page: null,
  });
});

test("parses genres correctly", () => {
  const html = `<div><button title="Action — ketuk untuk memasukkan.">Action</button><button title="Shoujo Ai — ketuk untuk memasukkan.">Shoujo Ai</button></div>`;
  assert.deepEqual(parseGenres(html), [
    { name: "Action", slug: "action" },
    { name: "Shoujo Ai", slug: "shoujo-ai" },
  ]);
});
