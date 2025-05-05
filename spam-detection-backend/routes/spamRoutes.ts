import express from "express";
import { predict, getWordStats } from "../controllers/spamController";

const router = express.Router();

router.post("/predict", predict);
router.get("/word-stats", getWordStats);

export default router;