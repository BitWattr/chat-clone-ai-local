// AnythingAI/worker/src/index.ts

// --- START: Merged ChatMessage and ChatSessionData Interfaces ---
export interface ChatMessage {
    timestamp: string;
    sender: string;
    message: string;
}

export interface ParsedChatData {
    messages: ChatMessage[];
    participants: string[];
}

export interface ChatSessionData {
    originalMessages: ChatMessage[];
    messages: ChatMessage[];
    participants: string[];
    createdAt: string;
}
// --- END: Merged ChatMessage and ChatSessionData Interfaces ---


// --- START: Merged parseWhatsAppChat function ---
export function parseWhatsAppChat(chatContent: string): ParsedChatData {
    const messages: ChatMessage[] = [];
    const participants = new Set<string>();

    // Original WhatsApp pattern
    const whatsAppMessageStartPattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)\s*-\s*([^:]+):\s*(.*)$/;

    // New pattern for "Sender: Message" format
    const simpleMessagePattern = /^([^:]+):\s*(.*)$/;

    let currentMessage: ChatMessage | null = null;
    let isWhatsAppFormat = false; // Flag to determine which format is being processed

    // First, try to parse as WhatsApp format
    for (const line of chatContent.split(/\r?\n/)) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            continue;
        }

        // Skip known WhatsApp informational messages
        if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
            continue;
        }
        if (trimmedLine.includes("Messages and calls are end-to-end encrypted")) {
            continue;
        }
        if (trimmedLine.includes("<Media omitted>")) {
            continue;
        }
        if (trimmedLine.toLowerCase().includes("(file attached)")) {
            continue;
        }
        if (trimmedLine.toLowerCase().includes("live location shared")) {
            continue;
        }
        if (trimmedLine.toLowerCase() === "null") {
            continue;
        }

        const match = trimmedLine.match(whatsAppMessageStartPattern);
        if (match) {
            isWhatsAppFormat = true;
            if (currentMessage) {
                messages.push(currentMessage);
                participants.add(currentMessage.sender);
            }
            const [, timestamp, sender, message] = match;
            currentMessage = { timestamp, sender, message };
        } else if (currentMessage && isWhatsAppFormat) {
            // Continuation of a WhatsApp message
            currentMessage.message += "\n" + trimmedLine;
        }
    }

    // If no WhatsApp formatted messages were found, try the simple format
    if (!isWhatsAppFormat || messages.length === 0) {
        messages.length = 0; // Clear any partial WhatsApp messages
        participants.clear(); // Clear any partial participants
        currentMessage = null; // Reset currentMessage

        for (const line of chatContent.split(/\r?\n/)) {
            const trimmedLine = line.trim();

            if (!trimmedLine) {
                continue;
            }

            const match = trimmedLine.match(simpleMessagePattern);
            if (match) {
                if (currentMessage) {
                    messages.push(currentMessage);
                    participants.add(currentMessage.sender);
                }
                const [, sender, message] = match;
                // For the "Sender: Message" format, we'll use a placeholder timestamp
                currentMessage = { timestamp: "UNKNOWN", sender, message };
            } else if (currentMessage) {
                // Continuation of the previous message for the simple format
                currentMessage.message += "\n" + trimmedLine;
            }
        }
    }

    // Push the last message after the loop finishes
    if (currentMessage) {
        messages.push(currentMessage);
        participants.add(currentMessage.sender);
    }

    // Ensure at least two distinct participants are identified for a valid chat session.
    if (participants.size < 2) {
        // If neither format yields two participants, throw an error.
        throw new Error("Could not identify two distinct participants in the chat.");
    }

    return { messages, participants: Array.from(participants) };
}
// --- END: Merged parseWhatsAppChat function ---

import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

