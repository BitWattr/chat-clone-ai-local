# 🗣️ AI Person Mimicry Chat 🧠

Welcome to the AI Person Mimicry Chat project! This application allows you to utilize your WhatsApp chat history to create an AI persona that mimics a specific participant from your conversations. Powered by local Large Language Models (LLMs) via Ollama, all your data stays on your machine, ensuring privacy.

## ✨ Features

* **🕵️ Persona Mimicry:** Select your WhatsApp chat history file and select a participant for the AI to mimic.

* **🔒 Local Processing:** All chat parsing happen locally on your machine and AI interactions using Ollama on you machine itself, But BitWattr doesn't guarentee privacy as it depends on your machine and ollama.

* **🚀 Easy Setup:** Get started quickly with a pre-built executable or by running the Python source code directly.

* **⚙️ Customizable LLM Settings:** Adjust your Ollama host and LLM model directly from the application's settings page.

* **🌐 Web-Based Interface:** Access the application easily through your web browser.

## 🚀 Getting Started

To use this application, you'll need to have [Ollama](https://ollama.com/download) installed and at least one LLM model downloaded (e.g., `llama3.2`).

### 1. Install Ollama & Download an LLM

1.  **Download Ollama:** Visit <https://ollama.com/download> and download the appropriate version for your operating system (Windows, macOS, Linux).

2.  **Install Ollama:** Follow the installation instructions for your system.

3.  **Download an LLM Model:** Open your terminal or command prompt and download a model. For example:

    ```
    ollama run llama3.2

    ```

    This command will download the model if you don't have it already. Ensure Ollama is running in the background when you use the application.

### 2. Local Setup Options

You can run the application locally with source code quickly with some commands:

#### Running from Source 💻

1.  **Clone the Repository:**

    ```
    git clone https://github.com/BitWattr/chat-clone-ai-local
    cd chat-clone-ai-local

    ```

2.  **Set up Python Environment (optional)(recommended):**

    * Ensure you have Python 3.8+ installed.

    * Create a virtual environment:

        ```
        python -m venv venv
        # On Windows:
        .\venv\Scripts\activate
        # On macOS/Linux:
        source venv/bin/activate

        ```

3.  **Install Backend Dependencies:**

    ```
    pip install fastapi uvicorn python-dotenv python-multipart ollama

    ```

4.  **Run the Backend Server:**

    * Navigate back to the root directory of the project:

    * Start the FastAPI server:

        ```
        python main.py
        
        ```

    * Your default web browser should automatically open to `http://localhost:8000`. If not opened automatically paste the link in a browser

## ⚙️ Settings

Upon first launching the application, you'll be redirected to the **Settings** page. You can also access it anytime by clicking the ⚙️ **Settings** link in the header.

Here, you can configure the following:

* **Ollama Host URL:** The address where your Ollama server is running (default is., `http://localhost:11434`).

* **LLM Model Name:** The name of the Large Language Model you want to use (e.g., `llama3.2`). This model must be downloaded in Ollama (see "Install Ollama & Download an LLM" above).

**Important:** Ensure Ollama is running and the specified LLM model is downloaded before attempting to use the chat functionality.

## 🤝 How It Works (The Magic Behind the Mimicry)

This AI-powered person mimicry application, developed by the **BitWattr** organization, functions locally on your machine with a strong emphasis on privacy.

Here's a breakdown of the process:

1.  **📤 Upload Chat History:**

    * You begin by uploading your WhatsApp chat history as a `.txt` file. A detailed tutorial on how to export this file from WhatsApp is available on the upload page.

    * Your locally running backend service (built with FastAPI) receives this file.

2.  **📝 Parse Chat Data:**

    * The uploaded chat content is immediately parsed *in-memory* using a custom Python parser (`chat_parser.py` and integrated into `main.py`).

    * This process extracts individual messages, their timestamps, and identifies all unique participants in the conversation.

3.  **⏳ Session Management:**

    * A unique, temporary session ID is generated for your parsed chat data.

    * This session and its associated data are held in *volatile memory only*. They are **never permanently stored or written to your disk**.

    * Your session automatically expires and all associated data is **permanently deleted from memory after 30 minutes of inactivity**.

4.  **👤 Persona Selection:**

    * Once your chat is processed, the application lists identified participants.

    * You then select one of these participants to be the "persona" that the AI will mimic. The other participant in the chat will be considered "You" for the AI's responses.

5.  **💬 AI Interaction:**

    * When you send a message in the chat interface, it's added to the live, in-memory chat history.

    * This updated history, along with a carefully crafted system prompt instructing the AI to act as your chosen persona, is sent to the Large Language Model (LLM) powered by Ollama (`llm_service.py`), running directly on your local machine.

6.  **✨ Generating Responses:**

    * The local LLM analyzes the entire conversation history and generates a response that is natural, coherent, and crucially, in the distinct style and character of the selected persona.

    * This AI-generated response is then displayed back in your chat interface.

**In essence, this project leverages your private chat history to create a dynamic AI twin of a specific person, allowing it to generate responses that closely resemble how that person would communicate – all within the secure confines of your local environment.**

## 🛡️ Privacy

* **No Data Storage:** We do not store any of your chat data or personal information on any external servers. All processing happens *locally* and *in-memory* on your machine.

* **Temporary Sessions:** Chat data is held temporarily in your computer's RAM for the duration of your active session and is automatically deleted after 30 minutes of inactivity.

* **Open Source:** The entire codebase is open-source and available on our GitHub repository, allowing for full transparency and inspection of how your data is handled.

For more details, please refer to the "Data Privacy Policy for Local Use" section on the application's upload page.

## 🙏 Support the Project

If you find this project useful, consider supporting us!, [Donate](https://bitwattr.pages.dev/donate). Your contributions help us continue developing and improving privacy-focused AI tools.

## 📞 Contact

For questions, issues, or contributions, please visit our [GitHub repository](https://github.com/BitWattr/chat-clone-ai-local) and open an issue or pull request.

## 🔗 Hosted Service

This service is also hosted at: <https://chat-clone-ai.pages.dev/>

---
Developed with ❤️ by **BitWattr Organization**