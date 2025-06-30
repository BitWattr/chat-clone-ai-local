/// <reference lib="deno.ns" />
// AnythingAI/worker/src/deno_adapter.ts

// Import AppBindings along with KvStore and AiClient
import app, { KvStore, AiClient, AppBindings } from './index.ts';
import { serve } from 'https://deno.land/std@0.207.0/http/server.ts';
import { ExecutionContext } from 'hono'; // Import ExecutionContext for type hinting
// Removed fs import, as it's no longer needed

// Simple Ollama client for Deno
class OllamaAiClient implements AiClient {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async run(model: string, options: { messages: Array<{ role: string; content: string }>, max_tokens: number }): Promise<{ response: string }> {
        const { messages } = options;
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model, // Use the configured model
                messages: messages,
                stream: false,
                options: {
                    num_ctx: 4096, // Example Ollama option
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: options.max_tokens, // Pass max_tokens to Ollama options
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        return { response: data.message.content };
    }
}

(async () => {
  // In-memory KV store for Deno local development
  class InMemoryKvStore implements KvStore {
    private store: Map<string, { value: string; expiration?: number }> = new Map();
    async get(key: string): Promise<string | null> {
      const entry = this.store.get(key);
      if (entry && (!entry.expiration || entry.expiration > Date.now())) {
        return entry.value;
      }
      this.store.delete(key); // Remove expired entry
      return null;
    }
    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
      const expiration = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
      this.store.set(key, { value, expiration });
    }
  }

  // Read config.json from the root directory using Deno APIs
  let config: { ollama_url: string; model_name: string } = {
    ollama_url: "http://localhost:11434",
    model_name: "llama3.2" // Use llama3.2 as the default fallback
  };
  try {
    let configPath = new URL("../../config.json", import.meta.url).pathname;
    if (Deno.build.os === "windows" && configPath.startsWith("/")) {
      configPath = configPath.slice(1);
    }
    configPath = decodeURIComponent(configPath);
    const configRaw = await Deno.readTextFile(configPath);
    const parsed = JSON.parse(configRaw);
    // Only override if values are present and valid
    config.ollama_url = parsed.ollama_url || config.ollama_url;
    config.model_name = parsed.model_name || config.model_name;
    console.log("Loaded Ollama config from config.json:", config);
  } catch (e) {
    console.warn("Could not read config.json, using defaults:", e);
  }

  const kvStore = new InMemoryKvStore();
  const ollamaBaseUrl = config.ollama_url;
  const ollamaModel = config.model_name;
  const aiClient = new OllamaAiClient(ollamaBaseUrl, ollamaModel);
  const honoEnv: AppBindings = { kvStore, aiClient };

  // Serve the Hono app using Deno's serve function, passing the honoEnv directly
  serve((request: Request) => app.fetch(request, honoEnv, {} as ExecutionContext)); // Cast empty object to ExecutionContext

  console.log(`Deno server is running on http://localhost:8000`);
  console.log(`Ollama API Base URL: ${ollamaBaseUrl}`);
  console.log(`Ollama Model: ${ollamaModel}`);
})();