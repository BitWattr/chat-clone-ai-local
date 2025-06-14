import re

def parse_whatsapp_chat(file_path: str):
    messages = []
    participants = set()
    
    # Regex to match WhatsApp chat lines.
    # It captures:
    # Group 1: Timestamp (e.g., "5/14/25, 2:08 PM") - flexible for single/double digits and AM/PM.
    # Group 2: Sender Name (e.g., "+91 95734 99491" or "/-\ |< $ h @ ¥") - captures any characters until the colon.
    # Group 3: Message content - captures the rest of the line.
    # The pattern is anchored to the start of the line (^) for precise matching of new messages.
    message_start_pattern = re.compile(r"^(\d{1,2}/\d{1,2}/\d{2}, \d{1,2}:\d{2}\s(?:AM|PM)) - ([^:]+): (.*)$")

    current_message = None

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue
            
            if line.startswith("[") and line.endswith("]"):
                continue

            match = message_start_pattern.match(line)
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
                current_message["message"] += "\n" + line
    
        # After the loop, append the last message if it exists
        if current_message:
            messages.append(current_message)
            participants.add(current_message["sender"])

    return messages, participants