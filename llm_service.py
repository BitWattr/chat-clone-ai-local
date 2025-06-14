import ollama
import os
from dotenv import load_dotenv

load_dotenv()

# Remove these global variables, they will be passed as arguments
# OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
# LLM_MODEL = os.getenv("LLM_MODEL", "gemma3") # Default to llama3

async def get_ollama_response(model: str, system_prompt: str, conversation_history: list, ollama_host: str = "http://localhost:11434"):
    """
    Sends a conversation to Ollama and gets a response.
    conversation_history should be a list of dicts with 'role' and 'content'.
    """
    messages = [{"role": "system", "content": system_prompt}] + conversation_history
    print("prompt is: ", messages)
    try:
        # Use the asynchronous client for better performance in FastAPI
        client = ollama.AsyncClient(host=ollama_host) # Use the passed ollama_host
        response = await client.chat(model=model, messages=messages)
        return response['message']['content']
    except ollama.ResponseError as e:
        print(f"Ollama Response Error: {e.error}")
        raise e
    except Exception as e:
        print(f"An unexpected error occurred with Ollama: {e}")
        raise e

if __name__ == "__main__":
    # Example usage (for testing)
    async def test_ollama():
        system_prompt = "You are a helpful assistant."
        conversation = [
            {"role": "user", "content": "What is the capital of France?"}
        ]
        try:
            # Pass default host for testing
            response = await get_ollama_response("llama3", system_prompt, conversation, "http://localhost:11434")
            print(f"Ollama Response: {response}")
        except Exception as e:
            print(f"Test failed: {e}")

    import asyncio
    asyncio.run(test_ollama())