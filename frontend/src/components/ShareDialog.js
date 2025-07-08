import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ShareDialog({ docId, token, onClose }) {
  const [sharedWith, setSharedWith] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchShared();
    // eslint-disable-next-line
  }, [docId]);

  const fetchShared = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/documents/${docId}/shared`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSharedWith(res.data.sharedWith);
    } catch (err) {
      setError('Failed to load shared users');
    }
    setLoading(false);
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.patch(`/api/documents/${docId}/share`, { email }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmail('');
      fetchShared();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share');
    }
  };

  const handleUnshare = async (emailToRemove) => {
    setError('');
    try {
      await axios.patch(`/api/documents/${docId}/unshare`, { email: emailToRemove }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchShared();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unshare');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        padding: '32px',
        minWidth: '450px',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#24292e'
          }}>
            🔗 Share Document
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#586069',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f6f8fa';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Share Form */}
        <form onSubmit={handleShare} style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <input
              type="email"
              placeholder="Enter user's email address..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0366d6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e1e5e9';
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: '#0366d6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease',
                opacity: loading ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0256cc';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#0366d6';
                }
              }}
            >
              {loading ? '🔄 Sharing...' : '➕ Share'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div style={{
            color: '#d73a49',
            backgroundColor: '#ffeef0',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #f97583',
            fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Shared Users List */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#24292e'
          }}>
            👥 Shared with:
          </h3>
          
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #e1e5e9',
            borderRadius: '8px',
            backgroundColor: '#f6f8fa'
          }}>
            {loading ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#586069'
              }}>
                🔄 Loading shared users...
              </div>
            ) : sharedWith.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#586069',
                fontSize: '14px'
              }}>
                📭 No users shared yet
              </div>
            ) : (
              sharedWith.map(user => (
                <div key={user._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid #e1e5e9',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#0366d6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <span style={{
                      fontSize: '14px',
                      color: '#24292e',
                      fontWeight: '500'
                    }}>
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnshare(user.email)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffeef0',
                      color: '#d73a49',
                      border: '1px solid #f97583',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#fce8e8';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#ffeef0';
                    }}
                  >
                    🚫 Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareDialog;
