// why we actually chunk
// it searches *chunks* of the text

// small enough but at the same big enough so that it contains full ide/ definition

// slice it

import { Document } from "@langchain/core/documents";

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 150;

// text -> markdown, article, policy
// sources -> what is his name ? -> sangam (source #0)
// document object

// chunksize=10, overlap=3 and text=ABCDEFGHIJNKMKL
// step -> chunksize -  overlap = 7
// start=0 -> slice[0:10] = ABCDEFGHIJ chunk #0
// start=7 -> slice [7:17]= HIJNKMKL... chunk #1
export function chunkText(text: string, source: string): Document[] {
  const clean = (text ?? "").replace(/\r\n/g, "\n");

  const docs: Document[] = [];

  if (!clean.trim()) return docs;
  // 1000, 150
  // chunk 0 -> [0...1000]
  // chunk 1 -> [850...1850]
  const step = Math.max(1, CHUNK_SIZE - CHUNK_OVERLAP);

  let start = 0;
  let chunkId = 0;

  while (start < clean.length) {
    const end = Math.min(clean.length, start + CHUNK_SIZE);

    // remove leading/trailing blank lines
    const slice = clean.slice(start, end).trim();

    if (slice.length > 0) {
      docs.push(
        new Document({
          pageContent: slice,
          metadata: {
            source,
            chunkId,
          },
        })
      );
      // next chunk will get the next id
      chunkId += 1;
    }

    start += step;
  }

  return docs;
}