// Abstracted interfaces for KV Store and AI Client
export interface KvStore {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface AiClient {
    run(model: string, options: { messages: Array<{ role: string; content: string }>, max_tokens: number }): Promise<{ response: string }>;
}

// Global environment and context for the Hono app
// Renamed to AppBindings to align with Hono's typical usage for environment variables
export interface AppBindings {
    kvStore: KvStore;
    aiClient: AiClient;
}

const SESSION_TIMEOUT_MINUTES = 15; // Session expiration time in minutes

// Define constants for token management
const MAX_CONTEXT_TOKENS = 8192; // Llama-2-7b-chat-int8 context window limit
const MAX_OUTPUT_TOKENS_RESERVE = 500; // Conservative reserve for AI's response
const TARGET_INPUT_TOKENS_ESTIMATE = 3800; // Effective MAX_INPUT_TOKENS for `estimateTokens` function

// --- START: DEMO CHAT HISTORY DATA ---
const DEMO_CHATS: { [key: string]: string } = {
    "family_chat": `01/01/24, 10:00 AM - Alice: Hey Bob! What's for dinner tonight?
01/01/24, 10:05 AM - Bob: I was thinking pizza, but open to suggestions!
01/01/24, 10:10 AM - Alice: Pizza sounds great! Or maybe some pasta?
01/01/24, 10:15 AM - Bob: Pasta is good too! Let's do pasta then. I'll start prepping.
01/01/24, 10:20 AM - Alice: Perfect, I'll set the table. Do we have enough garlic bread?
01/01/24, 10:25 AM - Bob: Yep, just checked! Plenty for both of us.
01/01/24, 10:30 AM - Alice: Awesome! Can't wait.
01/01/24, 10:35 AM - Bob: Me neither! Almost done with the sauce.`,

    "work_discussion": `02/01/24, 09:00 AM - Project Lead: Sarah, quick sync on the Q2 report.
02/01/24, 09:05 AM - Sarah: Got it. I've updated the marketing section.
02/01/24, 09:10 AM - Project Lead: Excellent. Can you share the presentation draft by EOD?
02/01/24, 09:15 AM - Sarah: Will do! I'm just polishing the executive summary.
02/01/24, 09:20 AM - Project Lead: Sounds good. Let me know if you run into any roadblocks.
02/01/24, 09:25 AM - Sarah: Will do, thanks! I'm on track for the deadline.
02/01/24, 09:30 AM - Project Lead: Great to hear. Looking forward to reviewing it.
02/01/24, 09:35 AM - Sarah: Thanks! I'll send it over as soon as it's finalized.`,

    "study_chat": `03/01/24, 02:00 PM - John: Hey Emily, are you free to study for the chemistry exam later?
03/01/24, 02:05 PM - Emily: Hi John! Yes, I was just about to text you. How about 4 PM at the library?
03/01/24, 02:10 PM - John: 4 PM works perfectly for me. Should we focus on organic chemistry first?
03/01/24, 02:15 PM - Emily: Good idea, that's where I'm struggling the most. I'll bring my notes on reactions.
03/01/24, 02:20 PM - John: Perfect! I'll review the acids and bases section before then.
03/01/24, 02:25 PM - Emily: Sounds like a plan. See you there!
03/01/24, 02:30 PM - John: See you, Emily! Don't forget your calculator.
03/01/24, 02:35 PM - Emily: Oh, good call! Almost forgot. Thanks!`,
};
// --- END: DEMO CHAT HISTORY DATA ---


// --- START: MODIFIED CORS LOGIC ---
// Define allowed origins for your frontend
const ALLOWED_ORIGINS = [
    'http://localhost:3000', // For local development of your frontend
    'https://chat-clone-ai.pages.dev', // Replace with your actual Cloudflare Pages domain!
    // Add other frontend domains if applicable, e.g., 'https://www.yourdomain.com'
];

// Helper function to dynamically set CORS headers based on the request origin.
function getCorsHeaders(origin: string) {
    const headers: { [key: string]: string } = {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-chat-session-id', // Allow x-chat-session-id header
        'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
    };

    if (ALLOWED_ORIGINS.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    } else {
        // Fallback for origins not explicitly in ALLOWED_ORIGINS (e.g., direct worker access)
        // You might want to remove this else block for stricter security in production
        headers['Access-Control-Allow-Origin'] = '*';
    }
    return headers;
}
// --- END: MODIFIED CORS LOGIC ---

// Helper function to estimate token count from a string
function estimateTokens(text: string): number {
    // A common heuristic: 1 token ~= 4 characters for English text.
    // This is an estimate, and actual token counts can vary by model.
    return Math.ceil(text.length / 4);
}

// Function to truncate messages to fit within the token limit
function truncateMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    systemPromptTokens: number,
    maxInputTokens: number
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    let currentTokens = systemPromptTokens;
    const truncatedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Iterate messages in reverse to keep the most recent ones
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const messageContent = message.content;
        let messageTokens = estimateTokens(message.role) + estimateTokens(messageContent); // Estimate tokens for role and content

