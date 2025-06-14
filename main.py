from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import json
from dotenv import load_dotenv
import asyncio
from datetime import datetime, timedelta
import secrets
import re
from contextlib import asynccontextmanager
import webbrowser
import uvicorn
import sys # Import sys for PyInstaller path handling

# Local imports (ensure these are available or remove if not needed for this example)
try:
    # We will no longer use parse_whatsapp_chat from chat_parser as it's in main.py
    from llm_service import get_ollama_response
except ImportError:
    # Fallback for environments where these might not be separate files
    print("Warning: llm_service.py not found. Ensuring dummy functions are defined.")
    # Define dummy functions if imports fail
    async def get_ollama_response(model, system_prompt, conversation_history, ollama_host):
        print("Using dummy get_ollama_response")
        return "Dummy LLM response."


load_dotenv()

# --- Settings Management ---
SETTINGS_FILE = "settings.json"

def load_settings():
    """Loads settings from a JSON file."""
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    return {
        "ollama_host": os.getenv("OLLAMA_HOST", "http://localhost:11434"),
        "llm_model": os.getenv("LLM_MODEL", "gemma2") # Changed default model to gemma2
    }

def save_settings(settings):
    """Saves settings to a JSON file."""
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=4)

# Load initial settings at startup
app_settings = load_settings()
# --- End Settings Management ---


# In-memory storage for chat data after parsing.
# {session_id: {"participants": ["Arjun", "Ramesh"], "messages": [...], "last_access_time": datetime_object}}
parsed_chat_data = {}

# Session timeout in minutes
SESSION_TIMEOUT_MINUTES = 30
cleanup_task = None # To hold the reference to the cleanup task

async def cleanup_sessions():
    """
    Periodically removes inactive sessions from memory.
    """
    try:
        while True:
            await asyncio.sleep(10)  # Check every 15 seconds (reduced for quicker testing)
            current_time = datetime.now()
            sessions_to_remove = []

            print(f"DEBUG: Running cleanup at {current_time.strftime('%Y-%m-%d %H:%M:%S')}. Current active sessions: {len(parsed_chat_data)}")

            for session_id, data in parsed_chat_data.items():
                if "last_access_time" in data and (current_time - data["last_access_time"]) > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
                    sessions_to_remove.append(session_id)
            
            for session_id in sessions_to_remove:
                del parsed_chat_data[session_id]
                print(f"DEBUG: Removed inactive session: {session_id}")
            
            print(f"DEBUG: Cleanup complete. Remaining sessions: {len(parsed_chat_data)}")
    except asyncio.CancelledError:
        print("DEBUG: Cleanup task cancelled.")
        pass # Task cancelled on shutdown

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    global cleanup_task
    cleanup_task = asyncio.create_task(cleanup_sessions())
    print("DEBUG: Cleanup task scheduled during startup.")
    yield
    # Shutdown logic
    if cleanup_task:
        cleanup_task.cancel()
        try:
            await cleanup_task # Wait for the task to actually finish cancelling
        except asyncio.CancelledError:
            pass # Expected when cancelling
    print("DEBUG: Cleanup task cancelled during shutdown.")


app = FastAPI(lifespan=lifespan) # Pass the lifespan context manager to FastAPI

# Configure CORS
origins = [
    "http://localhost:3000",  # React app in development
    "http://127.0.0.1:3000",  # React app in development
    "http://localhost:8000",  # Your application's own host when served statically
    "http://127.0.0.1:8000",  # Your application's own host when served statically
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define all your API endpoints FIRST
@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "ok"})

# --- New Settings Endpoints ---
@app.get("/settings")
async def get_current_settings():
    """Retrieves the current Ollama host and model settings."""
    return JSONResponse(content=app_settings)

@app.post("/settings")
async def update_settings(new_settings: dict):
    """Updates the Ollama host and model settings."""
    global app_settings
    
    ollama_host = new_settings.get("ollama_host")
    llm_model = new_settings.get("llm_model")

    if not ollama_host or not llm_model:
        raise HTTPException(status_code=400, detail="Both 'ollama_host' and 'llm_model' are required.")

    app_settings["ollama_host"] = ollama_host
    app_settings["llm_model"] = llm_model
    save_settings(app_settings)
    print(f"DEBUG: Settings updated to: {app_settings}")
    return JSONResponse(content={"message": "Settings updated successfully!", "current_settings": app_settings})
