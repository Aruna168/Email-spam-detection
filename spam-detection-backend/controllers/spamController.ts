import { Request, Response } from "express";
import { loadAndPrepareData, predictMessage, getTopWords } from "../models/spamModel";

let modelReady = false;

export const initializeModel = async () => {
  await loadAndPrepareData();
  modelReady = true;
};

export const predict = async (req: Request, res: Response) => {
  if (!modelReady) {
    return res.status(503).json({ error: "Model is loading. Try again later." });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const result = predictMessage(message);
  res.json(result);
};

export const getWordStats = (_req: Request, res: Response) => {
  if (!modelReady) {
    return res.status(503).json({ error: "Model is loading." });
  }

  res.json(getTopWords());
};
