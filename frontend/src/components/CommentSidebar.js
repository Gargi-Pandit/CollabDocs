import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';

// Function to decode JWT token
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

function CommentSidebar({ documentId, socketRef, isVisible, onToggle, selectedText }) {
  const { token } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  // Get user ID from token
  const user = token ? decodeToken(token) : null;

  useEffect(() => {
    if (documentId) {
      fetchComments();
    }
  }, [documentId]);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on('comment-added', (comment) => {
        setComments(prev => [comment, ...prev]);
      });

      socketRef.current.on('comment-updated', (updatedComment) => {
        setComments(prev => prev.map(c => 
          c._id === updatedComment._id ? updatedComment : c
        ));
      });

      socketRef.current.on('comment-deleted', (commentId) => {
        setComments(prev => prev.filter(c => c._id !== commentId));
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('comment-added');
        socketRef.current.off('comment-updated');
        socketRef.current.off('comment-deleted');
      }
    };
  }, [socketRef.current]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/comments?documentId=${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const res = await axios.post('/api/comments', {
        documentId,
        content: newComment,
        textSelection: selectedText || { start: 0, end: 0, text: '' }
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setNewComment('');
      socketRef.current.emit('comment-added', { docId: documentId, comment: res.data });
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    
    try {
      const res = await axios.post(`/api/comments/${commentId}/reply`, {
        content: replyText
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setReplyText('');
      setReplyingTo(null);
      socketRef.current.emit('comment-added', { docId: documentId, comment: res.data });
    } catch (err) {
      console.error('Failed to add reply:', err);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await axios.delete(`/api/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      socketRef.current.emit('comment-deleted', { docId: documentId, commentId });
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      width: '350px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderLeft: '1px solid #e1e5e9',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '-2px 0 5px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e1e5e9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>Comments</h3>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#586069'
          }}
        >
          ×
        </button>
      </div>

      {/* Add Comment */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e1e5e9' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '8px',
            border: '1px solid #e1e5e9',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: '#0366d6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Add Comment
        </button>
      </div>

      {/* Comments List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#586069' }}>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#586069' }}>No comments yet</div>
        ) : (
          comments.map(comment => (
            <div key={comment._id} style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e1e5e9',
              borderRadius: '6px'
            }}>
              {/* Comment Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {comment.author.email}
                </div>
                <div style={{ fontSize: '12px', color: '#586069' }}>
                  {formatDate(comment.createdAt)}
                </div>
              </div>

              {/* Comment Content */}
              <div style={{ marginBottom: '8px' }}>
                {comment.textSelection.text && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginBottom: '8px',
                    fontStyle: 'italic'
                  }}>
                    "{comment.textSelection.text}"
                  </div>
                )}
                <div>{comment.content}</div>
              </div>

              {/* Comment Actions */}
              <div style={{
                display: 'flex',
                gap: '8px',
                fontSize: '12px'
              }}>
                <button
                  onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0366d6',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Reply
                </button>
                {comment.author._id === user?.userId && (
                  <button
                    onClick={() => handleDelete(comment._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#d73a49',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Reply Form */}
              {replyingTo === comment._id && (
                <div style={{ marginTop: '8px' }}>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '6px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '4px',
                      resize: 'vertical',
                      fontSize: '12px'
                    }}
                  />
                  <div style={{ marginTop: '4px' }}>
                    <button
                      onClick={() => handleReply(comment._id)}
                      disabled={!replyText.trim()}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#0366d6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginRight: '8px'
                      }}
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: '12px', marginLeft: '16px' }}>
                  {comment.replies.map(reply => (
                    <div key={reply._id} style={{
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      borderLeft: '3px solid #0366d6'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          {reply.author.email}
                        </div>
                        <div style={{ fontSize: '10px', color: '#586069' }}>
                          {formatDate(reply.createdAt)}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px' }}>{reply.content}</div>
                      {reply.author._id === user?.userId && (
                        <button
                          onClick={() => handleDelete(reply._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#d73a49',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '10px',
                            marginTop: '4px'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentSidebar; 