import fs from "fs";
import path from "path";
import csv from "csv-parser";
import natural from "natural";
import express from "express";

interface MessageData {
  message: string;
  label: "spam" | "ham";
}

interface WordStat {
  word: string;
  weight: number;
}

let tfidf: natural.TfIdf;
let classifier: natural.BayesClassifier;
let topWords: WordStat[] = [];

export const loadAndPrepareData = async (): Promise<void> => {
  const dataPath = path.join(__dirname, "..", "data", "dataset.csv");

  // Check if the dataset file exists
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Dataset file not found at ${dataPath}`);
  }

  const messages: MessageData[] = await new Promise((resolve, reject) => {
    const rows: MessageData[] = [];
    fs.createReadStream(dataPath)
      .pipe(csv())
      .on("data", (row) => {
        const label = row["Spam/Ham"]?.toLowerCase() === "spam" ? "spam" : "ham";
        const message = `${row["Subject"] || ""} ${row["Message"] || ""}`.trim();
        if (message) rows.push({ message, label });
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });

  classifier = new natural.BayesClassifier();
  tfidf = new natural.TfIdf();

  // Train both the classifier and TF-IDF model
  for (const { message, label } of messages) {
    classifier.addDocument(message, label);
    tfidf.addDocument(message);
  }

  classifier.train();

  // Analyze top terms using TF-IDF
  const allTerms: Record<string, number> = {};
  tfidf.documents.forEach((doc: any) => {
    for (const term in doc) {
      allTerms[term] = (allTerms[term] || 0) + doc[term];
    }
  });

  const sorted = Object.entries(allTerms)
    .map(([word, weight]) => ({ word, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 50);

  const max = sorted[0]?.weight || 1;
  topWords = sorted.map(w => ({ ...w, weight: w.weight / max }));

  console.log("Data loaded and model trained successfully.");
};

export const predictMessage = (message: string) => {
  const label = classifier.classify(message);
  const probabilities = classifier.getClassifications(message);

  return {
    prediction: label,
    confidence: parseFloat((probabilities.find(p => p.label === label)?.value || 0).toFixed(4)),
    probabilities: probabilities.map(p => ({
      label: p.label,
      value: parseFloat(p.value.toFixed(4))
    })),
  };
};

export const getTopWords = (): WordStat[] => topWords;

const app = express();
app.use(express.json());

// Load and prepare data
(async () => {
  try {
    await loadAndPrepareData();
  } catch (error) {
    console.error("Error loading data:", error.message);
    process.exit(1);
  }
})();

// Define the /predict endpoint
app.post("/predict", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const prediction = predictMessage(message);
  res.json(prediction);
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
