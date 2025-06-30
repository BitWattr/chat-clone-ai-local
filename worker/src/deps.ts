// worker/src/deps.ts
export { Hono } from 'hono';
export { serveStatic } from 'https://deno.land/x/hono@v4.2.3/middleware.ts'; // Check for the latest version
// You might also need this for Deno's HTTP server
export { serve } from 'https://deno.land/std@0.207.0/http/server.ts';