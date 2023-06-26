/* eslint-disable import/no-extraneous-dependencies */

import { PineconeClient } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import fetch from 'node-fetch';

async function fetchByRequest(options: {
  method: string;
  headers: { accept: string; 'content-type': string; 'Api-Key': string };
  body: string;
}) {
  const response = await fetch(
    `${process.env.PINECONE_DB_URL}/vectors/upsert` as string,
    options
  );

  const data = await response.json();
  return data;
}

export async function createEmbedding(options: {
  method: string;
  headers: {
    accept: string;
    'content-type': string;
    Authorization: string;
  };
  body: string;
}) {
  const response = await fetch(
    `${process.env.OPENAI_URL}/embeddings` as string,
    options
  );
  const data = await response.json();
  return data;
}

async function addVectors(
  vectors: number[],
  documents: { pageContent: string }[],
  index: number,
  namespace: string,
  title: string
) {
  const upsertRequest = {
    vectors: vectors.map((values: number, idx: number) => {
      const text: string = documents[idx].pageContent;
      return {
        id: `${idx}_${index}`,
        metadata: {
          title,
          text
        },
        values
      };
    })
  };

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'Api-Key': process.env.PINECONE_API_KEY as string
    },
    body: JSON.stringify({
      vectors: upsertRequest.vectors,
      namespace
    })
  };
  return fetchByRequest(options);
}

async function addDocuments(
  documents: { pageContent: string }[],
  index: number,
  namespace: string,
  title: string
) {
  const texts = documents.map(({ pageContent }) => pageContent);
  const options = {
    method: 'POST',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_APIKEY}`
    },
    body: JSON.stringify({
      input: texts,
      model: 'text-embedding-ada-002'
    })
  };
  const embedding = await createEmbedding(options);
  return addVectors(
    [embedding.data[0].embedding],
    documents,
    index,
    namespace,
    title
  );
}
export async function createVectorIndex(
  inputText: {
    title: string;
    content: string;
  },
  namespace: string,
  index: number
) {
  const pinecone = new PineconeClient();
  try {
    // initialise the pincone client with configurations keys

    await pinecone.init({
      environment: process.env.ENVIRONMENT as string,
      apiKey: process.env.PINECONE_API_KEY as string
    });
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 100000
    });
    const docs: { pageContent: string }[] = await textSplitter.createDocuments([
      inputText.content
    ]);
    const resultofAddDoc = await addDocuments(
      docs,
      index,
      namespace,
      inputText.title
    );
    return resultofAddDoc;
  } catch (error) {
    console.log('error---------->', error);
    throw new Error('Failed to ingest your data');
  }
}
