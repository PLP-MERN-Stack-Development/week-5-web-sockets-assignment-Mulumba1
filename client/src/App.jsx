// client/src/App.jsx
import React, { useEffect, useState } from 'react';
import { useSocket } from './socket'; // Adjusted import path to './socket'

function App() {
  const {
    socket,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    messages,
    users,
    typingUsers,
    setTyping,
  } = useSocket();

  const [username, setUsername] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(''); // For private messages
  const [privateMessageText, setPrivateMessageText] = useState('');

  // Handle message input change for typing indicator
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    // Debounce the typing event
    setTyping(e.target.value.length > 0);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && isConnected) {
      sendMessage(inputMessage);
      setInputMessage('');
      setTyping(false); // Ensure typing status is cleared after sending
    }
  };

  const handlePrivateMessage = () => {
    if (selectedRecipient && privateMessageText.trim() && isConnected) {
      sendMessage(privateMessageText, selectedRecipient); // This will call general sendMessage, but useSocket handles it
      // The useSocket's sendPrivateMessage needs to be used here
      // Let's ensure sendMessage is distinct from sendPrivateMessage, or overload it
      // For now, let's use the explicit sendPrivateMessage from the hook
      sendPrivateMessage(selectedRecipient, privateMessageText);
      setPrivateMessageText('');
      setTyping(false);
    }
  };

  const handleConnect = () => {
    if (username.trim()) {
      connect(username.trim()); // Connect with the entered username
    } else {
      alert('Please enter a username to connect!');
    }
  };

  return (
    <div className="chat-container">
      <h1>Real-Time Chat Application</h1>

      <p>
        Socket Status:{' '}
        <span style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
          {isConnected ? `Connected as ${username || socket.auth?.username || 'Guest'}` : 'Disconnected.'}
        </span>
      </p>

      {!isConnected ? (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginRight: '10px', padding: '8px' }}
            onKeyPress={(e) => { if (e.key === 'Enter') handleConnect(); }}
          />
          <button onClick={handleConnect} style={{ padding: '8px 15px' }}>
            Connect
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={disconnect}
            style={{ padding: '8px 15px', background: '#dc3545', color: 'white', marginBottom: '20px' }}
          >
            Disconnect
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            {/* Chat Messages Section */}
            <div style={{ flex: 2 }}>
              <h3>Public Chat:</h3>
              <div className="messages-box">
                {messages.length === 0 ? (
                  <p>No messages yet.</p>
                ) : (
                  messages.map((msg, index) => (
                    <div key={msg.id || index} className={`message ${msg.system ? 'system' : ''} ${msg.private ? 'private' : ''}`}>
                      {msg.system ? (
                        <em>{msg.message}</em>
                      ) : (
                        <>
                          <strong>{msg.sender}:</strong> {msg.message}
                          {msg.private && <small style={{marginLeft: '5px', color: '#888'}}> (Private to {msg.toUser || 'You'})</small>}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="message-input-area">
                <input
                  type="text"
                  placeholder="Type a public message..."
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
              {typingUsers.length > 0 && (
                <p style={{ fontStyle: 'italic', fontSize: '0.9em', color: '#555', marginTop: '10px' }}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </p>
              )}
            </div>

            {/* Online Users Section */}
            <div style={{ flex: 1 }}>
              <div className="user-list">
                <h4>Online Users ({users.length}):</h4>
                <ul>
                  {users.length === 0 ? (
                    <li>No other users online.</li>
                  ) : (
                    users.map((user) => (
                      <li key={user.id}>
                        <span>{user.username}</span> {user.id === socket.id && '(You)'}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Private Messaging Section */}
              <div style={{ marginTop: '20px', border: '1px solid #e0e0e0', padding: '15px', borderRadius: '5px', background: '#f9f9f9' }}>
                <h4>Send Private Message:</h4>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                >
                  <option value="">Select User</option>
                  {users
                    .filter(user => user.id !== socket.id) // Don't allow sending private to self
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  placeholder="Type private message..."
                  value={privateMessageText}
                  onChange={(e) => setPrivateMessageText(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handlePrivateMessage(); }}
                  style={{ width: '100%', marginBottom: '10px' }}
                />
                <button onClick={handlePrivateMessage} disabled={!selectedRecipient}>
                  Send Private
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;