const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Use CORS middleware for Express routes (if any)
app.use(cors({
    origin: 'http://localhost:5173', // Allow your React app to connect
    methods: ["GET", "POST"]
}));

// Initialize Socket.io server
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Socket.io CORS for WebSocket handshakes
        methods: ["GET", "POST"]
    }
});

// Store connected users by their socket ID
const connectedUsers = new Map(); // Map<socketId, { username, socketId }>

// Utility function to get current list of online users
const getOnlineUsers = () => {
    const users = [];
    for (const [id, user] of connectedUsers.entries()) {
        users.push({ id: user.socketId, username: user.username });
    }
    return users;
};

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user joins (typically on client's "Connect" action)
  socket.on('user_join', (username) => {
    socket.username = username; // Attach username to socket object for easy access
    connectedUsers.set(socket.id, { username, socketId: socket.id });

    console.log(`${username} joined with ID: ${socket.id}`);

    // Inform all clients (including the new one) about the updated user list
    io.emit('user_list', getOnlineUsers());

    // Broadcast to all other clients that a new user joined
    socket.broadcast.emit('user_joined', { username: socket.username, id: socket.id });
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.username) {
      connectedUsers.delete(socket.id); // Remove user from map
      // Inform all clients about the updated user list
      io.emit('user_list', getOnlineUsers());
      // Broadcast to all other clients that a user left
      io.emit('user_left', { username: socket.username, id: socket.id });
    }
  });

  // Listen for 'send_message' from client (public chat)
  socket.on('send_message', (data) => {
    const sender = socket.username || 'Anonymous';
    console.log(`Message from ${sender}: ${data.message}`);
    // Emit 'receive_message' to ALL connected clients
    io.emit('receive_message', {
      id: Date.now(), // Simple unique ID
      sender: sender,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  });

  // Listen for 'private_message' from client
  socket.on('private_message', ({ to, message }) => {
    const sender = socket.username || 'Anonymous';
    const recipientSocket = io.sockets.sockets.get(to); // Get the recipient's socket object

    if (recipientSocket) {
      console.log(`Private message from ${sender} to ${recipientSocket.username || to}: ${message}`);

      // Send message to recipient
      recipientSocket.emit('private_message', {
        id: Date.now(),
        sender: sender,
        message: message,
        timestamp: new Date().toISOString(),
        toUser: recipientSocket.username, // Include recipient's username for UI
      });

      // Send message back to sender (so they see their own private message in their chat)
      socket.emit('private_message', {
        id: Date.now(),
        sender: sender,
        message: message,
        timestamp: new Date().toISOString(),
        toUser: recipientSocket.username, // Include recipient's username for UI
      });
    } else {
      console.log(`Private message attempt failed: Recipient ${to} not found.`);
      socket.emit('receive_message', { // Send a system message back to sender
        id: Date.now(),
        system: true,
        message: `User ${to} is no longer online or does not exist.`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (socket.username) {
        // Broadcast typing status to everyone except the sender
        socket.broadcast.emit('typing_users', { username: socket.username, isTyping });
    }
  });

});

const PORT = process.env.PORT || 5000; // Use port 5000 as defined in client's SOCKET_URL
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Client expected at http://localhost:5173/`);
});