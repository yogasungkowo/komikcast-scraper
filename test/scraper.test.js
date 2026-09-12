import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMangaCards,
  parseMangaDetail,
  parseChapter,
  parsePagination,
  slugFromHref,
  chapterNumberFromSlug,
} from "../src/scraper.js";
import * as cheerio from "cheerio";

const cardHtml = `
  <article class="system-content-card system-card">
    <a href="https://komikcast.app/manga/the-last-human" aria-label="The Last Human">
      <div data-cover class="system-cover system-cover--poster">
        <img src="https://img.example/poster.jpg" alt="The Last Human" class="system-cover__image">
        <span class="system-badge system-badge--manhua">Manhua</span>
      </div>
      <span role="img" aria-label="Rating 5.2 dari 10" class="system-rating"><span>5.2</span></span>
    </a>
    <h3 class="system-content-card__title">
      <a href="https://komikcast.app/manga/the-last-human">The Last Human</a>
    </h3>
    <div class="system-entry-list">
      <a href="https://komikcast.app/manga/the-last-human/chapter/12.00">
        <span class="system-entry-list__label">Chapter 12.00</span>
        <time class="system-entry-list__time">3 jam yang lalu</time>
      </a>
    </div>
  </article>`;

test("slugFromHref handles manga and chapter URLs", () => {
  assert.equal(slugFromHref("https://komikcast.app/manga/the-last-human"), "the-last-human");
  assert.equal(slugFromHref("https://komikcast.app/manga/the-last-human/chapter/12.00"), "12.00");
  assert.equal(slugFromHref("/manga/abc"), "abc");
});

test("chapterNumberFromSlug reads /chapter/N format", () => {
  assert.equal(chapterNumberFromSlug("34.00"), 34);
  assert.equal(chapterNumberFromSlug("34.50"), 34.5);
});

test("parses manga cards from komikcast.app HTML", () => {
  const cards = parseMangaCards(cardHtml);
  assert.equal(cards.length, 1);
  const c = cards[0];
  assert.equal(c.title, "The Last Human");
  assert.equal(c.slug, "the-last-human");
  assert.equal(c.poster, "https://img.example/poster.jpg");
  assert.equal(c.type, "Manhua");
  assert.equal(c.rating, 5.2);
  assert.equal(c.latest_chapters[0].slug, "12.00");
  assert.equal(c.latest_chapters[0].number, 12);
});

test("parses detail chapters using /chapter/N URLs", () => {
  const html = `<main>
    <h1>The Last Human</h1>
    <img data-cover-image src="poster.jpg" alt="The Last Human">
    <span class="system-badge">Manhua</span>
    <span class="system-badge">Ongoing</span>
    <span class="system-badge">2020</span>
    <a href="https://komikcast.app/manga?genre=horror"><span class="system-badge">Horror</span></a>
    <h2>Sinopsis</h2><p>Synopsis text</p>
    <a href="https://komikcast.app/manga/the-last-human/chapter/601.00"><span class="truncate">Chapter 601</span><span class="font-mono">5 bln</span></a>
    <a href="https://komikcast.app/manga/the-last-human/chapter/1.00"><span class="truncate">Chapter 1</span><span class="font-mono">9 bln</span></a>
  </main>`;
  const d = parseMangaDetail(html, "the-last-human");
  assert.equal(d.title, "The Last Human");
  assert.equal(d.type, "Manhua");
  assert.equal(d.status, "Ongoing");
  assert.equal(d.year, "2020");
  assert.deepEqual(d.genres, [{ name: "Horror", slug: "horror" }]);
  assert.equal(d.synopsis, "Synopsis text");
  assert.equal(d.total_chapters, 2);
  assert.equal(d.latest_chapter.slug, "the-last-human-chapter-601");
  assert.equal(d.latest_chapter.number, 601);
  assert.equal(d.first_chapter.slug, "the-last-human-chapter-1");
  assert.equal(d.chapters[0].number, 601);
});

test("parses chapter reader images and navigation", () => {
  const html = `<html><head><title>X Chapter 2 — Komikcast</title></head>
    <body><main>
      <img src="https://img.example/1.jpg" alt="page 1">
      <img src="https://img.example/2.jpg" alt="page 2">
      <a rel="prev" href="https://komikcast.app/manga/x/chapter/1.00">Prev</a>
      <a rel="next" href="https://komikcast.app/manga/x/chapter/3.00">Next</a>
    </main></body></html>`;
  const ch = parseChapter(html, "x", "2");
  assert.equal(ch.title, "X Chapter 2");
  assert.equal(ch.images.length, 2);
  assert.deepEqual(ch.images[0], { order: 1, url: "https://img.example/1.jpg" });
  assert.equal(ch.prev.slug, "x-chapter-1");
  assert.equal(ch.prev.chapter_number, 1);
  assert.equal(ch.next.slug, "x-chapter-3");
  assert.equal(ch.chapter_number, 2);
});

test("parses komikcast.app pagination", () => {
  const html = `<nav aria-label="Navigasi halaman" class="system-pagination">
    <span class="system-pagination__item" aria-current="page">1</span>
    <a class="system-pagination__item" href="https://komikcast.app/manga?page=2">2</a>
    <a class="system-pagination__item" href="https://komikcast.app/manga?page=369">369</a>
    <a class="system-pagination__item" href="https://komikcast.app/manga?page=2" rel="next">Next</a>
  </nav>`;
  const $ = cheerio.load(html);
  assert.deepEqual(parsePagination($, 1), {
    current_page: 1,
    last_page: 369,
    has_next: true,
    next_page: 2,
    has_prev: false,
    prev_page: null,
  });
});