# --- End New Settings Endpoints ---


@app.post("/upload_chat_history/")
async def upload_chat_history(file: UploadFile = File(...)):
    """
    Uploads a WhatsApp chat history file and parses it.
    The file content is processed in-memory and not stored on the server's disk.
    A unique session ID is generated for access control.
    """
    try:
        content = await file.read()
        decoded_content = content.decode("utf-8")

        messages, participants = parse_whatsapp_chat_from_string(decoded_content) # Using local function

        if not participants or len(participants) < 2:
            raise HTTPException(status_code=400, detail="Could not identify two distinct participants in the chat.")

        session_id = secrets.token_urlsafe(32)

        parsed_chat_data[session_id] = {
            "participants": list(participants),
            "messages": messages,
            "last_access_time": datetime.now()
        }
        print(f"DEBUG: Chat session '{session_id}' stored in memory. Participants: {list(participants)}. Initial access time: {parsed_chat_data[session_id]['last_access_time']}")
        print(f"DEBUG: Current parsed_chat_data keys: {parsed_chat_data.keys()}")

        return JSONResponse(content={
            "message": "Chat history processed successfully! File not stored on server.",
            "session_id": session_id,
            "participants": list(participants)
        })
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not decode file. Please ensure it's a UTF-8 encoded text file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

def parse_whatsapp_chat_from_string(chat_content: str):
    messages = []
    participants = set()
    
    # Updated regex to correctly capture the timestamp, sender, and message
    # Handles cases where timestamp might be MM/DD/YY or DD/MM/YY
    # And ensures the sender part is correctly matched before the colon and message
    message_start_pattern = re.compile(r"^(\d{1,2}/\d{1,2}/\d{2}, \d{1,2}:\d{2}\s(?:AM|PM)) - ([^:]+): (.*)$")

    current_message = None

    for line in chat_content.splitlines():
        line = line.strip()

        if not line:
            continue
        
        # Skip lines that look like system messages, e.g., encryption notices
        if line.startswith("[") and line.endswith("]"):
            continue

        match = message_start_pattern.match(line)
        if match:
            if current_message:
                messages.append(current_message)
                participants.add(current_message["sender"])

            timestamp, sender, message = match.groups()
            current_message = {"timestamp": timestamp, "sender": sender.strip(), "message": message.strip()}
        elif current_message:
            # This line is a continuation of the previous message
            current_message["message"] += "\n" + line.strip()
    
    if current_message:
        messages.append(current_message)
        participants.add(current_message["sender"])

    return messages, participants

@app.get("/get_chat_history/{session_id}")
async def get_chat_history(session_id: str, persona: str = Query(...)):
    """
    Retrieves the chat history for a given session and persona.
    """
    if session_id not in parsed_chat_data:
        raise HTTPException(status_code=404, detail="Chat session not found or expired.")

    parsed_chat_data[session_id]["last_access_time"] = datetime.now()
    print(f"DEBUG: Session '{session_id}' accessed via get_chat_history. Updated last_access_time.")

    chat_data = parsed_chat_data[session_id]
    
    # You might want to add a check here if the provided persona actually exists in the chat
    if persona not in chat_data["participants"]:
        raise HTTPException(status_code=400, detail=f"Persona '{persona}' not found in this chat.")

    return JSONResponse(content={"messages": chat_data["messages"]})

