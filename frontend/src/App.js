import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadForm from './UploadForm';
import Chat from './Chat';
import DonatePage from './DonatePage';
import PersonaChatLayout from './PersonaChatLayout'; // Importing the desktop layout component
import './index.css'; // Centralized styling for the application
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faComment } from '@fortawesome/free-solid-svg-icons'; // Changed faWhatsapp to faComment

/**
 * AppHeader Component
 * Renders the common header for the application, including navigation links and the application title.
 * Also includes a theme toggle button.
 * @param {object} props - Component props.
 * @param {string} props.theme - The current theme ('light' or 'dark').
 * @param {function} props.toggleTheme - Function to toggle the theme.
 */
const AppHeader = ({ theme, toggleTheme }) => {
    return (
        <header className="app-header">
            <nav className="nav-container">
                <a href="https://bitwattr.pages.dev/" target="_blank" className="bitwattr-link" aria-label="Visit BitWattr website">
                    BitWattr
                </a>
                <h1 className="app-title">
                    <FontAwesomeIcon icon={faComment} className="chat-icon" /> Person Mimicking Chat {/* Changed icon */}
                </h1>
            </nav>
            
            <button onClick={toggleTheme} className="theme-toggle" aria-label={`Toggle to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                {theme === 'light' ? '' : ''}
            </button>
        </header>
    );
};

/**
 * App Component
 * The root component that sets up routing and manages the main application state.
 * It handles file upload success, persona selection, and navigation between views,
 * and also manages the global theme.
 */
function App() {
    // State to store session data after successful file upload, includes sessionId and participants.
    const [sessionData, setSessionData] = useState(null);
    // State to store the currently selected persona for chat.
    const [selectedPersona, setSelectedPersona] = useState(null);
    // State to track window width for responsive layout
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    // State for theme: 'light' or 'dark', initialized from localStorage or system preference
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    /**
     * Effect hook to manage theme application to the document body.
     * Updates the 'dark-mode' class on the body element whenever the theme state changes.
     */
    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
        localStorage.setItem('theme', theme);
    }, [theme]);

    /**
     * Function to toggle the theme between 'light' and 'dark'.
     */
    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    /**
     * Effect hook to listen for window resize events and update windowWidth state.
     */
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /**
     * Handles the successful file upload or demo chat load event.
     * Updates sessionData and resets selectedPersona.
     * @param {object} data - Contains sessionId and participants from the uploaded file or loaded demo.
     */
    const handleFileUploadSuccess = (data) => {
        setSessionData(data);
        setSelectedPersona(null); // Ensure no persona is selected on a new upload or demo load
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
                <AppHeader theme={theme} toggleTheme={toggleTheme} />
                <Routes>
                    <Route path="/" element={
                        !sessionData ? (
                            <UploadForm onFileUploadSuccess={handleFileUploadSuccess} />
                        ) : (
                            <div className="chat-interface">
                                {/* Desktop: sidebar layout, Mobile: current flow */}
                                {windowWidth > 600 ? (
                                    <PersonaChatLayout
                                        participants={sessionData.participants}
                                        selectedPersona={selectedPersona}
                                        onSelectPersona={handleSelectPersona}
                                        onUploadAgain={() => setSessionData(null)}
                                        sessionData={sessionData}
                                        onBackToPersonaSelection={handleBackToPersonaSelection}
                                    />
                                ) : (
                                    !selectedPersona ? (
                                        <div className="persona-selection">
                                            <h2>Chat with:</h2>
                                            {sessionData.participants.map((participant) => (
                                                <button
                                                    key={participant}
                                                    onClick={() => handleSelectPersona(participant)}
                                                    className="persona-button"
                                                    aria-label={`Chat with ${participant}`}
                                                >
                                                    Chat with {participant} <FontAwesomeIcon icon={faComment} /> {/* Changed icon */}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setSessionData(null)}
                                                className="upload-again-button"
                                                aria-label="Upload another chat file"
                                            >
                                                Upload Another Chat / Try Another Demo
                                            </button>
                                        </div>
                                    ) : (
                                        <Chat
                                            sessionId={sessionData.sessionId}
                                            persona={selectedPersona}
                                            participants={sessionData.participants}
                                            onBack={handleBackToPersonaSelection}
                                        />
                                    )
                                )}
                            </div>
                        )
                    } />
                    <Route path="/donate" element={<DonatePage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
