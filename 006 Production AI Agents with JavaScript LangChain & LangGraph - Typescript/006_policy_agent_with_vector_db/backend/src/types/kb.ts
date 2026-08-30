export interface KBChunk {
  // logical grouping -> default
  // diff env, products ->
  namespace: string;

  // policy.pdf
  source: string;

  chunkId: number;

  text: string;

  //store in mongo atlas for vector search
  // 1536
  embedding: number[];
}

// citation/source

//agentAnaswer
