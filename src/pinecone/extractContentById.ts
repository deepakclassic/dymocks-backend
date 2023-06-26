/* eslint-disable import/no-extraneous-dependencies */
import { PineconeClient } from '@pinecone-database/pinecone';

export async function contentByVectorId(namespace: string, id: string) {
  const pinecone = new PineconeClient();
  await pinecone.init({
    environment: process.env.ENVIRONMENT as string,
    apiKey: process.env.PINECONE_API_KEY as string
  });
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME as string);
  const fetchResponse: any = await index.fetch({
    ids: [id],
    namespace
  });
  return fetchResponse.vectors[id].metadata.text;
}
