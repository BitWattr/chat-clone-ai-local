import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faCheckCircle, faSpinner, faTimesCircle, faQuestionCircle, faPlayCircle, faCommentDots, faHandHoldingDollar, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'; // Added faChevronDown, faChevronUp
import { faGithub } from '@fortawesome/free-brands-svg-icons';

function UploadForm({ onFileUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasAgreedToPolicy, setHasAgreedToPolicy] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [showTutorialModal, setShowTutorialModal] = useState(false);
    const [showHighLoadModal, setShowHighLoadModal] = useState(false);
    const [demoChats, setDemoChats] = useState([]);
    const [loadingDemos, setLoadingDemos] = useState(true);

    // New states for text input section
    const [showTextInputSection, setShowTextInputSection] = useState(false);
    const [chatTextInput, setChatTextInput] = useState('');


    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        const agreed = localStorage.getItem('agreedToDataPolicy');
        if (agreed === 'true') {
            setHasAgreedToPolicy(true);
        } else {
            setShowPolicyModal(true);
        }

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
                setMessage('A connection error occurred while fetching demo chats.');
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
                if (response.status === 429 || response.status === 503 || (response.status >= 500 && response.status < 600)) {
                    setMessage('Our servers are currently experiencing high loads. Please try again later.');
                    setShowHighLoadModal(true);
                } else {
                    setMessage(`Error: ${data.detail || 'Failed to upload file.'}`);
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('A connection error occurred or our servers are experiencing high loads. Please try again later.');
            setShowHighLoadModal(true);
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
                if (response.status === 429 || response.status === 503 || (response.status >= 500 && response.status < 600)) {
                    setMessage('Our servers are currently experiencing high loads. Please try again later.');
                    setShowHighLoadModal(true);
                } else {
                    setMessage(`Error loading demo: ${data.detail || 'Failed to load demo chat.'}`);
                }
            }
        } catch (error) {
            console.error('Error loading demo chat:', error);
            setMessage('A connection error occurred or our servers are experiencing high loads. Please try again later.');
            setShowHighLoadModal(true);
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

        // Create a Blob from the text input to simulate a file
        const file = new Blob([chatTextInput], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', file, 'pasted_chat.txt'); // Provide a filename

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
                if (response.status === 429 || response.status === 503 || (response.status >= 500 && response.status < 600)) {
                    setMessage('Our servers are currently experiencing high loads. Please try again later.');
                    setShowHighLoadModal(true);
                } else {
                    setMessage(`Error: ${data.detail || 'Failed to process pasted data.'}`);
                }
            }
        } catch (error) {
            console.error('Error processing pasted data:', error);
            setMessage('A connection error occurred or our servers are experiencing high loads. Please try again later.');
            setShowHighLoadModal(true);
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
                        <p>No demo chats available at the moment.</p>
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
                    <h3>Run this Project Locally</h3>
                    <p>You can always run this AI-powered person mimicry project on your own machine. This ensures full control over your data and allows for 24/7 access without server limitations. Visit GitHub for local setup instructions.</p>
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
                        <FontAwesomeIcon icon={faHandHoldingDollar} /> Donate to keep us online
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
                            marginLeft: '10px', /* Add margin-left for spacing */
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
                    <h3>How this AI-powered Person Mimicry Project Works?</h3>
                    <p>This AI-powered person mimicry application, developed by the BitWattr organization, functions as follows:</p>
                    <ol>
                        <li>
                            <b>Upload Chat History / Select Demo:</b> You start by uploading your chat history as a `.txt` file or selecting one of our provided demo chats. Our serverless backend, powered by Cloudflare Workers, receives this data.
                        </li>
                        <li>
                            <b>Parse Chat Data:</b> The chat content (uploaded or demo) is immediately parsed for temporary processing using a custom parser. This process extracts individual messages, their timestamps, and identifies all participants in the conversation.
                        </li>
                        <li>
                            <b>Session Management:</b> A unique session ID is generated for your parsed chat data. This session remains active for a limited time (15 minutes of inactivity), after which all associated data is automatically deleted from our temporary processing environment. We cannot guarantee that this data is never stored by Cloudflare, nor can we guarantee it is held only as in-process data for a temporary duration within Cloudflare's systems.
                        </li>
                        <li>
                            <b>Persona Selection:</b> Once the chat is parsed, you can select one of the participants as the "persona" that the AI will mimic. The other participant in the chat will be considered "You" for the AI's responses.
                        </li>
                        <li>
                            <b>AI Interaction:</b> When you send a message, it's added to the live chat history. This updated history, along with a system prompt instructing the AI to act as your chosen persona, is sent to a large language model (LLM) powered by Cloudflare Workers AI using the `llama-3.2-3b-instruct` model.
                        </li>
                        <li>
                            <b>Generating Responses:</b> The LLM analyzes the conversation history and generates a response in the style and character of the selected persona. This response is then displayed in the chat interface.
                        </li>
                    </ol>
                    <p>Essentially, this project leverages your chat history to enable a local AI model on the fly, allowing it to generate responses that closely resemble how a specific person from your chat would communicate.</p>

                </div>
            </div>

            {/* Data Policy Modal */}
            <div className={`policy-modal-overlay ${showPolicyModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="policyModalTitle">
                <div className="policy-modal-content">
                    <h2 id="policyModalTitle">Terms and Conditions</h2>
                    <p>By using this AI-powered person mimicry project, you ("the User") agree to be bound by the following terms and conditions. Please read them carefully before using our service.</p>

                    <h3>Service Provision and Disclaimer</h3>
                    <p>This project is provided "as is" and "as available" without any guarantees or warranties, express or implied. We leverage Cloudflare Pages for frontend hosting and Cloudflare Workers for our serverless backend, including Cloudflare Workers AI for AI model inference. As the BitWattr organization, we do not have full knowledge or control over Cloudflare's specific data processing policies, terms of service, or their underlying infrastructure beyond the documented features of their platforms. We cannot and do not assume responsibility for Cloudflare's actions or the intricacies of their services. While these platforms are designed for high availability, we do not guarantee that the service will be uninterrupted, error-free, or secure. <b>Your use of this service, including all data provided, is entirely at your own risk.</b></p>
                    <p>For information regarding Cloudflare's data processing and terms, please refer to their official documentation. We strongly recommend reviewing them independently.</p>
                    <p><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare Privacy Policy</a> | <a href="https://www.cloudflare.com/terms/" target="_blank" rel="noopener noreferrer">Cloudflare Terms of Service</a></p>


                    <h3>No Affiliation</h3>
                    <p>This AI-powered person mimicry project is an independent service and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with any messaging platforms. All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.</p>

                    <h3>User Responsibility and Acknowledgment of Risk</h3>
                    <ul>
                        <li>You are solely responsible for the chat history files you upload to this project.</li>
                        <li>You warrant that you have the necessary rights and permissions to upload and process the chat history files.</li>
                        <li>You understand that uploading chat history files may contain sensitive personal information. By proceeding, you acknowledge and accept all risks associated with providing such data, including but not limited to potential data breaches, unauthorized access, or unintended disclosures. The BitWattr organization is not responsible for any such events.</li>
                        <li>**You acknowledge that the AI-powered persona mimicry may generate responses of high fidelity, potentially leading to the perception of "real" communication from the mimicked individual. You are solely responsible for understanding and accepting any and all consequences, issues, or implications arising from the use or interpretation of such AI-generated content. The BitWattr organization and its contributors are not responsible for any outcomes, misunderstandings, or damages resulting from the quality or perception of the AI's mimicry.**</li>
                    </ul>

                    <h3>Intellectual Property</h3>
                    <p>The software code, design, and original content of this project (excluding user-uploaded chat data) are copyrighted by the individual contributors to the BitWattr organization and are protected by international copyright laws. Use of these materials is governed by the project's open-source license.</p>

                    <h3>Changes to Terms</h3>
                    <p>The BitWattr organization reserves the right to modify or replace these Terms and Conditions at any time. We will endeavor to provide reasonable notice prior to any new terms taking effect. Your continued use of the service after any such changes constitutes your acceptance of the new Terms and Conditions.</p>

                    <h3>Governing Law</h3>
                    <p>These Terms and Conditions shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

                    <hr />

                    <h2>Data Privacy Policy</h2>
                    <p>At the BitWattr organization, your privacy is paramount. This policy outlines how we handle your data when you use our AI-powered person mimicry project.</p>

                    <h3>Data Collection</h3>
                    <p>When you upload a chat history file, we initiate its temporary processing using Cloudflare Workers to extract messages and participant information. As the BitWattr organization, we utilize Cloudflare's platform for this processing and rely on their infrastructure. We do not have direct control over the internal workings or specific data handling practices of Cloudflare beyond what is publicly documented and exposed through their APIs. Therefore, we urge users to consult Cloudflare's own privacy policies for a comprehensive understanding of their data practices, as we cannot fully guarantee or be held responsible for how Cloudflare handles data within their systems. Your use of this service acknowledges that you accept this reliance on Cloudflare and their policies.</p>

                    <h3>Data Usage</h3>
                    <p>The extracted chat data is used exclusively for the purpose of analyzing your chat history and facilitating interactive chat sessions with our AI personas within your active session. Our AI model, `llama-3.2-3b-instruct`, is powered by Cloudflare Workers AI to generate responses based on your chat data.</p>

                    <h3>Data Retention and Deletion</h3>
                    <ul>
                        <li>Your uploaded chat history files and the processed chat data are automatically targeted for deletion from our temporary processing environment after a period of inactivity. We cannot ensure that this data is never stored permanently by Cloudflare, nor can we ensure it is held only as in-process data for a strictly temporary duration within Cloudflare's systems.</li>
                        <li>While this system is designed for your session data to be automatically deleted after 15 minutes of inactivity, we cannot provide an absolute guarantee of this deletion with 100% certainty due to the inherent complexities of distributed systems, the ephemeral nature of third-party serverless infrastructure (Cloudflare), and potential unforeseen technical anomalies. Users should understand that this automated deletion is a best-effort process and use the service at their own discretion and risk.</li>
                    </ul>

                    <h3>No Data Sharing Assurance</h3>
                    <p>The BitWattr organization does not share, sell, rent, or trade your chat data with any third parties for any purpose whatsoever. However, we cannot guarantee that Cloudflare, as our infrastructure provider, will not sell, rent, or share your data in accordance with their own terms and policies. We recommend reviewing Cloudflare's data policies directly to understand their practices.</p>

                    <h3>Security Measures</h3>
                    <p>We leverage the security features provided by Cloudflare Pages and Cloudflare Workers to protect your data during its temporary processing. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, and rely on Cloudflare's security assurances, we cannot guarantee its absolute security, nor can we be held responsible for security breaches or data handling practices originating from Cloudflare's infrastructure beyond our control. Your use of this service acknowledges and accepts these inherent risks.</p>

                    <h3>Transparency</h3>
                    <p>The functionality of this project that can be run locally is available on GitHub. This local version is a separate build, potentially using different languages and technologies, and does not provide insight into the specific operational code or data handling practices of the online web service. Therefore, the local version does not offer transparency into how data is processed or handled by our web service deployed on Cloudflare.</p>
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
                    <p>This project utilizes Cloudflare Pages for frontend and Cloudflare Workers for its backend, including Cloudflare Workers AI for its AI model. While these serverless platforms offer good scalability and availability, they still operate within certain limitations and are subject to Cloudflare's own terms and service level agreements. We cannot guarantee continuous online availability. We strongly encourage users who require guaranteed 24/7 access, desire full transparency over data handling, or prefer complete control over their data to run this project locally on their own machines by accessing our GitHub repository.</p>

                    <h3>Consent</h3>
                    <p>By proceeding with the upload and use of this AI-powered person mimicry project, you explicitly consent to the terms of this Data Privacy Policy, understanding and accepting the inherent risks and limitations outlined herein, including those related to our reliance on Cloudflare's infrastructure.</p>
                    <button onClick={handleAgreeToPolicy} className="agree-button" aria-label="I agree to terms and conditions">
                        <FontAwesomeIcon icon={faCheckCircle} /> I Agree
                    </button>
                </div>
            </div>

            {/* Server High Load Modal (Modified to replace old offline modal) */}
            <div className={`policy-modal-overlay ${showHighLoadModal ? 'visible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="highLoadModalTitle">
                <div className="policy-modal-content">
                    <h2 id="highLoadModalTitle"><FontAwesomeIcon icon={faTimesCircle} style={{ color: 'var(--secondary-accent)' }} /> Error</h2>
                    <p>Our backend, is currently experiencing high loads or an internal error. Please verify your entered data are correct and try again.</p>
                    <p>As a small project, We operate within certain usage tiers. Your support can help us provide 24/7 access by covering platform costs!</p>
                    <button className="donate-button" onClick={handleDonateClick} aria-label="Donate to keep us online"><FontAwesomeIcon icon={faHandHoldingDollar} /> Donate to keep us online</button>
                    <p>You can always run this locally!</p>
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
                    <button onClick={handleCloseHighLoadModal} className="agree-button" style={{ marginTop: '20px' }} aria-label="Close high load message">
                        Close
                    </button>
                </div>
            </div>


            {/* Tutorial Modal (remains unchanged) */}
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