@app.post("/chat/{session_id}")
async def chat_with_persona(session_id: str, user_message: dict, persona: str = Query(...)):
    """
    Interacts with the LLM, acting as the specified persona, and remembers the live chat.
    Access is controlled by the session_id.
    """
    print(f"DEBUG: Received chat request for session_id='{session_id}', persona='{persona}'")
    print(f"DEBUG: Current parsed_chat_data keys: {parsed_chat_data.keys()}")
    
    if session_id not in parsed_chat_data:
        print(f"DEBUG: Session '{session_id}' NOT found in parsed_chat_data. Unauthorized access or expired session.")
        raise HTTPException(status_code=404, detail="Chat session not found or expired. Please upload chat history again.")

    parsed_chat_data[session_id]["last_access_time"] = datetime.now()
    print(f"DEBUG: Session '{session_id}' accessed via chat endpoint. Updated last_access_time.")

    current_chat_messages = parsed_chat_data[session_id]["messages"]
    participants = parsed_chat_data[session_id]["participants"]

    if persona not in participants:
        raise HTTPException(status_code=400, detail=f"Persona '{persona}' not found in this chat for session '{session_id}'.")

    other_participant = next((p for p in participants if p != persona), None)
    if not other_participant:
        raise HTTPException(status_code=500, detail="Could not identify the other participant.")

    current_time = datetime.now().strftime("%m/%d/%y, %I:%M %p")
    new_user_message_entry = {
        "timestamp": current_time,
        "sender": other_participant,
        "message": user_message.get('message')
    }
    current_chat_messages.append(new_user_message_entry)

    conversation_messages_for_llm = []
    
    for msg in current_chat_messages:
        # Determine the role for the LLM based on who the message is from
        # If the sender is the 'other_participant', it's a 'user' message to the LLM.
        # If the sender is the 'persona' (the one the LLM is acting as), it's an 'assistant' message.
        role = "user" if msg["sender"] == other_participant else "assistant"
        conversation_messages_for_llm.append({"role": role, "content": f"{msg['message']}"})

    system_prompt = (
        f"You are now acting as '{persona}' in a WhatsApp conversation. "
        f"The conversation is with '{other_participant}'. "
        "Your responses should be natural, coherent, and in character based on the provided chat history. "
        "Keep your responses concise and relevant to the last message. "
        "Do not explicitly state who you are or who you are talking to. Just respond as if you are that person."
    )
    
    try:
        response_content = await get_ollama_response(
            model=app_settings["llm_model"], # Use the model from settings
            system_prompt=system_prompt,
            conversation_history=conversation_messages_for_llm,
            ollama_host=app_settings["ollama_host"] # Use the host from settings
        )
        
        new_ai_message_entry = {
            "timestamp": datetime.now().strftime("%m/%d/%y, %I:%M %p"),
            "sender": persona,
            "message": response_content
        }
        current_chat_messages.append(new_ai_message_entry)

        return JSONResponse(content={"response": response_content})
    except Exception as e:
        if current_chat_messages and current_chat_messages[-1] == new_user_message_entry:
            current_chat_messages.pop()
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

# Determine the base path for static files, considering PyInstaller
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    # sys._MEIPASS is the path to the temporary folder where PyInstaller unpacks the app
    bundle_dir = sys._MEIPASS
else:
    # Running in a regular Python environment
    # Use the directory where the script itself is located
    bundle_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the full path to your React build directory
# Assuming 'frontend/build' is relative to your main.py in dev,
# and relative to sys._MEIPASS in the bundle if you used --add-data "frontend/build;frontend/build"
STATIC_FILES_DIR = os.path.join(bundle_dir, "frontend", "build")

# Mount your static files.
if os.path.isdir(STATIC_FILES_DIR):
    app.mount("/", StaticFiles(directory=STATIC_FILES_DIR, html=True), name="static")
    print(f"DEBUG: Static files mounted from {STATIC_FILES_DIR}")
else:
    print(f"WARNING: Static files directory '{STATIC_FILES_DIR}' not found. Ensure your React app is built and placed correctly.")
    print("If you are running in development, you might be accessing the React app directly.")


if __name__ == "__main__":
    HOST = "127.0.0.1" # Use 127.0.0.1 for local access only
    PORT = 8000
    APP_URL = f"http://{HOST}:{PORT}"

    print(f"Starting application on: {APP_URL}")
    print("Opening browser...")

    # Open the browser to the application URL
    webbrowser.open(APP_URL)

    # Run the FastAPI application using uvicorn
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")