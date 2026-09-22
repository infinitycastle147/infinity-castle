import { GoogleGenAI } from "@google/genai";

import {
  EMBEDDING_DIMENSIONS,
  type Embedder,
  type EmbeddingTask,
} from "./types";

const MODEL = "gemini-embedding-001";
const MAX_BATCH_SIZE = 100;

export class GeminiEmbedder implements Embedder {
  private readonly client: GoogleGenAI;

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    this.client = new GoogleGenAI({ apiKey });
  }

  async embed(texts: string[], task: EmbeddingTask): Promise<number[][]> {
    if (texts.length === 0) return [];

    const vectors: number[][] = [];
    for (let offset = 0; offset < texts.length; offset += MAX_BATCH_SIZE) {
      const response = await this.client.models.embedContent({
        model: MODEL,
        contents: texts.slice(offset, offset + MAX_BATCH_SIZE),
        config: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: task === "document"
            ? "RETRIEVAL_DOCUMENT"
            : "RETRIEVAL_QUERY",
        },
      });

      const batch = response.embeddings ?? [];
      if (batch.length !== Math.min(MAX_BATCH_SIZE, texts.length - offset)) {
        throw new Error("Gemini returned an unexpected number of embeddings");
      }

      for (const embedding of batch) {
        const values = embedding.values;
        if (!values || values.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(
            `Gemini returned ${values?.length ?? 0} dimensions; expected ${EMBEDDING_DIMENSIONS}`,
          );
        }
        vectors.push(values);
      }
    }

    return vectors;
  }
}
