import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faArrowLeft, faUserCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * Chat Component
 * Manages the chat interface, including displaying messages, sending new messages,
 * and fetching chat history. It interacts with a backend API for chat functionality.
 * @param {object} props - Component props.
 * @param {string} props.sessionId - The ID of the current chat session.
 * @param {string} props.persona - The name of the participant the AI is mimicking.
 * @param {string[]} props.participants - An array of all participants in the chat.
 * @param {function} props.onBack - Callback function to return to persona selection.
 */
function Chat({ sessionId, persona, participants, onBack }) {
    // State to store the initial chat messages fetched from the server.
    const [initialMessages, setInitialMessages] = useState([]);
    // State to store all messages in the chat, including user's new messages and AI responses.
    const [messages, setMessages] = useState([]);
    // State for the current message being typed by the user.
    const [inputMessage, setInputMessage] = useState('');
    // State to indicate if an AI response is currently being loaded.
    const [loadingResponse, setLoadingResponse] = useState(false);
    // State to indicate if the initial chat history is being loaded.
    const [loadingChatHistory, setLoadingChatHistory] = useState(true);
    // Ref to scroll to the end of the chat messages.
    const chatEndRef = useRef(null);

    // Determines the other participant's name (the user's persona in the chat).
    const otherParticipant = participants.find(p => p !== persona);
    // Base URL for API calls, retrieved from environment variables for production readiness.
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    /**
     * Effect to scroll to the bottom of the chat window whenever messages are updated.
     */
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /**
     * Effect to fetch chat history when the component mounts or sessionId/persona changes.
     */
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                setLoadingChatHistory(true);
                // Fetch chat history for the specified session and persona.
                const response = await fetch(`${API_BASE_URL}/get_chat_history/${sessionId}?persona=${encodeURIComponent(persona)}`);
                const data = await response.json();

                if (response.ok) {
                    // Format messages for display, setting "You" as the sender for the current user.
                    const formattedMessages = data.messages.map(msg => ({
                        sender: msg.sender === persona ? persona : "You",
                        message: msg.message
                    }));
                    setInitialMessages(formattedMessages);
                    setMessages(formattedMessages);
                } else {
                    console.error('Failed to fetch chat history:', data.detail);
                }
            } catch (error) {
                console.error('Error fetching chat history:', error);
                // Optionally set an error message to display to the user
                setMessages(prevMessages => [...prevMessages, { sender: "System", message: "Failed to load chat history. Please try again." }]);
            } finally {
                setLoadingChatHistory(false);
            }
        };

        fetchChatHistory();
    }, [sessionId, persona, API_BASE_URL]);

    /**
     * Handles sending a new message to the AI.
     * Appends the user's message, sends it to the API, and then appends the AI's response.
     * @param {Event} event - The form submission event.
     */
    const handleSendMessage = async (event) => {
        event.preventDefault();
        // Prevent sending empty messages or multiple messages while waiting for a response.
        if (!inputMessage.trim() || loadingResponse) return;

        const newUserMessage = { sender: "You", message: inputMessage.trim() };
        // Optimistically add the user's message to the chat.
        setMessages((prevMessages) => [...prevMessages, newUserMessage]);
        setInputMessage(''); // Clear the input field
        setLoadingResponse(true); // Show typing indicator

        try {
            // Send the user's message to the backend for AI processing.
            const response = await fetch(`${API_BASE_URL}/chat/${sessionId}?persona=${encodeURIComponent(persona)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: newUserMessage.message }),
            });

            const data = await response.json();

            if (response.ok) {
                // Add the AI's response to the chat.
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: persona, message: data.response },
                ]);
            } else {
                // Display error message if API call fails.
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: "System", message: `Error: ${data.detail || 'Failed to get response.'}` },
                ]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Display network error message.
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "System", message: "Network error or server unavailable." },
            ]);
        } finally {
            setLoadingResponse(false); // Hide typing indicator
        }
    };

    // Displays only the last 20 messages for performance and readability.
    const messagesToDisplay = messages.slice(-20);

    return (
        <div className="chat-container">
            <div className="chat-header">
                <button onClick={onBack} className="back-button" aria-label="Back to persona selection">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h2>Chatting as {otherParticipant} (with {persona})</h2>
            </div>
            <div className="chat-messages">
                {loadingChatHistory ? (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Loading chat history...</p>
                    </div>
                ) : (
                    <>
                        {messagesToDisplay.length === 0 && (
                            <p className="no-messages-hint">Type a message to start chatting with {persona}!</p>
                        )}
                        {messagesToDisplay.map((msg, index) => (
                            <div key={index} className={`message-bubble ${msg.sender === "You" ? 'sent' : 'received'}`}>
                                <strong>
                                    <FontAwesomeIcon icon={faUserCircle} className="message-sender-icon" /> {msg.sender}:
                                </strong> {msg.message}
                            </div>
                        ))}
                        {loadingResponse && (
                            <div className="message-bubble received typing-indicator" aria-live="polite">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <strong>{persona} is typing...</strong>
                            </div>
                        )}
                    </>
                )}
                <div ref={chatEndRef} /> {/* Element to scroll into view for auto-scrolling */}
            </div>
            <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Message ${persona}...`}
                    disabled={loadingResponse || loadingChatHistory}
                    aria-label={`Message input for chat with ${persona}`}
                />
                <button
                    type="submit"
                    disabled={!inputMessage.trim() || loadingResponse || loadingChatHistory}
                    aria-label="Send message"
                >
                    <FontAwesomeIcon icon={faPaperPlane} />
                </button>
            </form>
        </div>
    );
}

export default Chat;
