import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bloco1 from './pages/Bloco1';
import Bloco2 from './pages/Bloco2';
import Bloco3 from './pages/Bloco3';
import BlocoWO from './pages/BlocoWO';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
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
