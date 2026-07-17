import "dotenv/config";
import "../cloudinary.config.js";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user/user.routes.js";
import uploadRoutes from "./routes/user/upload.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import bookRoutes from "./routes/user/book.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", uploadRoutes);
app.use("/api", adminRoutes);
app.use("/api", bookRoutes);
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});