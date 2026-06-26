// DATA INSERTION PROCESS - INSIDE VECTORDATABASE
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { pipeline } from "@xenova/transformers";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
const pinecone = new PineconeClient({ apiKey: process.env.PINECONE_KEY });
const pineconeINdex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
const embeeder = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2",
);
async function loadDocument(filePath) {
  //=-==========================loading of the document //========================
  const loader = new PDFLoader(filePath, { splitPages: false });
  const docs = await loader.load();
  const pageContents = docs[0].pageContent;
  //========================chunking of the document //==========================
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });
  const text = await splitter.splitText(pageContents);
  const record = [];
  //======================emebedding conversion //=============================

  for (let i = 0; i < text.length; i++) {
    const chunks = text[i];
    const output = await embeeder(chunks, {
      pooling: "mean",
      normalize: true,
    });
    record.push({
      id: `${Date.now()}chunks-${i}`,
      values: Array.from(output.data), // this where vector array will get stored
      metadata: {
        text: chunks,
        source: "../Tanishq_RAG _SYSTEM_PDF.pdf",
      },
    });
    //==================Stroing vectors inside the vectors //=================
  }
  await pineconeINdex.upsert(record);
  console.log(
    `data has been successfully inserted , check pinecone databse...`,
  );
}
const fileLocation = "../Tanishq_RAG _SYSTEM_PDF.pdf";
loadDocument(fileLocation);
