import { readdirSync, readFileSync } from "fs";
import path from "path";
import { embed } from "../embeddings/client";
import { getPool, toVectorLiteral } from "../db/client";
import { loadEnv } from "../env";
import { isDoNotIngest, parseKbFile, type KbChunk } from "./kb-parser";
import { loadDictionary } from "./dictionary";
import { rulesAsKbChunks } from "./rules";

loadEnv();

const KB_DIR = path.join(process.cwd(), "hackathon_docs", "kb");

function loadMarkdownChunks(): KbChunk[] {
  const files = readdirSync(KB_DIR).filter((f) => f.endsWith(".md"));
  const chunks: KbChunk[] = [];
  for (const file of files) {
    const raw = readFileSync(path.join(KB_DIR, file), "utf-8");
    for (const chunk of parseKbFile(raw)) {
      if (isDoNotIngest(chunk.meta)) {
        console.log(`  skip (do-not-ingest): ${chunk.meta.id} [${file}]`);
        continue;
      }
      chunks.push(chunk);
    }
  }
  return chunks;
}

async function main() {
  console.log("Loading KB markdown chunks...");
  const chunks = [...loadMarkdownChunks(), ...rulesAsKbChunks()];
  console.log(`  ${chunks.length} chunks to ingest.`);

  console.log("Validating dictionary.json...");
  console.log(`  ${loadDictionary().length} dictionary entries loaded.`);

  console.log("Embedding chunks (input_type=passage)...");
  const embeddings = await embed(chunks.map((c) => c.content), "passage");

  const pool = getPool();
  console.log("Upserting into kb_chunks...");
  for (let i = 0; i < chunks.length; i++) {
    const { meta, content } = chunks[i];
    const keywordText = (meta.keywords ?? []).join(" ");
    await pool.query(
      `insert into kb_chunks (id, topic, title, content, keywords, source_url, is_synthetic, freshness, embedding, fts)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, to_tsvector('simple', $4 || ' ' || $10))
       on conflict (id) do update set
         topic = excluded.topic, title = excluded.title, content = excluded.content,
         keywords = excluded.keywords, source_url = excluded.source_url,
         is_synthetic = excluded.is_synthetic, freshness = excluded.freshness,
         embedding = excluded.embedding, fts = excluded.fts`,
      [
        meta.id,
        meta.topic,
        meta.title ?? null,
        content,
        meta.keywords ?? [],
        meta.source_url ?? null,
        meta.is_synthetic ?? false,
        meta.freshness ?? null,
        toVectorLiteral(embeddings[i]),
        keywordText,
      ],
    );
  }

  console.log(`Done. ${chunks.length} chunks ingested.`);
  await pool.end();
}

main().catch((err) => {
  console.error("ingest failed:", err);
  process.exit(1);
});
