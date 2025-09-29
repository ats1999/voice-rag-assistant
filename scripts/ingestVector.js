const fs = require('fs/promises');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const docsDir = path.join(process.cwd(), 'public/faq');
const genAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_KEY,
});

const pinecode = new Pinecone({
  apiKey: process.env.PINE_CODE_API_KEY,
});

const namespace = pinecode
  .index('rag', PINE_CODE_INDEX_HOST)
  .namespace('__default__');

async function embedText(text) {
  const response = await genAi.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });
  return response.embeddings[0].values;
}

async function getMarkdownFiles(dir) {
  let results = [];
  const files = await fs.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(await getMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function generateEmbeddingForFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const embedding = await embedText(content);
  const docId = filePath.replace(docsDir, '');

  return namespace.upsert([
    {
      id: docId,
      values: embedding,
      metadata: {
        source: docId,
        filename: path.basename(docId),
        type: 'markdown',
      },
    },
  ]);
}

async function start() {
  const files = await getMarkdownFiles(docsDir);

  for (const filePath of files) {
    console.log('Generating Embedding For ' + filePath);
    await generateEmbeddingForFile(filePath);
  }
}

start().catch(console.error);
