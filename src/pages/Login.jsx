import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Car,
  Sun,
  Moon,
  LockKey,
  X,
  PaperPlaneRight,
  Eye,
  EyeSlash,
} from "phosphor-react"; // Adicionei Eye e EyeSlash
import { doc, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { db, auth } from "../firebase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Novo estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados do "Esqueci a Senha"
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState(null);
  const [sendingLink, setSendingLink] = useState(false);

  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // --- Lógica de Login ---
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signIn(email, password);
      const user = userCredential.user;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await signOut(auth);
        throw new Error("Usuário não encontrado. Contate o suporte.");
      }

      const userData = docSnap.data();

      if (userData.isBlocked) {
        await signOut(auth);
        throw new Error("Esta conta foi bloqueada pelo administrador.");
      }

      if (userData?.role === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/app");
      }
    } catch (err) {
      if (err.message.includes("bloqueada")) {
        setError(err.message);
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Email ou senha incorretos.");
      } else {
        setError("Falha ao entrar: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Lógica de Reset de Senha ---
  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!forgotEmail) return;

    setSendingLink(true);
    setForgotMsg(null);

    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMsg({
        type: "success",
        text: "Email enviado! Verifique sua caixa de entrada (e spam) para redefinir a senha.",
      });
      setForgotEmail("");
    } catch (error) {
      console.error(error);
      if (error.code === "auth/user-not-found") {
        setForgotMsg({
          type: "error",
          text: "Este e-mail não está cadastrado.",
        });
      } else if (error.code === "auth/invalid-email") {
        setForgotMsg({ type: "error", text: "Formato de e-mail inválido." });
      } else {
        setForgotMsg({
          type: "error",
          text: "Erro ao enviar. Tente novamente.",
        });
      }
    } finally {
      setSendingLink(false);
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs font-medium text-green-600 hover:text-green-500 dark:text-green-400 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* INPUT DE SENHA COM OLHO MÁGICO */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} // Alterna o tipo
                required
                className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                tabIndex="-1" // Pula o tab para não atrapalhar a navegação rápida
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
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

      {/* --- MODAL ESQUECI A SENHA --- */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-slide-up">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <LockKey
                  size={28}
                  className="text-blue-600 dark:text-blue-400"
                  weight="fill"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Redefinir Senha
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Informe seu e-mail cadastrado. Enviaremos um link para você
                criar uma nova senha.
              </p>
            </div>

            {forgotMsg && (
              <div
                className={`mb-4 p-3 rounded text-sm text-center ${forgotMsg.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
              >
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  Seu E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={sendingLink}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {sendingLink ? (
                  "Enviando..."
                ) : (
                  <>
                    <PaperPlaneRight size={20} weight="bold" /> Enviar Link
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
