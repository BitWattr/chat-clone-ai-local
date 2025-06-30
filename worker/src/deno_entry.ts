/// <reference lib="deno.ns" />

// AnythingAI/worker/src/deno_main.ts
// This is the main entry file for running the application in Deno.

// Import the Deno adapter which sets up the Hono app and starts the server.
import './deno_adapter.ts';

// No additional code is needed here, as deno_adapter.ts handles the server startup.
// You can run this file using: deno run --allow-net --allow-env deno_main.ts
// Ensure you have Deno installed.
// For Ollama, make sure it's running locally or accessible at the specified URL.
// Example environment variables for Deno:
// OLLAMA_API_BASE_URL=http://localhost:11434 OLLAMA_MODEL=llama2 deno run --allow-net --allow-env deno_main.ts
