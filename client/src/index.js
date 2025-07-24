// client/src/socket/index.js - Socket.io client setup

import { io } from 'socket.io-client';
import { useEffect, useState, useRef } from 'react'; // Added useRef for typing indicator debounce

// Socket.io connection URL
// Ensure VITE_SOCKET_URL is set in a .env file in your client root, e.g., VITE_SOCKET_URL=http://localhost:5000
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null); // Useful for single-message events
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]); // List of online users
  const [typingUsers, setTypingUsers] = useState([]); // List of users currently typing

  // For debouncing typing events
  const typingTimeoutRef = useRef(null);

  // Connect to socket server
  const connect = (username) => {
    socket.connect();
    if (username) {
      socket.auth = { username }; // Set auth credentials for authentication on server
      socket.emit('user_join', username); // Inform server about user joining
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
    setMessages([]); // Clear messages on disconnect
    setUsers([]); // Clear users on disconnect
    setTypingUsers([]); // Clear typing users
  };

  // Send a message
  const sendMessage = (messageContent) => {
    // Only emit if connected and message isn't empty
    if (socket.connected && messageContent.trim()) {
      socket.emit('send_message', { message: messageContent });
      setTyping(false); // Stop typing after sending message
    }
  };

  // Send a private message
  const sendPrivateMessage = (toSocketId, messageContent) => {
    if (socket.connected && messageContent.trim() && toSocketId) {
      socket.emit('private_message', { to: toSocketId, message: messageContent });
      setTyping(false);
    }
  };

  // Set typing status (debounced)
  const setTyping = (isTyping) => {
    if (socket.connected) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTyping) {
        socket.emit('typing', true);
        // Set a timeout to automatically stop typing after a few seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', false);
        }, 3000); // Stop typing after 3 seconds of no new input
      } else {
        socket.emit('typing', false);
      }
    }
  };


  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
      console.log('Socket Connected:', socket.id);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Socket Disconnected');
    };

    const onConnectError = (error) => {
        console.error('Socket Connection Error:', error);
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, { ...message, private: true }]); // Mark as private
    };

    // User events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    // Typing events
    const onTypingUsers = (usersData) => {
        // usersData is an array of { username, isTyping }
        const currentlyTypingUsernames = usersData
            .filter(u => u.isTyping && u.username !== socket.auth?.username) // Exclude self
            .map(u => u.username);
        setTypingUsers(currentlyTypingUsernames);
    };


    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError); // Listen for connection errors
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
    };
  }, []); // Empty dependency array means this runs once on mount

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
  };
};

export default socket; // Export the socket instance directly as well