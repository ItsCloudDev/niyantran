#!/usr/bin/env node
import http from 'node:http';
import { serveFeatureFeed } from '../server/featureFeed.mjs';

const PORT = Number(process.env.FEED_PORT || 8788);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname !== '/api/feature-feed') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('not found');
    return;
  }
  try {
    const body = await serveFeatureFeed(url.searchParams);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`feature-feed http://127.0.0.1:${PORT}/api/feature-feed`);
});
