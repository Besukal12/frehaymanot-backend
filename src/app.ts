import express from "express";
import announcementRoutes from "./routes/announcement/route.js";
import courseRoutes from "./routes/course/route.js";
import feedbackRoutes from "./routes/feedback/route.js";

const app = express();

app.use(express.json());
app.use("/api/announcements", announcementRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/feedback", feedbackRoutes);

export default app;
