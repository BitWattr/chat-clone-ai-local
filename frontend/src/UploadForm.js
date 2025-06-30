import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faCheckCircle, faSpinner, faTimesCircle, faQuestionCircle, faPlayCircle, faCommentDots, faHandHoldingDollar, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

function UploadForm({ onFileUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasAgreedToPolicy, setHasAgreedToPolicy] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [showTutorialModal, setShowTutorialModal] = useState(false);
    const [showHighLoadModal, setShowHighLoadModal] = useState(false); // Renamed from showOfflineModal, now represents general errors/high load
    const [demoChats, setDemoChats] = useState([]);
    const [loadingDemos, setLoadingDemos] = useState(true);

    // New states for text input section
    const [showTextInputSection, setShowTextInputSection] = useState(false);
    const [chatTextInput, setChatTextInput] = useState('');

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'; // Default to local for offline version

    useEffect(() => {
        const agreed = localStorage.getItem('agreedToDataPolicy');
        if (agreed === 'true') {
            setHasAgreedToPolicy(true);
        } else {
            setShowPolicyModal(true);
        }

        // In a strictly local-only context, fetching demos from an API might not be applicable.
        // If demos are local files, this section would change to load them from a local source.
        // For now, retaining the structure but noting it implies a local server endpoint if used.
        const fetchDemoChats = async () => {
            try {
                setLoadingDemos(true);
                const response = await fetch(`${API_BASE_URL}/get_demo_chats`);
                const data = await response.json();
                if (response.ok) {
                    setDemoChats(data.demos);
                } else {
                    console.error('Failed to fetch demo chats:', data.detail);
                    setMessage(`Error fetching demo list: ${data.detail || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error fetching demo chats:', error);
                setMessage('A connection error occurred while fetching demo chats. Ensure your local server is running.');
            } finally {
                setLoadingDemos(false);
            }
        };

        fetchDemoChats();
    }, [API_BASE_URL]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage('');
    };

    const handleAgreeToPolicy = () => {
        localStorage.setItem('agreedToDataPolicy', 'true');
        setHasAgreedToPolicy(true);
        setShowPolicyModal(false);
    };

    const handleDonateClick = () => {
        // In an offline-only context, this might link to a project's general support page
        // or be removed if donations are not applicable.
        window.open('https://bitwattr.pages.dev/donate', '_blank');
    };

    const handleShowTutorial = (event) => {
        event.preventDefault();
        setShowTutorialModal(true);
    };

    const handleCloseTutorial = () => {
        setShowTutorialModal(false);
    };

    const handleShowPolicy = (event) => {
        event.preventDefault();
        setShowPolicyModal(true);
    };

    const handleCloseHighLoadModal = () => {
        setShowHighLoadModal(false);
        setMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!selectedFile) {
            setMessage('Please select a file to upload.');
            return;
        }

        if (!hasAgreedToPolicy) {
            setMessage('Please agree to the data policy first.');
            setShowPolicyModal(true);
            return;
        }

        setLoading(true);
        setMessage('Uploading and processing chat history...');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(`${API_BASE_URL}/upload_chat_history`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                onFileUploadSuccess(data);
            } else {
                // In a local context, 429/503 might indicate an issue with the local server
                // or misconfiguration rather than external high load.
                setMessage(`Error: ${data.detail || 'Failed to upload file. Ensure your local server is running and accessible.'}`);
                setShowHighLoadModal(true); // Re-purpose this modal for local errors/troubleshooting
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('A connection error occurred. Please ensure your local server is running.');
            setShowHighLoadModal(true); // Re-purpose this modal for local errors/troubleshooting
        } finally {
            setLoading(false);
        }
    };

    const handleLoadDemo = async (demoId) => {
        if (!hasAgreedToPolicy) {
            setMessage('Please agree to the data policy first before trying a demo.');
            setShowPolicyModal(true);
            return;
        }

        setLoading(true);
        setMessage(`Loading demo chat: ${demoId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}...`);

        try {
            const response = await fetch(`${API_BASE_URL}/load_demo_chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ demoId }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                onFileUploadSuccess(data);
            } else {
                setMessage(`Error loading demo: ${data.detail || 'Failed to load demo chat. Ensure your local server is running.'}`);
                setShowHighLoadModal(true); // Re-purpose for local errors
            }
        } catch (error) {
            console.error('Error loading demo chat:', error);
            setMessage('A connection error occurred. Please ensure your local server is running.');
            setShowHighLoadModal(true); // Re-purpose for local errors
        } finally {
            setLoading(false);
        }
    };

    // New handler for text input submission
    const handleTextInputSubmit = async () => {
        if (!chatTextInput.trim()) {
            setMessage('Please paste some chat data to test.');
            return;
        }

        if (!hasAgreedToPolicy) {
            setMessage('Please agree to the data policy first.');
            setShowPolicyModal(true);
            return;
        }

        setLoading(true);
        setMessage('Processing pasted chat data...');

        const file = new Blob([chatTextInput], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', file, 'pasted_chat.txt');

        try {
            const response = await fetch(`${API_BASE_URL}/upload_chat_history`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                onFileUploadSuccess(data);
            } else {
                setMessage(`Error: ${data.detail || 'Failed to process pasted data. Ensure your local server is running.'}`);
                setShowHighLoadModal(true); // Re-purpose for local errors
            }
        } catch (error) {
            console.error('Error processing pasted data:', error);
            setMessage('A connection error occurred. Please ensure your local server is running.');
            setShowHighLoadModal(true); // Re-purpose for local errors
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="upload-form-wrapper">
            <div className="upload-form-section">
                <div className="upload-form-container">
                    <div className="ollama-config-info" style={{ marginBottom: '1em', color: '#555', fontSize: '0.95em' }}>
                        <FontAwesomeIcon icon={faQuestionCircle} style={{ marginRight: '0.5em' }} />
                        You can change Ollama API URL and model by editing <b>config.json</b> in the app folder.
                    </div>
                    <h2>Upload Chat History (.txt)</h2>
                    <form onSubmit={handleSubmit}>
                        <label htmlFor="file-upload" className="custom-file-upload">
                            <input
                                id="file-upload"
                                type="file"
                                accept=".txt"
                                onChange={handleFileChange}
                                disabled={loading}
                                aria-label="Select chat history text file"
                            />
                            <FontAwesomeIcon icon={faUpload} /> {selectedFile ? selectedFile.name : 'Select .txt File'}
                        </label>
                        <button type="submit" disabled={!selectedFile || loading} aria-label="Upload chat history">
                            {loading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin /> Processing...
                                </>
                            ) : (
                                <>
                                    Upload Chat <FontAwesomeIcon icon={faUpload} />
                                </>
                            )}
                        </button>
                    </form>
                    {message && <p className="message" aria-live="polite">{message}</p>}

                </div>
            </div>

            {/* New: Demo Chat Section */}
            <div className="demo-chat-section">
                <div className="demo-chat-container">
                    <h3>Or Try a Demo Chat!</h3>
                    {loadingDemos ? (
                        <div className="loading-indicator">
                            <FontAwesomeIcon icon={faSpinner} spin /> Loading Demos...
                        </div>
                    ) : demoChats.length > 0 ? (
                        <div className="demo-buttons">
                            {demoChats.map((demo) => (
                                <button
                                    key={demo.id}
                                    onClick={() => handleLoadDemo(demo.id)}
                                    disabled={loading}
                                    className="demo-button"
                                    aria-label={`Load demo chat: ${demo.name}`}
                                >
                                    <FontAwesomeIcon icon={faPlayCircle} /> {demo.name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p>No demo chats available at the moment. Ensure your local server can provide them.</p>
                    )}

                    {/* New: Section for pasting chat data */}
                    <div className="paste-chat-section">
                        <button
                            className="toggle-paste-section-button"
                            onClick={() => setShowTextInputSection(!showTextInputSection)}
                            aria-expanded={showTextInputSection}
                            aria-controls="paste-chat-content"
                        >
                            <FontAwesomeIcon icon={showTextInputSection ? faChevronUp : faChevronDown} />
                            {showTextInputSection ? ' Hide Text Input' : ' Quickly Paste Chat and test'}
                        </button>

                        {showTextInputSection && (
                            <div id="paste-chat-content" className="paste-chat-content">
                                <textarea
                                    className="chat-text-input"
                                    placeholder={`
John Doe: Hey there! How's it going?
Jane Smith: Not bad, just enjoying the weekend. You?
John Doe: Same here, pretty chill. Any plans for tomorrow?
Jane Smith: Thinking of hitting the park. Maybe a picnic.
John Doe: Sounds lovely! Enjoy!
                                    `}
                                    value={chatTextInput}
                                    onChange={(e) => setChatTextInput(e.target.value)}
                                    rows="10"
                                    disabled={loading}
                                    aria-label="Paste chat data here"
                                ></textarea>
                                <button
                                    onClick={handleTextInputSubmit}
                                    disabled={loading || !chatTextInput.trim()}
                                    className="submit-text-chat-button"
                                    aria-label="Process pasted chat data"
                                >
                                    {loading ? (
                                        <>
                                            <FontAwesomeIcon icon={faSpinner} spin /> Processing...
                                        </>
                                    ) : (
                                        <>
                                            Process Pasted Data <FontAwesomeIcon icon={faCommentDots} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Links for Policy and Tutorial */}
            <div className="info-and-links-section">
                <h3>Information & Policies</h3>
                <div className="privacy-policy-link-container">
                    <p>
                        <a href="#" onClick={handleShowTutorial} className="link-button" aria-label="What is chat history file? Help">
                            <FontAwesomeIcon icon={faQuestionCircle} /> What is Chat History File? (Help)
                        </a>
                    </p>
                    <p>
                        <a href="#" onClick={handleShowPolicy} className="link-button" aria-label="How our project processes your data? Privacy Policy">
                            <FontAwesomeIcon icon={faQuestionCircle} /> How our project processes your data?: Privacy Policy
                        </a>
                    </p>
                    <p>
                        <a href="#" onClick={handleShowPolicy} className="link-button" aria-label="Terms and conditions">
                            <FontAwesomeIcon icon={faQuestionCircle} /> Terms and condition
                        </a>
                    </p>
                </div>
            </div>

            {/* Run Locally Section */}
            <div className="run-locally-section">
                <div className="run-locally-container">
                    <h3>Running Locally</h3>
                    <p>You're running this AI-powered person mimicry project on your own machine. This ensures full control over your data and allows for 24/7 access without server limitations. Visit GitHub for local setup instructions.</p>
                    <a
                        href="https://github.com/BitWattr/chat-clone-ai-local"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-github-button"
                        style={{
                            background: 'var(--primary-accent)',
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
                        <FontAwesomeIcon icon={faGithub} /> Visit Git Repo
                    </a>
                    {/* Donate button kept, as it could be for the project maintainers generally */}
                    <button
                        className="donate-button"
                        style={{
                            marginLeft: '10px',
                            background: 'linear-gradient(45deg, var(--secondary-accent), var(--primary-accent))',
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
                        onClick={handleDonateClick}
                        aria-label="Donate to keep us online"
                    >
                        <FontAwesomeIcon icon={faHandHoldingDollar} /> Donate to Support the Project
                    </button>
                </div>
            </div>

            {/* More About BitWattr Section */}
            <div className="bitwattr-info-section">
                <div className="more-about-bitwattr-container">
                    <h3>More about the BitWattr Organization</h3>
                    <a
                        href="https://bitwattr.pages.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-bitwattr-button"
                        style={{
                            background: 'linear-gradient(45deg, var(--secondary-accent), var(--primary-accent))',
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
                    <a
                        href="https://bitwattr.pages.dev/projects/chat-mimicry-ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-bitwattr-button"
                        style={{
                            background: 'linear-gradient(45deg, var(--secondary-accent), var(--primary-accent))',
                            color: 'var(--text-primary)',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            marginTop: '10px',
                            marginLeft: '10px',
                            transition: 'transform 0.2s ease-in-out, background 0.3s ease, color 0.3s ease',
                            boxShadow: 'var(--box-shadow-medium)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        aria-label="Learn more about the AI-powered person mimicry project"
                    >
                        Learn More about Chat Mimicry AI
                    </a>
                </div>
            </div>

            {/* How this works? Section */}
            <div className="how-it-works-section">
                <div className="how-it-works-container">
                    <h3>How this AI-powered Person Mimicry Project Works (Locally)?</h3>
                    <p>This AI-powered person mimicry application, developed by the BitWattr organization, functions as follows:</p>
                    <ol>
                        <li>
                            <b>Upload Chat History / Select Demo:</b> You start by uploading your chat history as a `.txt` file or selecting one of our provided demo chats. Your locally running backend service, built with FastAPI, receives this file.
                        </li>
                        <li>
                            <b>Parse Chat Data:</b> The chat content (uploaded or demo) is immediately parsed in-memory using a custom parser. This process extracts individual messages, their timestamps, and identifies all participants in the conversation.
                        </li>
                        <li>
                            <b>Session Management:</b> A unique session ID is generated for your parsed chat data. This session remains active for a limited time (30 minutes of inactivity), after which all associated data is automatically and permanently deleted from memory.
                        </li>
                        <li>
                            <b>Persona Selection:</b> Once the chat is parsed, you can select one of the participants as the "persona" that the AI will mimic. The other participant in the chat will be considered "You" for the AI's responses.
                        </li>
                        <li>
                            <b>AI Interaction:</b> When you send a message, it's added to the live chat history. This updated history, along with a system prompt instructing the AI to act as your chosen persona, is sent to a large language model (LLM) powered by Ollama, running on your local machine.
                        </li>
                        <li>
                            <b>Generating Responses:</b> The LLM analyzes the conversation history and generates a response in the style and character of the selected persona. This response is then displayed in the chat interface.
                        </li>
                    </ol>
                    <p>Essentially, this project leverages your chat history to enable a local AI model on the fly, allowing it to generate responses that closely resemble how a specific person from your chat would communicate, all within your local environment.</p>

                </div>
            </div>

            {/* Data Policy Modal (Modified for local use) */}
            <div className={`policy-modal-overlay ${showPolicyModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="policyModalTitle">
                <div className="policy-modal-content">
                    <h2 id="policyModalTitle">Terms and Conditions for Local Use</h2>
                    <p>By using this AI-powered person mimicry project, you ("the User") agree to be bound by the following terms and conditions. Please read them carefully before using our locally-run service.</p>

                    <h3>Service Provision (Local)</h3>
                    <p>This project is provided "as is" and "as available" for local execution on your machine without any guarantees or warranties, express or implied. We do not guarantee that the local service will be uninterrupted, error-free, or secure. Your use of the service is solely at your own risk.</p>

                    <h3>No Affiliation</h3>
                    <p>This AI-powered person mimicry project is an independent service and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with any messaging platforms. All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.</p>

                    <h3>User Responsibility and Acknowledgment of Risk</h3>
                    <ul>
                        <li>You are solely responsible for the chat history files you upload to this project on your local machine.</li>
                        <li>You warrant that you have the necessary rights and permissions to upload and process the chat history files.</li>
                        <li>You understand that uploading chat history files may contain sensitive personal information. By proceeding, you acknowledge and accept all risks associated with providing such data.</li>
                        <li>**You acknowledge that the AI-powered persona mimicry may generate responses of high fidelity, potentially leading to the perception of "real" communication from the mimicked individual. You are solely responsible for understanding and accepting any and all consequences, issues, or implications arising from the use or interpretation of such AI-generated content. The BitWattr organization and its contributors are not responsible for any outcomes, misunderstandings, or damages resulting from the quality or perception of the AI's mimicry.**</li>
                    </ul>

                    <h3>Intellectual Property</h3>
                    <p>The software code, design, and original content of this project (excluding user-uploaded chat data) are copyrighted by the individual contributors to the BitWattr organization and are protected by international copyright laws. Use of these materials is governed by the project's open-source license.</p>

                    <h3>Changes to Terms</h3>
                    <p>The BitWattr organization reserves the right to modify or replace these Terms and Conditions at any time. We will endeavor to provide reasonable notice prior to any new terms taking effect. Your continued use of the service after any such changes constitutes your acceptance of the new Terms and Conditions.</p>

                    <h3>Governing Law</h3>
                    <p>These Terms and Conditions shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

                    <hr />

                    <h2>Data Privacy Policy for Local Use</h2>
                    <p>At the BitWattr organization, your privacy is paramount. This policy outlines how we handle your data when you use our AI-powered person mimicry project locally.</p>

                    <h3>Data Collection (Local)</h3>
                    <p>When you upload a chat history file, our *locally running* application temporarily processes its content *in memory* on your machine to extract messages and participant information. No data leaves your machine.</p>

                    <h3>Data Usage (Local)</h3>
                    <p>The extracted chat data is used exclusively for the purpose of analyzing your chat history and facilitating interactive chat sessions with our AI personas *within your active session on your local machine*. No data leaves your machine.</p>

                    <h3>Data Retention and Deletion (Local)</h3>
                    <ul>
                        <li>Your uploaded chat history files and the processed chat data are never stored permanently or written to disk.</li>
                        <li>All chat data is held in volatile memory only for the duration of your active session.</li>
                        <li>Your session data, including your chat history, is permanently deleted from memory after 30 minutes of inactivity.</li>
                    </ul>

                    <h3>No Data Sharing (Local)</h3>
                    <p>We do not share, sell, rent, or trade your chat data with any third parties for any purpose whatsoever, as all processing occurs *locally on your machine*.</p>

                    <h3>Security Measures (Local)</h3>
                    <p>As this project runs locally on your machine, the security of your data is primarily dependent on your system's security. We implement reasonable technical and organizational measures within the application design to protect your data during its temporary processing. However, no method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security against vulnerabilities on your local system.</p>

                    <h3>Transparency</h3>
                    <p>We believe in transparency. The source code for this project is publicly available on GitHub, allowing you to inspect how your data is processed and handled.</p>
                    <a
                        href="https://github.com/BitWattr/chat-clone-ai-local"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-github-button"
                        style={{
                            background: 'var(--primary-accent)',
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
                        aria-label="Visit GitHub repository for BitWattr Organization"
                    >
                        <FontAwesomeIcon icon={faGithub} /> Visit Git Repo (Local Version)
                    </a>

                    <h3>Server Availability and Local Running</h3>
                    <p>This project is designed to be run locally on your own machine, providing you with complete control over your data and allowing for 24/7 access without external server limitations. All chat history processing and AI interactions occur on your local system. Please refer to our GitHub repository for detailed local setup instructions.</p>

                    <h3>Consent</h3>
                    <p>By proceeding with the upload and use of this AI-powered person mimicry project *on your local machine*, you explicitly consent to the terms of this Data Privacy Policy, understanding and accepting the inherent risks and limitations outlined herein.</p>
                    <button onClick={handleAgreeToPolicy} className="agree-button" aria-label="I agree to terms and conditions">
                        <FontAwesomeIcon icon={faCheckCircle} /> I Agree
                    </button>
                </div>
            </div>

            {/* Server High Load Modal (Modified for local context) */}
            <div className={`policy-modal-overlay ${showHighLoadModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="highLoadModalTitle">
                <div className="policy-modal-content">
                    <h2 id="highLoadModalTitle"><FontAwesomeIcon icon={faTimesCircle} style={{ color: 'var(--secondary-accent)' }} /> Error / Local Server Issue</h2>
                    <p>There was an error communicating with your local backend server, or your local server is experiencing an issue. Please ensure your local server is running and accessible.</p>
                    <p>Troubleshoot by checking your server logs and verifying the `API_BASE_URL` configuration.</p>
                    <p>See the source code and local setup instructions on github:</p>
                    <a
                        href="https://github.com/BitWattr/chat-clone-ai-local"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-github-button"
                        style={{
                            background: 'var(--primary-accent)',
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
                        <FontAwesomeIcon icon={faGithub} /> Visit Git Repo
                    </a>
                    <div className="more-about-bitwattr-container" style={{ marginTop: '20px' }}>
                        <h3>More about the BitWattr Organization</h3>
                        <a
                            href="https://bitwattr.pages.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="visit-bitwattr-button"
                            style={{
                                background: 'linear-gradient(45deg, var(--secondary-accent), var(--primary-accent))',
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
                    <button onClick={handleCloseHighLoadModal} className="agree-button" style={{ marginTop: '20px' }} aria-label="Close error message">
                        Close
                    </button>
                </div>
            </div>


            {/* Tutorial Modal (remains largely unchanged as it's about exporting a file, not online service) */}
            <div className={`policy-modal-overlay ${showTutorialModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="tutorialModalTitle">
                <div className="policy-modal-content">
                    <h2 id="tutorialModalTitle">How to Export Chat History (.txt)</h2>
                    <p>Follow these steps to export your chat history as a .txt file:</p>

                    <ol>
                        <li>
                            <b>Open Whatspp on your phone:</b> Go to the chat you want to export.
                            <img src="" alt="" />
                        </li>
                        <li>
                            <b>Tap More Options:</b> In the chat, tap the three dots (More options) or similar menu, usually located in the top right corner.
                            <img src="" alt="" />
                        </li>
                        <li>
                            <b>Look for 'More' or 'Export':</b> From the dropdown menu, select 'More' or a direct 'Export' option.
                            <img src="" alt="" />
                        </li>
                        <li>
                            <b>Select 'Export chat':</b> Choose 'Export chat' or a similar option.
                            <img src="" alt="" />
                        </li>
                        <li>
                            <b>Choose 'Without Media':</b> Select the option "Without Media" to export only the text file. <i>This step is crucial.</i>
                            <img src="" alt="" />
                        </li>
                        <li>
                            <b>Share/Save the file:</b> Choose where you want to save or share the `.txt` file (e.g., to your device's internal storage, email, or cloud storage)
                            <img src="" alt="" />
                        </li>
                    </ol>
                    <p>Once you have the `.txt` file, you can upload it using the "Select .txt File" button above.</p>
                    <button onClick={handleCloseTutorial} className="agree-button" aria-label="Got it! Close tutorial">
                        <FontAwesomeIcon icon={faCheckCircle} /> Got it!
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UploadForm;