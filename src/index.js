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
    message: "Komikcast API",
    base_url: BASE_URL,
    endpoints: {
      "GET /manga": "List all manga (optional: ?page=1&type=Manhwa&sort=latest_update&genre=action)",
      "GET /manga/:slug": "Manga detail with chapters",
      "GET /manga/:slug/chapter/:number": "Read chapter with images",
      "GET /search?q=keyword": "Search manga",
      "GET /genres": "List all genres",
    },
    sort_options: ["latest_update", "popular", "rating", "title"],
    type_options: ["Manga", "Manhwa", "Manhua"],
  });
});

app.get("/manga", async (req, res) => {
  try {
    const { page, type, sort, genre } = req.query;
    const result = await getMangaList({
      page: page ? parseInt(page, 10) : 1,
      type: type || undefined,
      sort: sort || undefined,
      genre: genre || undefined,
    });
    res.json(result);
  } catch (err) {
    console.error("[/manga]", err.message);
    res.status(502).json({
      status: "Error",
      message: "Failed to fetch manga list",
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

app.get("/manga/:slug/chapter/:number", async (req, res) => {
  try {
    const { slug, number } = req.params;
    const result = await getChapter(slug, number);
    res.json(result);
  } catch (err) {
    console.error("[/manga/:slug/chapter/:number]", err.message);
    const status = err.response?.status || 502;
    res.status(status === 404 ? 404 : 502).json({
      status: "Error",
      message: status === 404 ? "Chapter not found" : "Failed to fetch chapter",
      error: err.message,
    });
  }
});

app.get("/search", async (req, res) => {
  try {
    const { q, page } = req.query;
    if (!q) {
      return res.status(400).json({
        status: "Error",
        message: "Query parameter 'q' is required",
      });
    }
    const result = await searchManga(q, {
      page: page ? parseInt(page, 10) : 1,
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

app.listen(PORT, () => {
  console.log(`Komikcast API running on http://localhost:${PORT}`);
});
