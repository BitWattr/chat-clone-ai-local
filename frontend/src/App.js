import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadForm from './UploadForm';
import Chat from './Chat';
import DonatePage from './DonatePage';
import './index.css'; // Centralized styling for the application
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

/**
 * AppHeader Component
 * Renders the common header for the application, including navigation links and the application title.
 */
const AppHeader = () => {
    return (
        <header className="app-header">
            <nav className="nav-container">
                <a href="https://bitwattr.netlify.app/" target="_blank" rel="noopener noreferrer" className="bitwattr-link" aria-label="Visit BitWattr website">
                    BitWattr
                </a>
                <h1 className="app-title"> {/* Changed h9 to h1 for semantic correctness */}
                    <FontAwesomeIcon icon={faWhatsapp} className="whatsapp-icon" /> Person Mimicking Chat
                </h1>
            </nav>
        </header>
    );
};

/**
 * App Component
 * The root component that sets up routing and manages the main application state.
 * It handles file upload success, persona selection, and navigation between views.
 */
function App() {
    // State to store session data after successful file upload, includes sessionId and participants.
    const [sessionData, setSessionData] = useState(null);
    // State to store the currently selected persona for chat.
    const [selectedPersona, setSelectedPersona] = useState(null);

    /**
     * Handles the successful file upload event.
     * Updates sessionData and resets selectedPersona.
     * @param {object} data - Contains session_id and participants from the uploaded file.
     */
    const handleFileUploadSuccess = (data) => {
        setSessionData(data);
        setSelectedPersona(null); // Ensure no persona is selected on a new upload
    };

    /**
     * Sets the selected persona for the chat.
     * @param {string} persona - The name of the participant selected as persona.
     */
    const handleSelectPersona = (persona) => {
        setSelectedPersona(persona);
    };

    /**
     * Resets the selected persona, returning to the persona selection screen.
     */
    const handleBackToPersonaSelection = () => {
        setSelectedPersona(null);
    };

    return (
        <Router>
            <div className="app-container">
                <AppHeader />

                <Routes>
                    {/* Route for the main application flow (file upload or chat interface) */}
                    <Route path="/" element={
                        !sessionData ? (
                            <UploadForm onFileUploadSuccess={handleFileUploadSuccess} />
                        ) : (
                            <div className="chat-interface">
                                {!selectedPersona ? (
                                    <div className="persona-selection">
                                        <h2>Chat with:</h2>
                                        {sessionData.participants.map((participant) => (
                                            <button
                                                key={participant}
                                                onClick={() => handleSelectPersona(participant)}
                                                className="persona-button"
                                                aria-label={`Chat with ${participant}`}
                                            >
                                                Chat with {participant} <FontAwesomeIcon icon={faWhatsapp} />
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setSessionData(null)}
                                            className="upload-again-button"
                                            aria-label="Upload another chat file"
                                        >
                                            Upload Another Chat
                                        </button>
                                    </div>
                                ) : (
                                    <Chat
                                        sessionId={sessionData.session_id}
                                        persona={selectedPersona}
                                        participants={sessionData.participants}
                                        onBack={handleBackToPersonaSelection}
                                    />
                                )}
                            </div>
                        )
                    } />
                    {/* Route for the donate page */}
                    <Route path="/donate" element={<DonatePage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
    