import re

def parse_whatsapp_chat(file_path: str):
    messages = []
    participants = set()

    # Updated pattern to be more flexible with whitespace and handle common WhatsApp export nuances
    # This regex now accounts for various whitespace characters including non-breaking spaces
    # It also supports both 12-hour (AM/PM) and 24-hour time formats, and different date formats.
    # The original Python regex was: r"^(\d{1,2}/\d{1,2}/\d{2}, \d{1,2}:\d{2}\s(?:AM|PM)) - ([^:]+): (.*)$"
    # The TypeScript regex: /^(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)\s*-\s*([^:]+):\s*(.*)$/;
    # Porting to Python, handling backslashes and non-capturing groups for AM/PM flexibility
    message_start_pattern = re.compile(r"^(\d{1,2}/\d{1,2}/\d{2,4}, \d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)\s*-\s*([^:]+):\s*(.*)$")

    current_message = None

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            trimmed_line = line.strip()

            if not trimmed_line:
                continue

            # Handle common WhatsApp informational messages that do not represent a chat message.
            # This includes messages about encryption, media omitted, and other system notifications.
            if trimmed_line.startswith("[") and trimmed_line.endswith("]"):
                continue
            if "Messages and calls are end-to-end encrypted" in trimmed_line:
                continue
            if "<Media omitted>" in trimmed_line:
                continue
            if "(file attached)" in trimmed_line.lower():
                continue
            if "live location shared" in trimmed_line.lower():
                continue
            if trimmed_line.lower() == "null":
                continue


            match = message_start_pattern.match(trimmed_line)
            if match:
                # If a new message starts, store the previous one if it exists
                if current_message:
                    messages.append(current_message)
                    participants.add(current_message["sender"])

                timestamp, sender, message = match.groups()
                current_message = {"timestamp": timestamp, "sender": sender, "message": message}
            elif current_message:
                # If it's not a new message start, and we have a current message being built,
                # append the line to the current message content.
                # Add a newline character to preserve multi-line formatting.
                current_message["message"] += "\n" + trimmed_line
    
        # After the loop, append the last message if it exists
        if current_message:
            messages.append(current_message)
            participants.add(current_message["sender"])

    # Ensure at least two distinct participants are identified for a valid chat session.
    if len(participants) < 2:
        raise ValueError("Could not identify two distinct participants in the chat.")

    return {"messages": messages, "participants": list(participants)}
