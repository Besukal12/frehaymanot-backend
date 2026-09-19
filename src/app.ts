import express from "express";
import announcementRoutes from "./routes/announcement/route.js";

const app = express();

app.use(express.json());
app.use("/api/announcements", announcementRoutes);

export default app;
