import { defineConfig, loadEnv } from 'vite';
import { handleExtractRequest } from './server/extractEndpoint.mjs';

function mt5ApiPlugin(env) {
  return {
    name: 'mt5-extract-api',
    configureServer(server) {
      server.middlewares.use('/api/extract-trades', (req, res) => {
        handleExtractRequest(req, res, env).catch(err => {
          console.error('[mt5-extract-dev]', err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, code: 'SERVER_ERROR', error: 'Server error while processing the screenshot.' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [mt5ApiPlugin(env)],
  };
});
