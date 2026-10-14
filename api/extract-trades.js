import { handleExtractRequest } from '../server/extractEndpoint.mjs';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  await handleExtractRequest(req, res, process.env);
}
