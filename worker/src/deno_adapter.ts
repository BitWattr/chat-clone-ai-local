// AnythingAI/worker/src/deno_adapter.ts

// Import AppBindings along with KvStore and AiClient
import app, { KvStore, AiClient, AppBindings } from './index.ts';
import { serve } from 'https://deno.land/std@0.207.0/http/server.ts';
import { ExecutionContext } from 'hono'; // Import ExecutionContext for type hinting

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

        const data = await response.json();
        return { response: data.message.content };
    }
}

const kvStore = new InMemoryKvStore();
const ollamaBaseUrl = Deno.env.get('OLLAMA_API_BASE_URL') || 'http://localhost:11434';
const ollamaModel = Deno.env.get('OLLAMA_MODEL') || 'llama3.2'; // Default Ollama model
const aiClient = new OllamaAiClient(ollamaBaseUrl, ollamaModel);

// Create the environment object to pass to Hono's fetch
const honoEnv: AppBindings = { kvStore, aiClient };

// Serve the Hono app using Deno's serve function, passing the honoEnv directly
serve((request: Request) => app.fetch(request, honoEnv, {} as ExecutionContext)); // Cast empty object to ExecutionContext

console.log(`Deno server is running on http://localhost:8000`);
console.log(`Ollama API Base URL: ${ollamaBaseUrl}`);
console.log(`Ollama Model: ${ollamaModel}`);