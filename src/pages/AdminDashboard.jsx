import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase"; // Importa auth para o reset de senha
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth"; // Função de reset
import {
  UserPlus,
  SignOut,
  Car,
  Moon,
  Sun,
  CheckCircle,
  Warning,
  ChartLineUp,
  Users,
  Key,
  Circle,
} from "phosphor-react";
import ReactApexChart from "react-apexcharts";

export function AdminDashboard() {
  const { userData, logout, createDriverAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estado para lista de usuários
  const [usersList, setUsersList] = useState([]);

  // --- CONFIG DO GRÁFICO ADMIN ---
  const chartOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    colors: ["#059669"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    xaxis: {
      categories: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      labels: { style: { colors: "#9CA3AF" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#9CA3AF" } } },
    grid: { show: true, borderColor: "#374151", strokeDashArray: 4 },
    theme: { mode: "dark" },
    tooltip: { theme: "dark" },
  };
  const chartSeries = [
    { name: "Novos Motoristas", data: [5, 8, 12, 15, 22, 30] },
  ];

  // Carrega lista de usuários ao iniciar
  useEffect(() => {
    async function fetchUsers() {
      try {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsersList(users);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    }
    fetchUsers();
  }, []); // Roda apenas uma vez ao montar o componente

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await createDriverAccount(email, password, name);
    if (result.success) {
      setMessage({
        type: "success",
        text: `Motorista ${name} criado com sucesso!`,
      });
      setName("");
      setEmail("");
      setPassword("");
      // Atualiza a lista na hora
      setUsersList((prev) => [
        { name, email, role: "user", createdAt: new Date(), isWorking: false },
        ...prev,
      ]);
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setLoading(false);
  }

  // Função para enviar email de reset de senha
  async function handleResetPassword(userEmail) {
    if (
      !confirm(
        `Deseja enviar um email de redefinição de senha para ${userEmail}?`,
      )
    )
      return;

    try {
      await sendPasswordResetEmail(auth, userEmail);
      alert(`Email enviado para ${userEmail}!`);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar email: " + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
              <Car
                size={28}
                className="text-green-600 dark:text-green-400"
                weight="fill"
              />
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
              Lucro Certo
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm"
            >
              <SignOut size={20} />{" "}
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA DA ESQUERDA (Cadastro + Lista de Usuários) */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Painel Administrativo
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gerencie seus motoristas e assinaturas.
            </p>
          </div>

          {/* Cadastro */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                <UserPlus size={24} />
                <h2 className="text-lg font-semibold">Novo Motorista</h2>
              </div>
            </div>
            <div className="p-6">
              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"}`}
                >
                  {message.type === "success" ? (
                    <CheckCircle size={24} weight="fill" />
                  ) : (
                    <Warning size={24} weight="fill" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {message.type === "success" ? "Sucesso" : "Erro"}
                    </h3>
                    <p className="text-sm opacity-90">{message.text}</p>
                  </div>
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Ex: João da Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="motorista@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha Provisória
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none font-mono"
                    placeholder="Crie uma senha inicial"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-8 py-3 bg-gray-900 dark:bg-green-600 hover:bg-gray-800 dark:hover:bg-green-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      "Processando..."
                    ) : (
                      <>
                        <UserPlus size={20} weight="bold" /> Cadastrar Motorista
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* LISTA DE MOTORISTAS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Users size={24} className="text-gray-700 dark:text-gray-200" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Motoristas Cadastrados
              </h2>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {usersList.length === 0 ? (
                <p className="p-6 text-gray-500 dark:text-gray-400 text-center">
                  Nenhum motorista encontrado.
                </p>
              ) : (
                usersList.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${user.isWorking ? "bg-green-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`}
                      ></div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {user.name || "Sem Nome"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${user.isWorking ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
                      >
                        {user.isWorking ? "EM CORRIDA" : "OFFLINE"}
                      </div>

                      {user.role !== "super_admin" && (
                        <button
                          onClick={() => handleResetPassword(user.email)}
                          className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          title="Enviar email de reset de senha"
                        >
                          <Key size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DA DIREITA (Gráfico e Métricas) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-200">
              <ChartLineUp size={24} className="text-green-500" weight="fill" />
              <h3 className="font-bold text-lg">Crescimento</h3>
            </div>
            <div className="h-64">
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height="100%"
              />
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
              Novos motoristas nos últimos 6 meses
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
