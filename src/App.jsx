import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { DriverDashboard } from "./pages/DriverDashboard"; // <--- Importamos o novo painel aqui

// Componente que protege as rotas
function PrivateRoute({ children, adminOnly = false }) {
  const { user, userData, loading } = useAuth();

  // Tela de carregamento enquanto verifica o login
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
        Carregando...
      </div>
    );
  }

  // Se não estiver logado, manda para o Login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Proteção extra para rotas de Admin
  if (adminOnly && userData?.role !== "super_admin") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p>Esta área é restrita para administradores.</p>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<Login />} />

            {/* Rota do Motorista (Agora aponta para o Dashboard Real) */}
            <Route
              path="/app"
              element={
                <PrivateRoute>
                  <DriverDashboard />
                </PrivateRoute>
              }
            />

            {/* Rota do Super Admin */}
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            {/* Redirecionamento padrão (caiu na raiz, vai pro app) */}
            <Route path="/" element={<Navigate to="/app" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
