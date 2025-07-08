import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import { io } from 'socket.io-client';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, CompositeDecorator, Modifier } from 'draft-js';
import 'draft-js/dist/Draft.css';
import CommentSidebar from '../components/CommentSidebar';

const SOCKET_URL = 'http://localhost:5000';

// Custom font size styles
const fontSizeStyleMap = {
  'FONT_SIZE_12': { fontSize: '12px' },
  'FONT_SIZE_14': { fontSize: '14px' },
  'FONT_SIZE_16': { fontSize: '16px' },
  'FONT_SIZE_18': { fontSize: '18px' },
  'FONT_SIZE_20': { fontSize: '20px' },
  'FONT_SIZE_24': { fontSize: '24px' },
};

function EditorPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [userCount, setUserCount] = useState(1);
  const [currentFontSize, setCurrentFontSize] = useState('FONT_SIZE_16');
  const [showComments, setShowComments] = useState(false);
  const [selectedText, setSelectedText] = useState(null);
  const [showCommentButton, setShowCommentButton] = useState(false);
  const socketRef = useRef(null);
  const saveTimeout = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDoc();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current.emit('join-document', id);
    
    socketRef.current.on('document-updated', (newContent) => {
      try {
        const contentState = convertFromRaw(JSON.parse(newContent));
        setEditorState(EditorState.createWithContent(contentState));
        setStatus('Updated by collaborator');
      } catch (err) {
        console.error('Error parsing document content:', err);
      }
    });
    
    socketRef.current.on('user-joined', (count) => {
      console.log('User joined, count:', count);
      setUserCount(count);
      setStatus(`${count} people editing`);
    });
    
    socketRef.current.on('user-left', (count) => {
      console.log('User left, count:', count);
      setUserCount(count);
      setStatus(`${count} people editing`);
    });
    
    return () => {
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [id, token]);

  const fetchDoc = async () => {
    try {
      const res = await axios.get(`/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTitle(res.data.title);
      
      // Convert stored content to Draft.js state
      if (res.data.content) {
        try {
          const contentState = convertFromRaw(JSON.parse(res.data.content));
          setEditorState(EditorState.createWithContent(contentState));
        } catch (err) {
          // If content is not in Draft.js format, create empty state
          setEditorState(EditorState.createEmpty());
        }
      } else {
        setEditorState(EditorState.createEmpty());
      }
    } catch (err) {
      setError('You do not have access to this document.');
      setTimeout(() => navigate('/documents'), 2000);
    }
  };

  const handleEditorChange = (newEditorState) => {
    setEditorState(newEditorState);
    setStatus('Saving...');
    
    // Check for text selection
    const selection = newEditorState.getSelection();
    if (!selection.isCollapsed()) {
      const contentState = newEditorState.getCurrentContent();
      const startKey = selection.getStartKey();
      const endKey = selection.getEndKey();
      const startOffset = selection.getStartOffset();
      const endOffset = selection.getEndOffset();
      
      let selectedText = '';
      let currentKey = startKey;
      let currentOffset = startOffset;
      
      while (currentKey !== endKey || currentOffset < endOffset) {
        const block = contentState.getBlockForKey(currentKey);
        const text = block.getText();
        
        if (currentKey === startKey && currentKey === endKey) {
          selectedText = text.substring(startOffset, endOffset);
        } else if (currentKey === startKey) {
          selectedText = text.substring(startOffset);
        } else if (currentKey === endKey) {
          selectedText += text.substring(0, endOffset);
        } else {
          selectedText += text;
        }
        
        if (currentKey !== endKey) {
          const nextKey = contentState.getKeyAfter(currentKey);
          currentKey = nextKey;
          currentOffset = 0;
        } else {
          currentOffset = endOffset;
        }
      }
      
      if (selectedText.trim()) {
        setSelectedText({
          text: selectedText,
          start: startOffset,
          end: endOffset
        });
        setShowCommentButton(true);
      } else {
        setSelectedText(null);
        setShowCommentButton(false);
      }
    } else {
      setSelectedText(null);
      setShowCommentButton(false);
    }
    
    // Convert to raw content for storage
    const contentState = newEditorState.getCurrentContent();
    const rawContent = convertToRaw(contentState);
    
    socketRef.current.emit('edit-document', { 
      docId: id, 
      content: JSON.stringify(rawContent) 
    });
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setStatus('All changes saved');
    }, 700);
  };

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      handleEditorChange(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const applyFormatting = (command) => {
    const newState = RichUtils.toggleInlineStyle(editorState, command);
    handleEditorChange(newState);
  };

  const applyFontSize = (fontSize) => {
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    
    if (selection.isCollapsed()) {
      // No text selected, apply to new text
      const newState = RichUtils.toggleInlineStyle(editorState, fontSize);
      handleEditorChange(newState);
    } else {
      // Text selected, apply to selection
      const newContentState = Object.keys(fontSizeStyleMap).reduce((content, size) => {
        return Modifier.removeInlineStyle(content, selection, size);
      }, contentState);
      
      const newContentStateWithFontSize = Modifier.applyInlineStyle(
        newContentState,
        selection,
        fontSize
      );
      
      const newState = EditorState.push(editorState, newContentStateWithFontSize, 'change-inline-style');
      handleEditorChange(newState);
    }
    
    setCurrentFontSize(fontSize);
  };

  const handleBold = () => {
    applyFormatting('BOLD');
  };

  const handleItalic = () => {
    applyFormatting('ITALIC');
  };

  const handleUnderline = () => {
    applyFormatting('UNDERLINE');
  };

  const isFormatActive = (format) => {
    const currentStyle = editorState.getCurrentInlineStyle();
    return currentStyle.has(format);
  };

  const getCurrentFontSize = () => {
    const currentStyle = editorState.getCurrentInlineStyle();
    for (const [style, _] of Object.entries(fontSizeStyleMap)) {
      if (currentStyle.has(style)) {
        return style;
      }
    }
    return 'FONT_SIZE_16';
  };

  const getEditorStyle = () => ({
    width: '100%',
    minHeight: '500px',
    padding: '20px',
    border: '1px solid #e1e5e9',
    borderRadius: '8px',
    backgroundColor: '#fafbfc',
    color: '#24292e',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineHeight: '1.5',
    outline: 'none',
    overflowY: 'auto',
  });

  return (
    <div style={{ maxWidth: showComments ? 'calc(100vw - 350px)' : '1000px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, color: '#24292e', fontSize: '24px' }}>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#586069'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#28a745', 
              borderRadius: '50%' 
            }}></div>
            {userCount} {userCount === 1 ? 'person' : 'people'} editing
          </div>
          <button 
            onClick={() => setShowComments(!showComments)}
            style={{
              padding: '8px 16px',
              backgroundColor: showComments ? '#28a745' : '#0366d6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showComments ? 'Hide Comments' : 'Show Comments'}
          </button>
          <button 
            onClick={() => navigate('/documents')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0366d6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Back to Documents
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          color: '#d73a49', 
          backgroundColor: '#ffeef0',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Comment Button (floating) */}
      {showCommentButton && selectedText && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          backgroundColor: '#ffffff',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '400px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <strong>Selected text:</strong>
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '8px',
              borderRadius: '4px',
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              "{selectedText.text}"
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShowComments(true);
                setShowCommentButton(false);
              }}
              style={{
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
            <button
              onClick={() => setShowCommentButton(false)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <label style={{ fontSize: '14px', color: '#586069' }}>Font Size:</label>
        <select 
          value={getCurrentFontSize()}
          onChange={(e) => applyFontSize(e.target.value)}
          style={{
            padding: '4px 8px',
            border: '1px solid #e1e5e9',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="FONT_SIZE_12">12px</option>
          <option value="FONT_SIZE_14">14px</option>
          <option value="FONT_SIZE_16">16px</option>
          <option value="FONT_SIZE_18">18px</option>
          <option value="FONT_SIZE_20">20px</option>
          <option value="FONT_SIZE_24">24px</option>
        </select>

        <button
          onClick={handleBold}
          style={{
            padding: '6px 12px',
            backgroundColor: isFormatActive('BOLD') ? '#0366d6' : '#f6f8fa',
            color: isFormatActive('BOLD') ? 'white' : '#24292e',
            border: '1px solid #e1e5e9',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          B
        </button>

        <button
          onClick={handleItalic}
          style={{
            padding: '6px 12px',
            backgroundColor: isFormatActive('ITALIC') ? '#0366d6' : '#f6f8fa',
            color: isFormatActive('ITALIC') ? 'white' : '#24292e',
            border: '1px solid #e1e5e9',
            borderRadius: '4px',
            cursor: 'pointer',
            fontStyle: 'italic',
            fontSize: '14px'
          }}
        >
          I
        </button>

        <button
          onClick={handleUnderline}
          style={{
            padding: '6px 12px',
            backgroundColor: isFormatActive('UNDERLINE') ? '#0366d6' : '#f6f8fa',
            color: isFormatActive('UNDERLINE') ? 'white' : '#24292e',
            border: '1px solid #e1e5e9',
            borderRadius: '4px',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '14px'
          }}
        >
          U
        </button>

        <div style={{ 
          marginLeft: 'auto',
          fontSize: '14px',
          color: '#586069'
        }}>
          {status}
        </div>
      </div>

      {/* Draft.js Editor */}
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={getEditorStyle()}>
          <Editor
            editorState={editorState}
            onChange={handleEditorChange}
            handleKeyCommand={handleKeyCommand}
            placeholder="Start typing your document..."
            customStyleMap={fontSizeStyleMap}
          />
        </div>
      </div>

      {/* Comment Sidebar */}
      <CommentSidebar
        documentId={id}
        socketRef={socketRef}
        isVisible={showComments}
        onToggle={() => setShowComments(!showComments)}
        selectedText={selectedText}
      />
    </div>
  );
}

export default EditorPage;
