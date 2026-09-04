import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import {
  getMangaList,
  getMangaDetail,
  getChapter,
  searchManga,
  getGenres,
  getRanking,
  BASE_URL,
} from "./scraper.js";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "Error",
    message: "Too many requests, please try again later.",
  },
});
app.use(limiter);

app.get("/", (req, res) => {
  res.json({
    status: "Ok",
    message: "Komikcast API (v1.komikcast.ac)",
    source: BASE_URL,
    endpoints: {
      "GET /explore":
        "Explore manga with filters (query: page, genre, type, status, order, search)",
      "GET /manga":
        "Alias to /explore (query: page, genre, type, status, order, sort, search)",
      "GET /ranking":
        "Manga rankings (optional query: period=daily|weekly|monthly|all)",
      "GET /manga/:slug":
        "Manga detail with chapter list (e.g. /manga/tales-demons-gods)",
      "GET /manga/:slug/:chapterSlug":
        "Read chapter by chapter slug (e.g. /manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1)",
      "GET /manga/:slug/chapter/:chapter":
        "Read chapter by chapter number or slug (e.g. /manga/tales-demons-gods/chapter/1)",
      "GET /search?q=keyword":
        "Search manga (alias to /explore?search=keyword)",
      "GET /genres": "List all 140+ manga genres",
    },
    filter_options: {
      type: ["manga", "manhwa", "manhua"],
      status: ["ongoing", "completed"],
      order: ["update", "latest", "popular", "title"],
      genre_example: "shoujo-ai,action",
    },
    curl_examples: [
      `curl "http://localhost:${PORT}/explore?genre=shoujo-ai,action&type=manga&status=ongoing&order=update"`,
      `curl "http://localhost:${PORT}/ranking"`,
      `curl "http://localhost:${PORT}/manga/tales-demons-gods"`,
      `curl "http://localhost:${PORT}/manga/tales-demons-gods/tales-of-demons-and-gods-chapter-1"`,
      `curl "http://localhost:${PORT}/manga/tales-demons-gods/chapter/1"`,
    ],
  });
});

async function handleMangaList(req, res) {
  try {
    const { page, type, sort, order, genre, status, search, q } = req.query;
    const result = await getMangaList({
      page: page ? parseInt(page, 10) : 1,
      type: type || undefined,
      order: order || sort || undefined,
      genre: genre || undefined,
      status: status || undefined,
      search: search || q || undefined,
    });
    res.json(result);
  } catch (err) {
    console.error("[handleMangaList]", err.message);
    res.status(502).json({
      status: "Error",
      message: "Failed to fetch manga list",
      error: err.message,
    });
  }
}

app.get("/explore", handleMangaList);
app.get("/manga", handleMangaList);

app.get("/ranking", async (req, res) => {
  try {
    res.json(await getRanking(req.query.period));
  } catch (err) {
    console.error("[/ranking]", err.message);
    res.status(502).json({
      status: "Error",
      message: "Failed to fetch ranking",
      error: err.message,
    });
  }
});

app.get("/genres", async (req, res) => {
  try {
    const result = await getGenres();
    res.json(result);
  } catch (err) {
    console.error("[/genres]", err.message);
    res.status(502).json({
      status: "Error",
      message: "Failed to fetch genres",
      error: err.message,
    });
  }
});

app.get("/search", async (req, res) => {
  try {
    const query = req.query.q || req.query.search;
    if (!query) {
      return res.status(400).json({
        status: "Error",
        message: "Query parameter 'q' or 'search' is required",
      });
    }
    const result = await searchManga(query, {
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
    });
    res.json(result);
  } catch (err) {
    console.error("[/search]", err.message);
    res.status(502).json({
      status: "Error",
      message: "Failed to search manga",
      error: err.message,
    });
  }
});

app.get("/manga/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await getMangaDetail(slug);
    res.json(result);
  } catch (err) {
    console.error("[/manga/:slug]", err.message);
    const status = err.response?.status || 502;
    res.status(status === 404 ? 404 : 502).json({
      status: "Error",
      message: status === 404 ? "Manga not found" : "Failed to fetch manga detail",
      error: err.message,
    });
  }
});

app.get("/manga/:slug/chapter/:chapter", async (req, res) => {
  try {
    const { slug, chapter } = req.params;
    const result = await getChapter(slug, chapter);
    res.json(result);
  } catch (err) {
    console.error("[/manga/:slug/chapter/:chapter]", err.message);
    const status = err.response?.status || 502;
    res.status(status === 404 ? 404 : 502).json({
      status: "Error",
      message: status === 404 ? "Chapter not found" : "Failed to fetch chapter",
      error: err.message,
    });
  }
});

app.get("/manga/:slug/:chapterSlug", async (req, res) => {
  try {
    const { slug, chapterSlug } = req.params;
    const result = await getChapter(slug, chapterSlug);
    res.json(result);
  } catch (err) {
    console.error("[/manga/:slug/:chapterSlug]", err.message);
    const status = err.response?.status || 502;
    res.status(status === 404 ? 404 : 502).json({
      status: "Error",
      message: status === 404 ? "Chapter not found" : "Failed to fetch chapter",
      error: err.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    status: "Error",
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("[UNHANDLED]", err);
  res.status(500).json({
    status: "Error",
    message: "Internal server error",
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Komikcast API running on http://0.0.0.0:${PORT}`);
});

export default app;
