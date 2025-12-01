import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bloco1 from './pages/Bloco1';
import Bloco2 from './pages/Bloco2';
import Bloco3 from './pages/Bloco3';
import BlocoWO from './pages/BlocoWO';
import Login from './pages/Login';
import CadastroUsuario from './pages/CadastroUsuario';
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
        const response = await fetch(API_ENDPOINTS.verifyToken, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        // Verificar se a resposta é JSON antes de fazer parse
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Resposta do servidor não é JSON');
        }

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
        // Se for erro 404 ou de rede, verificar se o servidor está acessível
        if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
          console.error('Servidor não encontrado. Verifique se o backend está rodando.');
          // Em caso de erro de rede, manter autenticação se tiver token válido
          // Mas ainda assim verificar se tem a flag
          setIsAuthenticated(storedAuth === 'true');
        } else {
          // Outros erros, invalidar autenticação
          setIsAuthenticated(false);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
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

// Componente para proteger rotas apenas para admin (Portes)
const AdminRoute = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAdmin = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
        const username = user?.username || '';
        // Apenas o usuário "Portes admin" pode criar novos usuários
        const isPortes = username === 'Portes admin';
        setIsAdmin(isPortes);
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [location.pathname]);

  if (isLoading) {
    return <Loading message="Verificando permissões..." fullScreen={true} />;
  }

  if (!isAdmin) {
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
        <Route
          path="/cadastro-usuario"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout>
                  <CadastroUsuario />
                </Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
