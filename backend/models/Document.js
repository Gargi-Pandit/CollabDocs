const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  lastModified: { type: Date, default: Date.now },
  owner: { type: String }, // Optional: for future user association
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('Document', DocumentSchema);
