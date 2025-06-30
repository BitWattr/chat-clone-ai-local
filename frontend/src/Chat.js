import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faArrowLeft, faUserCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

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
    // State to control the visibility of the server high load modal
    const [showHighLoadModal, setShowHighLoadModal] = useState(false);


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
     * Closes the server high load modal.
     */
    const handleCloseHighLoadModal = () => {
        setShowHighLoadModal(false);
        // Optionally, reset messages or show a system message indicating closure
        setMessages(prevMessages => prevMessages.filter(msg => msg.sender !== "System" || !msg.message.includes("server is experiencing high loads")));
    };

    /**
     * Navigates to the donate page.
     */
    const handleDonateClick = () => {
        window.open('https://bitwattr.pages.dev/donate', '_blank');
    };

    /**
     * Sets an error message related to server load.
     * @param {function} errorMessageSetter - Function to set the error message in the chat.
     */
    const setServerLoadErrorMessage = (errorMessageSetter) => {
        errorMessageSetter("Our server is currently experiencing high loads. Please try again later.");
        setShowHighLoadModal(true); // Show the server high load modal
    };

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
                    // Handle specific error codes or a general high load message for chat history
                    if (response.status === 429 || response.status === 503 || (response.status >= 500 && response.status < 600)) {
                        setServerLoadErrorMessage((msg) => setMessages(prevMessages => [...prevMessages, { sender: "System", message: msg }]));
                    } else {
                        setMessages(prevMessages => [...prevMessages, { sender: "System", message: `Failed to load chat history: ${data.detail || 'Unknown error'}.` }]);
                    }
                }
            } catch (error) {
                console.error('Error fetching chat history:', error);
                // Display network error message for fetching chat history, now as high load
                setServerLoadErrorMessage((msg) => setMessages(prevMessages => [...prevMessages, { sender: "System", message: msg }]));
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
                // Handle specific error codes or a general high load message for chat interaction
                if (response.status === 429 || response.status === 503 || (response.status >= 500 && response.status < 600)) {
                    setServerLoadErrorMessage((msg) => setMessages((prevMessages) => [...prevMessages, { sender: "System", message: msg }]));
                } else {
                    setMessages((prevMessages) => [
                        ...prevMessages,
                        { sender: "System", message: `Error: ${data.detail || 'Failed to get response.'}` },
                    ]);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Display network error message, now as high load
            setServerLoadErrorMessage((msg) => setMessages(prevMessages => [...prevMessages, { sender: "System", message: msg }]));
        } finally {
            setLoadingResponse(false); // Hide typing indicator
        }
    };

    // Displays only the last 20 messages for performance and readability.
    const messagesToDisplay = messages//.slice(-20);

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

            {/* Server High Load Modal */}
            <div className={`policy-modal-overlay ${showHighLoadModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="highLoadModalTitle">
                <div className="policy-modal-content">
                    <h2 id="highLoadModalTitle"><FontAwesomeIcon icon={faTimesCircle} style={{ color: 'var(--secondary-accent)' }} /> Service Unavailable</h2> {/* Used secondary-accent */}
                    <p>Our servers are currently experiencing high loads. Please try again later.</p>
                    <p>As a small project, we can't afford high power servers. We encourage users who require 24/7 access or prefer complete control over their data to run this project locally on their own machines by accessing our GitHub repository.</p>
                    <button className="donate-button" onClick={handleDonateClick} aria-label="Donate to keep us online">Donate to keep us online</button>
                    <p>You can always run this locally!</p>
                    <p>See the source code and local setup instructions on github:</p>
                    <a
                        href="https://github.com/your-repo-link" // TODO: Replace with your actual GitHub repo link
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-github-button"
                        style={{
                            background: 'var(--primary-accent)', /* Use primary accent color */
                            color: 'var(--text-primary)',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            marginTop: '10px',
                            transition: 'transform 0.2s ease-in-out, background-color 0.3s ease, color 0.3s ease',
                            boxShadow: 'var(--box-shadow-medium)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        aria-label="Visit GitHub repository for local setup"
                    >
                        Visit Git Repo
                    </a>
                    {/* Added More About BitWattr Section to Server High Load Modal */}
                    <div className="more-about-bitwattr-container" style={{ marginTop: '20px' }}>
                        <h3>More about the BitWattr Organization</h3>
                        <a
                            href="https://bitwattr.pages.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="visit-bitwattr-button"
                            style={{
                                background: 'linear-gradient(45deg, var(--secondary-accent), var(--primary-accent))', /* Mix of primary and secondary */
                                color: 'var(--text-primary)',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                textDecoration: 'none',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                marginTop: '10px',
                                transition: 'transform 0.2s ease-in-out, background 0.3s ease, color 0.3s ease',
                                boxShadow: 'var(--box-shadow-medium)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            aria-label="Visit BitWattr Organization website"
                        >
                            Visit BitWattr Organization
                        </a>
                    </div>
                    <button onClick={handleCloseHighLoadModal} className="agree-button" style={{ marginTop: '20px' }} aria-label="Close server high load message">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Chat;