        // If adding this message exceeds the limit, try truncating the message itself
        if (currentTokens + messageTokens > maxInputTokens) {
            const remainingTokens = maxInputTokens - currentTokens;
            if (remainingTokens <= 0) {
                // No space left, stop adding messages
                break;
            }

            // Estimate how many characters we can keep
            const estimatedCharsToKeep = Math.floor(remainingTokens * 4);
            let truncatedContent = messageContent.substring(messageContent.length - estimatedCharsToKeep);

            // Add an ellipsis if the message was actually truncated
            if (truncatedContent.length < messageContent.length) {
                truncatedContent = `...${truncatedContent}`;
            }

            truncatedMessages.unshift({ role: message.role, content: truncatedContent });
            currentTokens += estimateTokens(message.role) + estimateTokens(truncatedContent);
            break; // Stop after truncating one message
        } else {
            truncatedMessages.unshift(message);
            currentTokens += messageTokens;
        }
    }
    return truncatedMessages;
}

// Initialize Hono with AppBindings for direct access to environment variables
const app = new Hono<{ Bindings: AppBindings }>();

// Middleware for CORS preflight requests
app.options('*', async (c) => {
    const requestOrigin = c.req.header('Origin') || '';
    return new Response(null, {
        headers: getCorsHeaders(requestOrigin),
        status: 204, // No content for successful preflight
    });
});

// 1. POST /upload_chat_history (Existing endpoint for user file uploads)
app.post('/upload_chat_history', async (c) => {
    // Access kvStore directly from c.env
    const { kvStore } = c.env;
    const requestOrigin = c.req.header('Origin') || '';
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string' || !file.name) {
            return c.json({ detail: 'No file uploaded or invalid file type.' }, 400, getCorsHeaders(requestOrigin));
        }

        const fileText = await (file as File).text();
        const { messages, participants } = parseWhatsAppChat(fileText);

        const sessionId = uuidv4();

        const sessionData: ChatSessionData = {
            originalMessages: messages,
            messages: [],
            participants: Array.from(participants),
            createdAt: new Date().toISOString(),
        };

        await kvStore.put(sessionId, JSON.stringify(sessionData), {
            expirationTtl: SESSION_TIMEOUT_MINUTES * 60,
        });

        return c.json({
            message: 'Chat history uploaded and processed successfully!',
            sessionId,
            participants: Array.from(participants),
        }, 200, getCorsHeaders(requestOrigin));

    } catch (e: any) {
        console.error('Error processing upload:', e);
        return c.json({ detail: `Error processing file: ${e.message}` }, 500, getCorsHeaders(requestOrigin));
    }
});

