import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DocumentsPage from './pages/DocumentsPage';
import EditorPage from './pages/EditorPage';

export const AuthContext = createContext();

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = (jwt) => {
    setToken(jwt);
    localStorage.setItem('token', jwt);
  };
  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function PrivateRoute({ children }) {
  const { token } = React.useContext(AuthContext);
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />
          <Route path="/documents/:id" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/documents" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
