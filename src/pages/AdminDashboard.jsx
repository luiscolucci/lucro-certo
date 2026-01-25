import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  orderBy,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { sendPasswordResetEmail, updatePassword } from "firebase/auth";
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
  Lock,
  LockOpen,
  Trash,
  X,
} from "phosphor-react";
import ReactApexChart from "react-apexcharts";

export function AdminDashboard() {
  const { logout, createDriverAccount, user: currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Estados Cadastro
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState([]);

  // Estados Admin
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  // Estados Gráfico
  const [chartData, setChartData] = useState({
    categories: [],
    series: [{ name: "Novos Motoristas", data: [] }],
  });

  function processChartData(users) {
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const today = new Date();
    const last6Months = [];
    const counts = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        label: months[d.getMonth()],
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    users.forEach((u) => {
      if (!u.createdAt) return;
      const date = u.createdAt.toDate
        ? u.createdAt.toDate()
        : new Date(u.createdAt);
      last6Months.forEach((m, index) => {
        if (date.getMonth() === m.monthIndex && date.getFullYear() === m.year)
          counts[index]++;
      });
    });

    setChartData({
      categories: last6Months.map((m) => m.label),
      series: [{ name: "Novos Motoristas", data: counts }],
    });
  }

  const chartOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    colors: ["#059669"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    xaxis: {
      categories: chartData.categories,
      labels: { style: { colors: "#9CA3AF" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#9CA3AF" } } },
    grid: { show: true, borderColor: "#374151", strokeDashArray: 4 },
    theme: { mode: "dark" },
    tooltip: { theme: "dark" },
  };

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsersList(users);
      processChartData(users);
    });
    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleChangeMyPassword(e) {
    e.preventDefault();
    if (newAdminPassword.length < 6) {
      setAdminMsg("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    try {
      await updatePassword(currentUser, newAdminPassword);
      setAdminMsg("Sucesso! Senha alterada.");
      setTimeout(() => {
        setAdminMsg("");
        setNewAdminPassword("");
        setIsPasswordModalOpen(false);
      }, 2000);
    } catch (error) {
      setAdminMsg("Erro: Faça logout e login novamente para trocar a senha.");
    }
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
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setLoading(false);
  }

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
      alert("Erro: " + error.message);
    }
  }

  async function handleToggleBlock(user) {
    const action = user.isBlocked ? "desbloquear" : "bloquear";
    if (!confirm(`Tem certeza que deseja ${action} o acesso de ${user.name}?`))
      return;

    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, { isBlocked: !user.isBlocked });
    } catch (error) {
      alert("Erro ao alterar status: " + error.message);
    }
  }

  async function handleDeleteUser(user) {
    if (
      !confirm(
        `ATENÇÃO: Isso excluirá permanentemente o motorista ${user.name} e ele perderá o acesso. Confirmar exclusão?`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "users", user.id));
      alert("Usuário excluído do banco de dados.");
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
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
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 font-medium text-sm transition-colors"
              title="Alterar minha senha"
            >
              <Lock size={20} /> <span className="hidden sm:inline">Senha</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm ml-2"
            >
              <SignOut size={20} />{" "}
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                <UserPlus size={24} />
                <h2 className="text-lg font-semibold">
                  Novo Motorista (Cadastro Manual)
                </h2>
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
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${user.isBlocked ? "bg-red-50 dark:bg-red-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${user.isBlocked ? "bg-red-500" : user.isWorking ? "bg-green-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`}
                      ></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-bold ${user.isBlocked ? "text-red-600 dark:text-red-400 line-through" : "text-gray-900 dark:text-white"}`}
                          >
                            {user.name || "Sem Nome"}
                          </p>
                          {user.isBlocked && (
                            <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold uppercase">
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`mr-2 px-3 py-1 rounded-full text-xs font-bold ${user.isWorking ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
                      >
                        {user.isWorking ? "EM CORRIDA" : "OFFLINE"}
                      </div>

                      {user.role !== "super_admin" && (
                        <>
                          <button
                            onClick={() => handleResetPassword(user.email)}
                            className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
                            title="Enviar email de reset de senha"
                          >
                            <Key size={18} />
                          </button>

                          <button
                            onClick={() => handleToggleBlock(user)}
                            className={`p-2 rounded-lg transition-colors ${user.isBlocked ? "text-green-600 hover:text-green-800 bg-green-100 dark:bg-green-900/30" : "text-orange-500 hover:text-orange-700 bg-orange-50 dark:bg-orange-900/20"}`}
                            title={
                              user.isBlocked
                                ? "Desbloquear Acesso"
                                : "Bloquear Acesso"
                            }
                          >
                            {user.isBlocked ? (
                              <LockOpen size={18} />
                            ) : (
                              <Lock size={18} />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir Conta Permanentemente"
                          >
                            <Trash size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-200">
              <ChartLineUp size={24} className="text-green-500" weight="fill" />
              <h3 className="font-bold text-lg">Crescimento</h3>
            </div>
            <div className="h-64">
              <ReactApexChart
                options={chartOptions}
                series={chartData.series}
                type="bar"
                height="100%"
              />
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
              Novos motoristas nos últimos 6 meses
            </p>
          </div>
        </div>

        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Alterar Minha Senha
                </h3>
                <button onClick={() => setIsPasswordModalOpen(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              {adminMsg && (
                <div
                  className={`p-3 rounded mb-4 text-sm ${adminMsg.includes("Sucesso") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {adminMsg}
                </div>
              )}
              <form onSubmit={handleChangeMyPassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Mínimo 6 caracteres"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                >
                  Salvar Nova Senha
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
