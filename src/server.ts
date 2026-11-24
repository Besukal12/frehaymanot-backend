import { createServer } from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import Logger from "./core/Logger.js";

const port = env.PORT;
const httpServer = createServer(app);

httpServer
  .listen(port, () => {
    Logger.info(`Fre Haymanot is running on port ${port}`);
  })
  .on("error", (e) => Logger.error(e));
