import "dotenv/config";
import "../cloudinary.config.js";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { handle, LanguageDetector } from "i18next-http-middleware";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user/user.routes.js";
import uploadRoutes from "./routes/user/upload.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import bookRoutes from "./routes/user/book.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();
const port = process.env.PORT || 4000;

const SUPPORTED_LANGS = ["en", "vi", "es"];
const DEFAULT_LANG = "en";

i18next
  .use(Backend)
  .use(LanguageDetector)
  .init({
    fallbackLng: DEFAULT_LANG,
    supportedLngs: SUPPORTED_LANGS,
    preload: SUPPORTED_LANGS,
    backend: {
      loadPath: "./locales/{{lng}}.json",
    },
  });

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use(handle(i18next));

const apiRouter = express.Router({ mergeParams: true });

apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  const lang = req.params.lang || (req as any).language || DEFAULT_LANG;
  req.i18n?.changeLanguage(SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG);
  next();
});

apiRouter.use("/auth", authRoutes);
apiRouter.use("/user", userRoutes);
apiRouter.use("/", uploadRoutes);
apiRouter.use("/", adminRoutes);
apiRouter.use("/", bookRoutes);

app.use("/:lang/api", apiRouter);
app.use("/api", apiRouter);
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
