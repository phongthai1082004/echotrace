import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();
const auth = new AuthController();

router.post("/google",   (req, res) => auth.googleLogin(req, res));
router.post("/register", (req, res) => auth.register(req, res));
router.post("/login",    (req, res) => auth.login(req, res));

export default router;