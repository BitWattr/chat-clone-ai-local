from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from dotenv import load_dotenv
import asyncio
from datetime import datetime, timedelta
import secrets
import re
from contextlib import asynccontextmanager

# Local imports
from chat_parser import parse_whatsapp_chat
from llm_service import get_ollama_response

load_dotenv()

# In-memory storage for chat data after parsing.
# {session_id: {"participants": ["Arjun", "Ramesh"], "messages": [...], "last_access_time": datetime_object}}
parsed_chat_data = {}

# Session timeout in minutes
SESSION_TIMEOUT_MINUTES = 1
cleanup_task = None # To hold the reference to the cleanup task

async def cleanup_sessions():
    """
    Periodically removes inactive sessions from memory.
    """
    try:
        while True:
            await asyncio.sleep(15)  # Check every 60 seconds
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
        await cleanup_task
    print("DEBUG: Cleanup task cancelled during shutdown.")


app = FastAPI(lifespan=lifespan) # Pass the lifespan context manager to FastAPI

# Configure CORS
origins = [
    "http://localhost:3000",  # React app
    "http://127.0.0.1:3000",  # React app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# New health check endpoint
@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "ok"})


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

        messages, participants = parse_whatsapp_chat_from_string(decoded_content)

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
    
    message_start_pattern = re.compile(r"^(\d{1,2}/\d{1,2}/\d{2}, \d{1,2}:\d{2}\s(?:AM|PM)) - ([^:]+): (.*)$")

    current_message = None

    for line in chat_content.splitlines():
        line = line.strip()

        if not line:
            continue
        
        if line.startswith("[") and line.endswith("]"):
            continue

        match = message_start_pattern.match(line)
        if match:
            if current_message:
                messages.append(current_message)
                participants.add(current_message["sender"])

            timestamp, sender, message = match.groups()
            current_message = {"timestamp": timestamp, "sender": sender, "message": message}
        elif current_message:
            current_message["message"] += "\n" + line
    
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
            model=os.getenv("LLM_MODEL"),
            system_prompt=system_prompt,
            conversation_history=conversation_messages_for_llm
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)