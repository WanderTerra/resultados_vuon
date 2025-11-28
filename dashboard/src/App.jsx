import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bloco1 from './pages/Bloco1';
import Bloco2 from './pages/Bloco2';
import Bloco3 from './pages/Bloco3';
import BlocoWO from './pages/BlocoWO';
import Login from './pages/Login';
import { API_ENDPOINTS } from './config/api';
import Loading from './components/Loading';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = verificando, true/false = resultado
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      const storedAuth = localStorage.getItem('isAuthenticated');

      // Se não tem token ou flag de autenticação, redireciona imediatamente
      if (!token || storedAuth !== 'true') {
        setIsAuthenticated(false);
        setIsLoading(false);
        // Limpar dados inválidos
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return;
      }

      // Verificar token no servidor
      try {
        const response = await fetch(`${API_ENDPOINTS.verifyToken}?token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setIsAuthenticated(true);
        } else {
          // Token inválido ou expirado
          setIsAuthenticated(false);
          // Limpar dados inválidos
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        // Em caso de erro de rede, manter autenticação se tiver token válido
        // Mas ainda assim verificar se tem a flag
        setIsAuthenticated(storedAuth === 'true');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [location.pathname]); // Re-verificar quando a rota mudar

  if (isLoading) {
    return <Loading message="Verificando autenticação..." fullScreen={true} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

// Componente para redirecionar usuários autenticados que tentam acessar /login
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const storedAuth = localStorage.getItem('isAuthenticated');
  
  // Se já está autenticado, redireciona para o dashboard
  if (token && storedAuth === 'true') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bloco1"
          element={
            <ProtectedRoute>
              <Layout>
                <Bloco1 />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bloco2"
          element={
            <ProtectedRoute>
              <Layout>
                <Bloco2 />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bloco3"
          element={
            <ProtectedRoute>
              <Layout>
                <Bloco3 />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wo"
          element={
            <ProtectedRoute>
              <Layout>
                <BlocoWO />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
