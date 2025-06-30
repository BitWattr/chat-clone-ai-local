import React from 'react';
import Chat from './Chat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons'; // Changed faWhatsapp to faComment

/**
 * PersonaChatLayout (Desktop only)
 * Shows persona selection as a sidebar and chat as main area, like WhatsApp desktop.
 * @param {object} props
 * @param {string[]} props.participants
 * @param {string} props.selectedPersona
 * @param {function} props.onSelectPersona
 * @param {function} props.onUploadAgain
 * @param {object} props.sessionData
 * @param {function} props.onBackToPersonaSelection
 */
function PersonaChatLayout({ participants, selectedPersona, onSelectPersona, onUploadAgain, sessionData, onBackToPersonaSelection }) {
  return (
    <div className="persona-chat-layout">
      <aside className="persona-sidebar">
        <h2>Chat with:</h2>
        {participants.map((participant) => (
          <button
            key={participant}
            onClick={() => onSelectPersona(participant)}
            className={`persona-button${selectedPersona === participant ? ' selected' : ''}`}
            aria-label={`Chat with ${participant}`}
          >
            <FontAwesomeIcon icon={faComment} /> {participant} {/* Changed icon */}
          </button>
        ))}
        <button
          onClick={onUploadAgain}
          className="upload-again-button"
          aria-label="Upload another chat file"
        >
          Upload Another Chat / Try Another Demo
        </button>
      </aside>
      <main className="persona-chat-main">
        {selectedPersona ? (
          <Chat
            sessionId={sessionData.sessionId}
            persona={selectedPersona}
            participants={sessionData.participants}
            onBack={onBackToPersonaSelection}
          />
        ) : (
          <div className="no-persona-selected">&nbsp;&nbsp;&nbsp;&nbsp;Select a persona to start chatting.&nbsp;&nbsp;&nbsp;&nbsp;</div>
        )}
      </main>
    </div>
  );
}

export default PersonaChatLayout;
