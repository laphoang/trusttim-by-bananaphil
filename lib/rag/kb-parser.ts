/**
 * Parses the hand-curated KB chunk format used in hackathon_docs/kb/*.md:
 * an optional leading <!-- --> comment, then one or more chunks separated by a "---" line, each
 * chunk being a ```json metadata header followed by Vietnamese prose content.
 */

export interface KbChunkMeta {
  id: string;
  topic: string;
  title?: string;
  keywords?: string[];
  source_url?: string | null;
  last_reviewed?: string;
  is_synthetic?: boolean;
  freshness?: string;
}

export interface KbChunk {
  meta: KbChunkMeta;
  content: string;
}

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)```/;

/** A chunk explicitly flags itself unsafe to ingest (e.g. illegible source, pending doctor sign-off). */
export function isDoNotIngest(meta: KbChunkMeta): boolean {
  return /do not ingest/i.test(meta.freshness ?? "");
}

export function parseKbFile(raw: string): KbChunk[] {
  const withoutLeadingComment = raw.replace(/^<!--[\s\S]*?-->\s*/, "");
  const blocks = withoutLeadingComment.split(/\n---\n/);

  const chunks: KbChunk[] = [];
  for (const block of blocks) {
    const match = block.match(JSON_BLOCK_RE);
    if (!match) continue;
    const meta = JSON.parse(match[1]) as KbChunkMeta;
    const content = block.slice(match.index! + match[0].length).trim();
    if (!content) continue;
    chunks.push({ meta, content });
  }
  return chunks;
}