// 2. GET /get_demo_chats (New endpoint to list available demos)
app.get('/get_demo_chats', async (c) => {
    const requestOrigin = c.req.header('Origin') || '';
    try {
        const demoNames = Object.keys(DEMO_CHATS);
        return c.json({
            demos: demoNames.map(name => ({ id: name, name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
        }, 200, getCorsHeaders(requestOrigin));
    } catch (e: any) {
        console.error('Error getting demo chats:', e);
        return c.json({ detail: `Error getting demo chats: ${e.message}` }, 500, getCorsHeaders(requestOrigin));
    }
});

// 3. POST /load_demo_chat (New endpoint to load a specific demo chat)
app.post('/load_demo_chat', async (c) => {
    // Access kvStore directly from c.env
    const { kvStore } = c.env;
    const requestOrigin = c.req.header('Origin') || '';
    try {
        const { demoId } = await c.req.json();

        if (!demoId || !DEMO_CHATS[demoId]) {
            return c.json({ detail: 'Invalid demo ID provided.' }, 400, getCorsHeaders(requestOrigin));
        }

        const demoChatContent = DEMO_CHATS[demoId];
        const { messages, participants } = parseWhatsAppChat(demoChatContent);

        const sessionId = uuidv4();

        const sessionData: ChatSessionData = {
            originalMessages: messages,
            messages: [],
            participants: Array.from(participants),
            createdAt: new Date().toISOString(),
        };

        await kvStore.put(sessionId, JSON.stringify(sessionData), {
            expirationTtl: SESSION_TIMEOUT_MINUTES * 60,
        });

        return c.json({
            message: `Demo chat '${demoId}' loaded successfully!`,
            sessionId,
            participants: Array.from(participants),
        }, 200, getCorsHeaders(requestOrigin));

    } catch (e: any) {
        console.error('Error loading demo chat:', e);
        return c.json({ detail: `Error loading demo chat: ${e.message}` }, 500, getCorsHeaders(requestOrigin));
    }
});

// 4. GET /get_chat_history/:sessionId (Existing endpoint)
app.get('/get_chat_history/:sessionId', async (c) => {
    // Access kvStore directly from c.env
    const { kvStore } = c.env;
    const requestOrigin = c.req.header('Origin') || '';
    const sessionId = c.req.param('sessionId');
    const persona = c.req.query('persona');

    if (!sessionId) {
        return c.json({ detail: 'Session ID is required.' }, 400, getCorsHeaders(requestOrigin));
    }
    if (!persona) {
        return c.json({ detail: 'Persona is required.' }, 400, getCorsHeaders(requestOrigin));
    }

    try {
        const sessionDataString = await kvStore.get(sessionId);
        if (!sessionDataString) {
            return c.json({ detail: 'Session not found or expired. please upload chat history file again' }, 404, getCorsHeaders(requestOrigin));
        }

        const sessionData: ChatSessionData = JSON.parse(sessionDataString);
        if (sessionData.messages.length === 0) {
            sessionData.messages = sessionData.originalMessages;
            await kvStore.put(sessionId, JSON.stringify(sessionData), {
                expirationTtl: SESSION_TIMEOUT_MINUTES * 60,
            });
        }

        return c.json({
            messages: sessionData.messages,
            participants: sessionData.participants,
        }, 200, getCorsHeaders(requestOrigin));

    } catch (e: any) {
        console.error('Error fetching chat history:', e);
        return c.json({ detail: `Error fetching chat history: ${e.message}` }, 500, getCorsHeaders(requestOrigin));
    }
});

// 5. POST /chat/:sessionId (Existing endpoint)
app.post('/chat/:sessionId', async (c) => {
    // Access kvStore and aiClient directly from c.env
    const { kvStore, aiClient } = c.env;
    const requestOrigin = c.req.header('Origin') || '';
    const sessionId = c.req.param('sessionId');
    const persona = c.req.query('persona');

    if (!sessionId) {
        return c.json({ detail: 'Session ID is required.' }, 400, getCorsHeaders(requestOrigin));
    }
    if (!persona) {
        return c.json({ detail: 'Persona is required.' }, 400, getCorsHeaders(requestOrigin));
    }

    try {
        const sessionDataString = await kvStore.get(sessionId);
        if (!sessionDataString) {
            return c.json({ detail: 'Session not found or expired.' }, 404, getCorsHeaders(requestOrigin));
        }

        const sessionData: ChatSessionData = JSON.parse(sessionDataString);
        const { message: userMessage } = await c.req.json();

        const otherParticipant = sessionData.participants.find(p => p !== persona);
        if (!otherParticipant) {
            return c.json({ detail: 'Could not determine the "You" participant.' }, 400, getCorsHeaders(requestOrigin));
        }

        const newUserMessageForSession: ChatMessage = {
            sender: otherParticipant,
            message: userMessage,
            timestamp: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) +
                        `, ` +
                        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        };
        sessionData.messages.push(newUserMessageForSession);

        const systemPrompt = `You are mimicking ${persona}. Your responses should be in the style of ${persona}. Keep responses concise and relevant to the conversation. Based on the following chat history, continue the conversation as ${persona}.`;
        const systemPromptTokens = estimateTokens(systemPrompt);

        const messagesForAIModel: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = sessionData.messages.map(msg => ({
            role: msg.sender === persona ? 'assistant' : 'user',
            content: msg.message
        }));

        const fullConversationForAI = [
            { role: 'system', content: systemPrompt },
            ...messagesForAIModel,
        ];

        const messagesToConsiderForPrompt = truncateMessages(
            fullConversationForAI,
            systemPromptTokens,
            TARGET_INPUT_TOKENS_ESTIMATE - MAX_OUTPUT_TOKENS_RESERVE
        );

        const aiResponse = await aiClient.run(
            '@cf/meta/llama-2-7b-chat-int8',
            {
                messages: messagesToConsiderForPrompt,
                max_tokens: MAX_OUTPUT_TOKENS_RESERVE,
            }
        );
        const aiResponseContent = aiResponse.response;

        if (!aiResponseContent) {
            console.error("no response from ai");
            return c.json({ detail: 'AI did not return a valid response.' }, 500, getCorsHeaders(requestOrigin));
        }

        const new_ai_message_entry_for_session: ChatMessage = {
            sender: persona,
            message: aiResponseContent,
            timestamp: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) +
                        `, ` +
                        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        };

        sessionData.messages.push(new_ai_message_entry_for_session);

        await kvStore.put(sessionId, JSON.stringify(sessionData), {
            expirationTtl: SESSION_TIMEOUT_MINUTES * 60,
        });

        return c.json({ response: aiResponseContent }, 200, getCorsHeaders(requestOrigin));
    } catch (e: any) {
        console.error('Error generating response:', e);
        return c.json({ detail: `Error generating response: ${e.message}` }, 500, getCorsHeaders(requestOrigin));
    }
});

export default app;