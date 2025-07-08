const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Document = require('../models/Document');
const auth = require('../middleware/auth');

// Get all comments for a document
router.get('/', auth, async (req, res) => {
  try {
    const { documentId } = req.query;
    
    // Check if user has access to the document
    const doc = await Document.findOne({
      _id: documentId,
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
      ],
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }
    
    const comments = await Comment.find({ document: documentId })
      .populate('author', 'email')
      .populate('replies')
      .populate({
        path: 'replies',
        populate: { path: 'author', select: 'email' }
      })
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new comment
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, content, textSelection } = req.body;
    
    // Check if user has access to the document
    const doc = await Document.findOne({
      _id: documentId,
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
      ],
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }
    
    const comment = new Comment({
      document: documentId,
      author: req.user.userId,
      content,
      textSelection
    });
    
    await comment.save();
    
    // Populate author info before sending response
    await comment.populate('author', 'email');
    
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a comment (only by author)
router.put('/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, author: req.user.userId },
      { content, updatedAt: Date.now() },
      { new: true }
    ).populate('author', 'email');
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }
    
    res.json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a comment (only by author)
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({
      _id: req.params.id,
      author: req.user.userId
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }
    
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a reply to a comment
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const parentComment = await Comment.findById(req.params.id);
    
    if (!parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }
    
    // Check if user has access to the document
    const doc = await Document.findOne({
      _id: parentComment.document,
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
      ],
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }
    
    const reply = new Comment({
      document: parentComment.document,
      author: req.user.userId,
      content,
      textSelection: parentComment.textSelection // Reply uses same text selection
    });
    
    await reply.save();
    
    // Add reply to parent comment
    parentComment.replies.push(reply._id);
    await parentComment.save();
    
    // Populate author info
    await reply.populate('author', 'email');
    
    res.status(201).json(reply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 