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
  process.on("unhandledRejection", (e) => {
    logger.error(`Unhandled rejection: ${e instanceof Error ? e.stack || e.message : String(e)}`);
  });
}

app.use(cookieParser());
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));
app.use((req, res, next) => {
  bodyParser.json({
    limit: "15mb",
  })(req, res, (err) => {
    if (err) {
      logger.error(err instanceof Error ? err.message : String(err));
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

// Anyone can read public data from anywhere, but only our own pages may make
// requests that use someone's session.
const isOwnOrigin = (origin: string | undefined) =>
  !!origin &&
  (["https://www.codako.org", "https://codako.org", "https://staging.codako.org"].includes(
    origin,
  ) ||
    (process.env.NODE_ENV !== "production" &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)));

app.use(
  cors((req, callback) =>
    callback(null, { origin: true, credentials: isOwnOrigin(req.headers.origin) }),
  ),
);

app.use("/", require("./routes/users").default);
app.use("/", require("./routes/worlds").default);
app.use("/", require("./routes/characters").default);
app.use("/", require("./routes/openai").default);
app.use("/", require("./routes/backgrounds").default);
app.use("/", require("./routes/youtube").default);

if (process.env.NODE_ENV !== "production") {
  app.use("/", require("./routes/testing").default);
  app.use("/storage", express.static(path.join(__dirname, "..", "storage")));
}

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Catch multer limit errors
  if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(422).json({ message: `File too large, only files under 20MB will be uploaded` });
  }

  logger.error(err.stack || err.message);
  res.status(500).json({ message: err.toString() });
});

const frontendDist = path.join(__dirname, "..", "frontend");
const frontendAssets = path.join(frontendDist, "assets");
const frontendVersion = path.join(frontendDist, "version.json");
app.use(
  express.static(frontendDist, {
    index: false,
    maxAge: 60 * 60 * 24 * 1000,
    setHeaders: (res, filePath) => {
      if (filePath.startsWith(frontendAssets + path.sep)) {
        // Vite puts a hash of each file's contents in its name, so a file in
        // assets/ never changes: browsers can keep it for good.
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath === frontendVersion) {
        // Open tabs check this to find out a new release is out.
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);
// A tab still running an old release asks for its old files, which this
// release doesn't have. Say so, rather than answering with index.html: the
// page then knows the file is missing and reloads (see update-check.ts).
app.use("/assets", (req, res) => {
  res.sendStatus(404);
});
app.use("/", (req, res, next) => {
  // Always check for a newer index.html, which names the current release's files.
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
