import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
import { Car, Sun, Moon } from "phosphor-react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase"; // Importe auth
import { signOut } from "firebase/auth"; // Importe signOut

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signIn(email, password);
      const user = userCredential.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      // VERIFICA SE O USUÁRIO EXISTE E SE ESTÁ ATIVO
      if (!docSnap.exists()) {
        await signOut(auth);
        throw new Error("Usuário não encontrado. Contate o suporte.");
      }

      const userData = docSnap.data();

      if (userData.isBlocked) {
        await signOut(auth); // Desloga imediatamente
        throw new Error("Esta conta foi bloqueada pelo administrador.");
      }

      if (userData?.role === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/app");
      }
    } catch (err) {
      // Mensagens de erro amigáveis
      if (err.message.includes("bloqueada")) {
        setError(err.message);
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Email ou senha incorretos.");
      } else {
        setError("Falha ao entrar: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 transition-colors duration-300 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-md hover:scale-110 transition-all"
      >
        {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 transition-colors">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4 text-green-600 dark:text-green-400">
            <Car size={32} weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lucro Certo
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Gestão para Motoristas
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded mb-4 text-sm text-center border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha
            </label>
            <input
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verificando..." : "Acessar Painel"}
            </button>
            <Link
              to="/register"
              className="w-full flex justify-center py-2 px-4 border border-green-600 dark:border-green-500 rounded-md text-sm font-medium text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              Realize seu Cadastro
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
