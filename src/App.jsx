import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AdminDashboard } from "./pages/AdminDashboard";
import { DriverDashboard } from "./pages/DriverDashboard";
import { Lock } from "phosphor-react";

function PrivateRoute({ children, adminOnly = false }) {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // --- NOVA VERIFICAÇÃO DE BLOQUEIO ---
  if (userData?.isBlocked) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4 text-center">
        <Lock size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Conta Bloqueada</h1>
        <p className="text-gray-500">
          O acesso a esta conta foi suspenso pelo administrador.
        </p>
        <a href="/login" className="mt-6 text-green-600 hover:underline">
          Voltar para o Login
        </a>
      </div>
    );
  }
  // ------------------------------------

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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/app"
              element={
                <PrivateRoute>
                  <DriverDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/app" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
