// AnythingAI/worker/src/static_server.ts

import { serveDir } from 'https://deno.land/std@0.207.0/http/file_server.ts';
import { Hono } from 'hono';

export function setupStaticFileServing(app: Hono) {
    // Serve static files from the 'frontend/dist' directory.
    // Adjust the path '../../frontend/dist' based on your actual directory structure
    // relative to where the Deno executable will be run.
    app.get('*', async (c, next) => {
        const response = await serveDir(c.req.raw, {
            fsRoot: '../../frontend/dist', // Path to your React build output
            urlRoot: '', // Serve from the root path of the server
            quiet: true, // Suppress logging of served files
        });

        // If a static file is found, return it. Otherwise, continue to the next middleware (your API routes).
        if (response.status !== 404) {
            return response;
        }
        await next();
    });
}