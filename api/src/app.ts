import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import enforce from "express-sslify";
import { MulterError } from "multer";
import path from "path";
import { logger } from "./logger";
import { requestFinishedLogger } from "./logging";

const app = express();

// Production API is HTTPS-only and redirects HTTP requests. Trust that
// Heroku's router is unwrapping SSL for us.
if (process.env.NODE_ENV && ["production"].includes(process.env.NODE_ENV)) {
  app.set("trust proxy", 1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(enforce.HTTPS({ trustProtoHeader: true }) as any);
}

if (process.env.NODE_ENV && ["production"].includes(process.env.NODE_ENV)) {
  process.on("unhandledRejection", logger.error);
}

app.use(cookieParser());
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));
app.use((req, res, next) => {
  bodyParser.json({
    limit: "15mb",
  })(req, res, (err) => {
    if (err) {
      logger.error(err);
      res.status(400).json({ message: "Request is not valid JSON" });
      return;
    }
    next();
  });
});

if (process.env.NODE_ENV !== "test") {
  app.use(requestFinishedLogger);
}

app.set("json spaces", 2);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(compression() as any);
app.use(cors({ origin: true, credentials: true }));

app.use("/", require("./routes/users").default);
app.use("/", require("./routes/worlds").default);
app.use("/", require("./routes/characters").default);
app.use("/", require("./routes/openai").default);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Catch multer limit errors
  if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(422).json({ message: `File too large, only files under 20MB will be uploaded` });
  }

  logger.error(err);
  res.status(500).json({ message: err.toString() });
});

const frontendDist = path.join(__dirname, "..", "frontend");
app.use(
  express.static(frontendDist, { index: false, immutable: true, maxAge: 60 * 60 * 24 * 1000 }),
);
app.use("/", (req, res, next) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
