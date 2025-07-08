const Document = require('../models/Document');

// Simple in-memory debounce map (for demo; use Redis for production)
const debounceTimers = {};
// Track user count per document room (by userId, not socketId)
const documentUsers = {};
// Track socket to user mapping
const socketToUser = {};

module.exports = function(io) {
  io.on('connection', (socket) => {
    // Join a document room
    socket.on('join-document', (docId) => {
      socket.join(docId);
      
      // Get user ID from JWT token
      let userId = null;
      if (socket.handshake.auth && socket.handshake.auth.token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (err) {
          console.error('Invalid JWT token:', err);
        }
      }
      
      if (userId) {
        // Track user count by userId
        if (!documentUsers[docId]) {
          documentUsers[docId] = new Set();
        }
        documentUsers[docId].add(userId);
        socketToUser[socket.id] = { userId, docId };
        
        // Emit updated count to all users in the room
        const userCount = documentUsers[docId].size;
        console.log(`User ${userId} joined document ${docId}, total users: ${userCount}`);
        io.to(docId).emit('user-joined', userCount);
      }
    });

    // Handle edits
    socket.on('edit-document', async ({ docId, content }) => {
      // Broadcast to others in the room
      socket.to(docId).emit('document-updated', content);

      // Debounce save to DB
      if (debounceTimers[docId]) clearTimeout(debounceTimers[docId]);
      debounceTimers[docId] = setTimeout(async () => {
        // Try to get userId from handshake auth (if sent)
        const userId = socket.handshake.auth && socket.handshake.auth.token
          ? (() => {
              try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
                return decoded.userId;
              } catch {
                return null;
              }
            })()
          : null;
        if (!userId) return;
        // Only allow save if user is owner or sharedWith
        await Document.findOneAndUpdate(
          {
            _id: docId,
            $or: [
              { owner: userId },
              { sharedWith: userId },
            ],
          },
          {
            content,
            lastModified: Date.now(),
          }
        );
      }, 500); // 500ms debounce
    });

    // Handle comment events
    socket.on('comment-added', ({ docId, comment }) => {
      socket.to(docId).emit('comment-added', comment);
    });

    socket.on('comment-updated', ({ docId, comment }) => {
      socket.to(docId).emit('comment-updated', comment);
    });

    socket.on('comment-deleted', ({ docId, commentId }) => {
      socket.to(docId).emit('comment-deleted', commentId);
    });

    socket.on('comment-resolved', ({ docId, comment }) => {
      socket.to(docId).emit('comment-resolved', comment);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const userInfo = socketToUser[socket.id];
      if (userInfo) {
        const { userId, docId } = userInfo;
        
        // Check if this user has other connections to the same document
        const userConnections = Object.values(socketToUser).filter(
          info => info.userId === userId && info.docId === docId
        );
        
        // Only remove user if this was their last connection
        if (userConnections.length === 1) {
          documentUsers[docId].delete(userId);
          const userCount = documentUsers[docId].size;
          console.log(`User ${userId} left document ${docId}, total users: ${userCount}`);
          io.to(docId).emit('user-left', userCount);
          
          // Clean up empty rooms
          if (documentUsers[docId].size === 0) {
            delete documentUsers[docId];
          }
        }
        
        // Remove socket mapping
        delete socketToUser[socket.id];
      }
    });
  });
};
