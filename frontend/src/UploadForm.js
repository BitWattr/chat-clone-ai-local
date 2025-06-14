import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faCheckCircle, faSpinner, faTimesCircle, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * UploadForm Component
 * Handles the file upload process for WhatsApp chat history.
 * Manages user agreement to data policy, and displays relevant modals.
 * @param {object} props - Component props.
 * @param {function} props.onFileUploadSuccess - Callback function on successful file upload.
 */
function UploadForm({ onFileUploadSuccess }) {
    // State for the selected chat history file.
    const [selectedFile, setSelectedFile] = useState(null);
    // State for displaying messages to the user (e.g., upload status, errors).
    const [message, setMessage] = useState('');
    // State to indicate if an upload or processing operation is in progress.
    const [loading, setLoading] = useState(false);
    // State to track if the user has agreed to the data policy.
    const [hasAgreedToPolicy, setHasAgreedToPolicy] = useState(false);
    // State to control the visibility of the data policy modal.
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    // State to control the visibility of the tutorial modal for exporting chat history.
    const [showTutorialModal, setShowTutorialModal] = useState(false);

    // Base URL for API calls, retrieved from environment variables for production readiness.
    // For a strictly local-only project, this might default to a local address or be hardcoded if no external APIs are ever involved.
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'; // Assuming local FastAPI runs on 8000

    /**
     * Effect hook to manage data policy agreement.
     * Runs once on component mount.
     */
    useEffect(() => {
        // Check local storage for previous agreement to data policy.
        const agreed = localStorage.getItem('agreedToDataPolicy');
        if (agreed === 'true') {
            setHasAgreedToPolicy(true);
        } else {
            setShowPolicyModal(true); // Show policy modal if not agreed
        }
    }, []); // Empty dependency array means this effect runs once on mount.

    /**
     * Handles the selection of a file from the file input.
     * @param {Event} event - The change event from the file input.
     */
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMessage(''); // Clear any previous messages
    };

    /**
     * Sets the user's agreement to the data policy and hides the modal.
     */
    const handleAgreeToPolicy = () => {
        localStorage.setItem('agreedToDataPolicy', 'true');
        setHasAgreedToPolicy(true);
        setShowPolicyModal(false);
    };

    /**
     * Displays the data policy modal.
     * @param {Event} event - The click event.
     */
    const handleShowPolicy = (event) => {
        event.preventDefault(); // Prevent default link behavior
        setShowPolicyModal(true);
    };

    /**
     * Navigates to the donate page.
     */
    const handleDonateClick = () => {
        window.location.href = '/donate';
    };

    /**
     * Displays the chat history export tutorial modal.
     * @param {Event} event - The click event.
     */
    const handleShowTutorial = (event) => {
        event.preventDefault();
        setShowTutorialModal(true);
    };

    /**
     * Hides the tutorial modal.
     */
    const handleCloseTutorial = () => {
        setShowTutorialModal(false);
    };

    /**
     * Handles the form submission for file upload.
     * Validates input, shows loading state, and sends the file to the backend API.
     * @param {Event} event - The form submission event.
     */
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevent default form submission behavior

        // Input validation checks
        if (!selectedFile) {
            setMessage('Please select a file to upload.');
            return;
        }

        if (!hasAgreedToPolicy) {
            setMessage('Please agree to the data policy first.');
            setShowPolicyModal(true); // Re-show policy if not agreed
            return;
        }

        setLoading(true); // Set loading state
        setMessage('Uploading and processing chat history...');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Send file to the backend for processing
            const response = await fetch(`${API_BASE_URL}/upload_chat_history/`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                onFileUploadSuccess(data); // Call success callback with session data
            } else {
                setMessage(`Error: ${data.detail || 'Failed to upload file.'}`);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('Network error or server unavailable. Please ensure your local server is running.');
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    return (
        <div className="upload-form-container">
            <h2>Upload WhatsApp Chat History (.txt)</h2>
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

            {/* Links for Policy and Tutorial */}
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

            {/* Local Running Information */}
            <div className="run-locally-container">
                <h3>Running Locally</h3>
                <p>
                    This AI-powered person mimicry project is designed to run on your own machine.
                    If you're having trouble, troubleshoot instructions are available on our
                    <a href="https://github.com/BitWattr/BitWattr-Repo" target="_blank" rel="noopener noreferrer" className="inline-link"> GitHub repository</a>.
                    Alternatively, you can use our hosted service at:{' '}
                    <a href="https://chat-clone-ai.pages.dev/" target="_blank" rel="noopener noreferrer" className="inline-link">https://chat-clone-ai.pages.dev/</a>
                </p>
                <button
                    className="donate-button"
                    style={{
                        marginLeft: '10px',
                        background: 'linear-gradient(45deg, #FF6B6B, #FFD166)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        marginTop: '10px',
                        transition: 'transform 0.2s ease-in-out',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onClick={handleDonateClick}
                    aria-label="Donate to support the project"
                >
                    Donate to Support the Project
                </button>
            </div>

            {/* More About BitWattr Section */}
            <div className="more-about-bitwattr-container">
                <h3>More about the BitWattr Organization</h3>
                <a
                    href="https://bitwattr.netlify.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="visit-bitwattr-button"
                    style={{
                        background: 'linear-gradient(45deg, #FF6B6B, #FFD166, #4ECDC4, #4F80E4)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        marginTop: '10px',
                        transition: 'transform 0.2s ease-in-out',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    aria-label="Visit BitWattr Organization website"
                >
                    Visit BitWattr Organization
                </a>
            </div>

            {/* How this works? Section */}
            <div className="how-it-works-container">
                <h3>How this AI-powered Person Mimicry Project Works (Locally)?</h3>
                <p>This AI-powered person mimicry application, developed by the BitWattr organization, functions as follows:</p>
                <ol>
                    <li>
                        <b>Upload Chat History:</b> You start by uploading your WhatsApp chat history as a `.txt` file. Your locally running backend service, built with FastAPI, receives this file.
                    </li>
                    <li>
                        <b>Parse Chat Data:</b> The uploaded chat content is immediately parsed in-memory using a custom parser (`chat_parser.py` and `main.py`). This process extracts individual messages, their timestamps, and identifies all participants in the conversation.
                    </li>
                    <li>
                        <b>Session Management:</b> A unique session ID is generated for your parsed chat data. This session remains active for a limited time (30 minutes of inactivity), after which all associated data is automatically and permanently deleted from memory.
                    </li>
                    <li>
                        <b>Persona Selection:</b> Once the chat is parsed, you can select one of the participants as the "persona" that the AI will mimic. The other participant in the chat will be considered "You" for the AI's responses.
                    </li>
                    <li>
                        <b>AI Interaction:</b> When you send a message, it's added to the live chat history. This updated history, along with a system prompt instructing the AI to act as your chosen persona, is sent to a large language model (LLM) powered by Ollama (`llm_service.py`), running on your local machine.
                    </li>
                    <li>
                        <b>Generating Responses:</b> The LLM analyzes the conversation history and generates a response in the style and character of the selected persona. This response is then displayed in the chat interface.
                    </li>
                </ol>
                <p>Essentially, this project leverages your chat history to mimic a specific person on the fly, allowing it to generate responses that closely resemble how that person would communicate, all within your local environment.</p>
                <a
                    href="https://www.youtube.com/your-demo-video-link" // TODO: Replace with your actual YouTube demo link
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-demo-button"
                    style={{
                        background: '#FF0000',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        marginTop: '10px',
                        transition: 'transform 0.2s ease-in-out',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    aria-label="View demo video on YouTube"
                >
                    View Demo
                </a>
            </div>

            {/* Data Policy Modal */}
            <div className={`policy-modal-overlay ${showPolicyModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="policyModalTitle">
                <div className="policy-modal-content">
                    <h2 id="policyModalTitle">Terms and Conditions for Local Use</h2>
                    <p>By using this AI-powered person mimicry project, you ("the User") agree to be bound by the following terms and conditions. Please read them carefully before using our locally-run service.</p>

                    <h3>Service Provision (Local)</h3>
                    <p>This project is provided "as is" and "as available" for local execution on your machine without any guarantees or warranties, express or implied. We do not guarantee that the local service will be uninterrupted, error-free, or secure. Your use of the service is solely at your own risk.</p>

                    <h3>No Affiliation with WhatsApp</h3>
                    <p>This AI-powered person mimicry project is an independent service and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp LLC or Meta Platforms, Inc. All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.</p>

                    <h3>User Responsibility</h3>
                    <ul>
                        <li>You are solely responsible for the chat history files you upload to this project on your local machine.</li>
                        <li>You warrant that you have the necessary rights and permissions to upload and process the chat history files.</li>
                        <li>You understand that uploading chat history files may contain sensitive personal information. By proceeding, you acknowledge and accept all risks associated with providing such data.</li>
                        <li>The BitWattr organization and its developers/operators shall not be held responsible for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your local use of the service, including but not limited to, loss of data, loss of profits, or any other intangible losses.</li>
                    </ul>

                    <h3>Intellectual Property</h3>
                    <p>All content, features, and functionality provided as part of this project (excluding user-uploaded chat data) are owned by the BitWattr organization or its licensors and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>

                    <h3>Changes to Terms</h3>
                    <p>The BitWattr organization reserves the right to modify or replace these Terms and Conditions at any time. We will endeavor to provide reasonable notice prior to any new terms taking effect. Your continued use of the service after any such changes constitutes your acceptance of the new Terms and Conditions.</p>

                    <h3>Governing Law</h3>
                    <p>These Terms and Conditions shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

                    <hr /> {/* Separator */}

                    <h2>Data Privacy Policy for Local Use</h2>
                    <p>At the BitWattr organization, your privacy is paramount. This policy outlines how we handle your data when you use our AI-powered person mimicry project locally.</p>

                    <h3>Data Collection (Local)</h3>
                    <p>When you upload a WhatsApp chat history file, our *locally running* application temporarily processes its content *in memory* on your machine to extract messages and participant information.</p>

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
                    <p>You can see the source code, maintained by the BitWattr organization, here:</p>
                    <a
                        href="https://github.com/BitWattr/BitWattr-Repo" // TODO: Replace with your actual GitHub repo link
                        target="_blank"
                        rel="noopener noreferrer"
                        className="visit-github-button"
                        style={{
                            background: '#24292e',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            marginTop: '10px',
                            transition: 'transform 0.2s ease-in-out',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        aria-label="Visit GitHub repository for BitWattr Organization"
                    >
                        Visit Git Repo
                    </a>

                    <h3>Local Running Emphasis</h3>
                    <p>This project is designed to be run locally on your own machine, providing you with complete control over your data and allowing for 24/7 access without external server limitations. All chat history processing and AI interactions occur on your local system. Please refer to our GitHub repository for detailed local setup instructions.</p>

                    <h3>Consent</h3>
                    <p>By proceeding with the upload and use of this AI-powered person mimicry project *on your local machine*, you explicitly consent to the terms of this Data Privacy Policy.</p>
                    <button onClick={handleAgreeToPolicy} className="agree-button" aria-label="I agree to terms and conditions">
                        <FontAwesomeIcon icon={faCheckCircle} /> I Agree
                    </button>
                </div>
            </div>

            {/* Tutorial Modal */}
            <div className={`policy-modal-overlay ${showTutorialModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="tutorialModalTitle">
                <div className="policy-modal-content">
                    <h2 id="tutorialModalTitle">How to Export WhatsApp Chat History (.txt)</h2>
                    <p>Follow these steps to export your WhatsApp chat history as a .txt file:</p>

                    <ol>
                        <li>
                            <b>Open WhatsApp on your phone:</b> Go to the chat you want to export.
                            {/* TODO: Replace with actual image paths */}
                            <img src="https://placehold.co/400x200/cccccc/333333?text=WhatsApp+Chat+Screen" alt="WhatsApp Chat Screen Example" />
                        </li>
                        <li>
                            <b>Tap More Options:</b> In the chat, tap the three dots (More options) usually located in the top right corner.
                            {/* TODO: Replace with actual image paths */}
                            <img src="https://placehold.co/400x200/cccccc/333333?text=More+Options+Menu" alt="More Options Menu Example" />
                        </li>
                        <li>
                            <b>Select 'More':</b> From the dropdown menu, select 'More'.
                            {/* TODO: Replace with actual image paths */}
                            <img src="https://placehold.co/400x200/cccccc/333333?text=Select+More" alt="Select More Option Example" />
                        </li>
                        <li>
                            <b>Select 'Export chat':</b> Choose 'Export chat'.
                            {/* TODO: Replace with actual image paths */}
                            <img src="https://placehold.co/400x200/cccccc/333333?text=Export+Chat+Option" alt="Export Chat Option Example" />
                        </li>
                        <li>
                            <b>Choose 'Without Media':</b> Select the option "Without Media" to export only the text file. <i>This step is crucial.</i>
                            {/* TODO: Replace with actual image paths */}
                            <img src="https://placehold.co/400x200/cccccc/333333?text=Without+Media+Option" alt="Without Media Option Example" />
                        </li>
                        <li>
                            <b>Share/Save the file:</b> Choose where you want to save or share the `.txt` file (e.g., to your device's internal storage, email, or cloud storage).
                            {/* TODO: Replace with actual image paths */}
                            <img src="https://placehold.co/400x200/cccccc/333333?text=Share/Save+Option" alt="Share/Save Option Example" />
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