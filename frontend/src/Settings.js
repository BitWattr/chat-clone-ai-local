import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './Settings.css'; // Create this CSS file for styling

function Settings() {
    const [ollamaHost, setOllamaHost] = useState('');
    const [llmModel, setLlmModel] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const navigate = useNavigate(); // Initialize useNavigate

    useEffect(() => {
        // Fetch current settings when the component mounts
        fetch('/settings')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                setOllamaHost(data.ollama_host);
                setLlmModel(data.llm_model);
            })
            .catch(error => {
                console.error("Error fetching settings:", error);
                setMessage("Error fetching settings: " + error.message);
                setMessageType('error');
            });
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage(''); // Clear previous messages
        setMessageType('');

        try {
            const response = await fetch('/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ollama_host: ollamaHost, llm_model: llmModel }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setMessage(data.message);
            setMessageType('success');
            // Optionally, update the state with the returned current_settings if needed
            setOllamaHost(data.current_settings.ollama_host);
            setLlmModel(data.current_settings.llm_model);

        } catch (error) {
            console.error("Error updating settings:", error);
            setMessage("Error updating settings: " + error.message);
            setMessageType('error');
        }
    };

    const handleChatNowClick = () => {
        navigate('/'); // Navigate to the root path (chat page)
    };

    return (
        <div className="settings-container">
            <h2>Ollama Settings</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="ollamaHost">Ollama Host URL:</label>
                    <input
                        type="text"
                        id="ollamaHost"
                        value={ollamaHost}
                        onChange={(e) => setOllamaHost(e.target.value)}
                        placeholder="e.g., http://localhost:11434"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="llmModel">LLM Model Name:</label>
                    <input
                        type="text"
                        id="llmModel"
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                        placeholder="e.g., llama3, gemma2"
                        required
                    />
                </div>
                <button type="submit" className="save-button">Save Settings</button>
            </form>
            {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}
            <p className="settings-tip">
                Ensure Ollama is running and the specified model is downloaded.
                You can download models using `ollama run [model_name]` in your terminal.
            </p>
            <div className="chat-now-container">
                <p>Done setting up LLM?</p>
                <button onClick={handleChatNowClick} className="chat-now-button">
                    Chat Now
                </button>
            </div>
        </div>
    );
}

export default Settings;