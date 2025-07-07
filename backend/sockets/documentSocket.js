const Document = require('../models/Document');

// Simple in-memory debounce map (for demo; use Redis for production)
const debounceTimers = {};

module.exports = function(io) {
  io.on('connection', (socket) => {
    // Join a document room
    socket.on('join-document', (docId) => {
      socket.join(docId);
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

    // Optionally handle disconnects, etc.
  });
};
