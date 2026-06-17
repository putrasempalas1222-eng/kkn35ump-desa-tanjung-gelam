import { onRequest } from 'firebase-functions/v2/https';
import app from './server.js';

export const apiDataKkn35 = onRequest(
  {
    region: 'asia-southeast2',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 10,
  },
  app
);
