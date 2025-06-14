import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import UploadForm from './UploadForm';
import Chat from './Chat';
import DonatePage from './DonatePage';
import Settings from './Settings';
import './index.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faCog, faComments, faHeart } from '@fortawesome/free-solid-svg-icons'; // Added faComments and faHeart

/**
 * AppHeader Component
 * Renders the common header for the application, including navigation links and the application title.
 * Now includes a link to the settings page.
 */
const AppHeader = () => {
    return (
        <header className="app-header">
            <nav className="nav-container">
                <a href="https://bitwattr.pages.dev/" target="_blank" rel="noopener noreferrer" className="bitwattr-link" aria-label="Visit BitWattr website">
                    BitWattr
                </a>
                <h1 className="app-title">
                    <FontAwesomeIcon icon={faWhatsapp} className="whatsapp-icon" /> Person Mimicking Chat
                </h1>
                <div className="nav-links">
                    {/* Updated Chat link to go to the root path */}
                    <Link to="/" className="nav-link" aria-label="Go to Chat Upload">
                        <FontAwesomeIcon icon={faComments} /> Chat
                    </Link>
                    {/* Settings link remains the same */}
                    <Link to="/settings" className="nav-link" aria-label="Go to Settings">
                        <FontAwesomeIcon icon={faCog} /> Settings
                    </Link>
                    {/* Donate link now uses an <a> tag for external redirect and has a colorful button style */}
                    <a href="https://bitwattr.pages.dev/donate" target="_blank" rel="noopener noreferrer" className="nav-link donate-button" aria-label="Go to Donate Page">
                        <FontAwesomeIcon icon={faHeart} /> Donate
                    </a>
                </div>
            </nav>
        </header>
    );
};

/**
 * App Component
 * The root component that sets up routing and manages the main application state.
 * It handles file upload success, persona selection, and navigation between views.
 * Now includes a route for the Settings page.
 */
function App() {
    // State to store session data after successful file upload, includes sessionId and participants.
    const [sessionData, setSessionData] = useState(null);
    // State to store the currently selected persona for chat.
    const [selectedPersona, setSelectedPersona] = useState(null);
    const navigate = useNavigate(); // Initialize useNavigate hook

    /**
     * Effect hook to check if it's the first time a user visits the application.
     * If it's the first visit, it redirects the user to the settings page and sets a flag in local storage.
     */
    useEffect(() => {
        // Check local storage for a flag indicating if it's the first time the user visits.
        const isFirstTime = localStorage.getItem('isFirstTimeUser') === null;

        if (isFirstTime) {
            navigate('/settings'); // Redirect to settings page for first-time users.
            localStorage.setItem('isFirstTimeUser', 'false'); // Set the flag so it doesn't redirect again.
        }
    }, [navigate]); // Dependency array includes `Maps` to re-run if it changes.

    /**
     * Handles the successful file upload event.
     * Stores the session ID and participants, and resets selected persona.
     * @param {object} data - Object containing sessionId and participants array.
     */
    const handleFileUploadSuccess = (data) => {
        setSessionData(data);
        setSelectedPersona(null); // Reset persona when a new file is uploaded
    };

    /**
     * Handles the selection of a persona for chat.
     * @param {string} personaName - The name of the selected persona.
     */
    const handleSelectPersona = (personaName) => {
        setSelectedPersona(personaName);
    };

    /**
     * Handles navigation back to the persona selection screen.
     * Clears the selected persona, returning to the participant list.
     */
    const handleBackToPersonaSelection = () => {
        setSelectedPersona(null);
    };

    return (
        <div className="App">
            {/* Always render the header */}
            <AppHeader />

            {/* Define the routes for different sections of the application */}
            <Routes>
                {/* Route for the main upload form and persona selection */}
                <Route path="/" element={
                    <div className="main-content">
                        {/* If sessionData exists, display persona selection or chat, else display upload form */}
                        {sessionData === null ? (
                            <UploadForm onFileUploadSuccess={handleFileUploadSuccess} />
                        ) : selectedPersona === null ? (
                            <div className="persona-selection-container">
                                <h2>Who do you want to chat with?</h2>
                                {/* Map through participants to create buttons for each persona */}
                                {sessionData.participants.map(participant => (
                                    <button
                                        key={participant}
                                        onClick={() => handleSelectPersona(participant)}
                                        className="persona-button"
                                        aria-label={`Chat with ${participant}`}
                                    >
                                        Chat with {participant} <FontAwesomeIcon icon={faWhatsapp} />
                                    </button>
                                ))}
                                {/* Button to upload another chat file */}
                                <button
                                    onClick={() => setSessionData(null)}
                                    className="upload-again-button"
                                    aria-label="Upload another chat file"
                                >
                                    Upload Another Chat
                                </button>
                            </div>
                        ) : (
                            // Render the Chat component if a persona is selected
                            <Chat
                                sessionId={sessionData.session_id}
                                persona={selectedPersona}
                                participants={sessionData.participants}
                                onBack={handleBackToPersonaSelection}
                            />
                        )}
                    </div>
                } />
                {/* Route for the donate page (internal, though the nav link is external) */}
                <Route path="/donate" element={<DonatePage />} />
                {/* Route for the new Settings page */}
                <Route path="/settings" element={<Settings />} />
            </Routes>
        </div>
    );
}

// Wrapper component to provide Router context to App
const AppWrapper = () => (
    <Router>
        <App />
    </Router>
);

export default AppWrapper;