import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import ShareDialog from '../components/ShareDialog';

function DocumentsPage() {
  const { token, logout } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const [shareDocId, setShareDocId] = useState(null);

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(res.data);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/documents', { title }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTitle('');
      setDocs([res.data, ...docs]);
    } catch (err) {
      setError('Failed to create document');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(docs.filter(doc => doc._id !== docId));
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast('Link copied to clipboard!');
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwner = (doc) => {
    try {
      const userId = JSON.parse(atob(token.split('.')[1])).userId;
      return doc.owner === userId;
    } catch {
      return false;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f6f8fa',
      padding: '20px'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#28a745',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2000,
          fontSize: '14px',
          fontWeight: '500',
          animation: 'slideIn 0.3s ease'
        }}>
          ✅ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '600',
              color: '#24292e'
            }}>
              📄 My Documents
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              color: '#586069',
              fontSize: '16px'
            }}>
              Create, edit, and collaborate on documents
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f6f8fa',
              color: '#586069',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#e1e5e9';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#f6f8fa';
            }}
          >
            👤 Logout
          </button>
        </div>

        {/* Create Document Form */}
        <form onSubmit={handleCreate} style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <input
            type="text"
            placeholder="Enter document title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
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
            style={{
              padding: '12px 24px',
              backgroundColor: '#0366d6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#0256cc';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#0366d6';
            }}
          >
            ➕ Create Document
          </button>
        </form>

        {error && (
          <div style={{
            color: '#d73a49',
            backgroundColor: '#ffeef0',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #f97583'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Documents Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#586069',
            fontSize: '18px'
          }}>
            🔄 Loading documents...
          </div>
        ) : docs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📝
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              color: '#24292e',
              fontSize: '20px'
            }}>
              No documents yet
            </h3>
            <p style={{
              margin: 0,
              color: '#586069',
              fontSize: '16px'
            }}>
              Create your first document to get started
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {docs.map(doc => (
              <div key={doc._id} style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: '20px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                border: '1px solid #e1e5e9'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              onClick={() => navigate(`/documents/${doc._id}`)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#24292e',
                    flex: 1
                  }}>
                    📄 {doc.title}
                  </h3>
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    {isOwner(doc) ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareDocId(doc._id);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f6f8fa',
                            color: '#586069',
                            border: '1px solid #e1e5e9',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          🔗 Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc._id);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ffeef0',
                            color: '#d73a49',
                            border: '1px solid #f97583',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#e1f5fe',
                        color: '#0277bd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        👥 Shared
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#586069',
                  marginBottom: '16px'
                }}>
                  Last modified: {formatDate(doc.lastModified || doc.createdAt)}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="text"
                    value={window.location.origin + '/documents/' + doc._id}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '6px',
                      fontSize: '12px',
                      backgroundColor: '#f6f8fa',
                      color: '#586069'
                    }}
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(window.location.origin + '/documents/' + doc._id);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#0366d6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shareDocId && (
        <ShareDialog docId={shareDocId} token={token} onClose={() => setShareDocId(null)} />
      )}

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}

export default DocumentsPage;
