const Document = require('../models/Document');

// Simple in-memory debounce map (for demo; use Redis for production)
const debounceTimers = {};
// Track user count per document room
const documentUsers = {};

module.exports = function(io) {
  io.on('connection', (socket) => {
    // Join a document room
    socket.on('join-document', (docId) => {
      socket.join(docId);
      
      // Track user count
      if (!documentUsers[docId]) {
        documentUsers[docId] = new Set();
      }
      documentUsers[docId].add(socket.id);
      
      // Emit updated count to all users in the room
      const userCount = documentUsers[docId].size;
      io.to(docId).emit('user-joined', userCount);
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

    // Handle disconnection
    socket.on('disconnect', () => {
      // Remove user from all document rooms they were in
      Object.keys(documentUsers).forEach(docId => {
        if (documentUsers[docId].has(socket.id)) {
          documentUsers[docId].delete(socket.id);
          const userCount = documentUsers[docId].size;
          io.to(docId).emit('user-left', userCount);
          
          // Clean up empty rooms
          if (documentUsers[docId].size === 0) {
            delete documentUsers[docId];
          }
        }
      });
    });
  });
};
