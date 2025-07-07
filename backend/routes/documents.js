const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all documents for the authenticated user (owned or shared)
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
      ],
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a document by ID (if owned or shared)
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
      ],
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new document and assign to user
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = new Document({ title, content, owner: req.user.userId });
    await doc.save();
    await User.findByIdAndUpdate(req.user.userId, { $push: { documents: doc._id } });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a document (only if owned)
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { title, content, lastModified: Date.now() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a document (only if owned)
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await User.findByIdAndUpdate(req.user.userId, { $pull: { documents: doc._id } });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share a document with another user (only if owner)
router.patch('/:id/share', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const userToShare = await User.findOne({ email });
    if (!userToShare) return res.status(404).json({ error: 'User not found' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { $addToSet: { sharedWith: userToShare._id } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found or not owned by you' });
    res.json({ message: `Document shared with ${email}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unshare a document from a user (only if owner)
router.patch('/:id/unshare', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const userToRemove = await User.findOne({ email });
    if (!userToRemove) return res.status(404).json({ error: 'User not found' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { $pull: { sharedWith: userToRemove._id } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found or not owned by you' });
    res.json({ message: `Document unshared from ${email}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List users a document is shared with (owner only)
router.get('/:id/shared', auth, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.userId }).populate('sharedWith', 'email');
    if (!doc) return res.status(404).json({ error: 'Document not found or not owned by you' });
    res.json({ sharedWith: doc.sharedWith });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
