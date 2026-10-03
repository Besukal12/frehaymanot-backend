import express from "express";
import announcementRoutes from "./routes/announcement/route.js";
import courseRoutes from "./routes/course/route.js";
import feedbackRoutes from "./routes/feedback/route.js";
import mezmurRoutes from "./routes/mezmur/route.js";

const app = express();

const allowedOrigins = new Set(
  [
    "https://frehaymanot-frontend-8xdv.vercel.app",
    "http://localhost:3000",
    ...(process.env.FRONTEND_ORIGINS ?? "").split(","),
  ]
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

app.use((req, res, next) => {
  const origin = req.get("Origin");
  res.vary("Origin");

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.method === "OPTIONS") {
    res.vary("Access-Control-Request-Method");
    res.vary("Access-Control-Request-Headers");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Accept, Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use("/api/announcements", announcementRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/mezmur", mezmurRoutes);

export default app;
