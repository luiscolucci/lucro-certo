import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register"; // <--- Importe aqui
import { AdminDashboard } from "./pages/AdminDashboard";
import { DriverDashboard } from "./pages/DriverDashboard";

// Componente que protege as rotas
function PrivateRoute({ children, adminOnly = false }) {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

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
            <Route path="/register" element={<Register />} />{" "}
            {/* <--- Nova Rota */}
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
