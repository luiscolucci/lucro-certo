import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  limit,
  doc,
  updateDoc,
  increment,
  orderBy,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import {
  Car,
  GasPump,
  CurrencyDollar,
  StopCircle,
  PlusCircle,
  X,
  Scroll,
  CalendarBlank,
  TrendUp,
  TrendDown,
  SignOut,
  Pencil,
  Trash,
  ListDashes,
  FileText,
  DownloadSimple,
  MagnifyingGlass,
  FilePdf,
} from "phosphor-react";
import ReactApexChart from "react-apexcharts";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function DriverDashboard() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de Fluxo
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Estados dos Modais
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);

  // --- ESTADO DO MODAL DE RELATÓRIO ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportData, setReportData] = useState([]);
  const [reportTotals, setReportTotals] = useState({
    earnings: 0,
    expenses: 0,
    profit: 0,
    km: 0,
  });
  const [loadingReport, setLoadingReport] = useState(false);

  // Dados da Transação
  const [transactionType, setTransactionType] = useState("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Listas de Dados
  const [chartFilter, setChartFilter] = useState("Semana");
  const [chartData, setChartData] = useState([]);
  const [chartCategories, setChartCategories] = useState([]);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);

  // Categorias
  const incomeTags = [
    "Uber",
    "99",
    "Indriver",
    "BlaBlaCar",
    "Particular",
    "Gorjeta",
  ];
  const expenseTags = [
    "Gasolina",
    "Etanol",
    "GNV",
    "Alimentação",
    "Lavagem",
    "Higienização Interna",
    "Manutenção",
  ];

  // --- CONFIG DO GRÁFICO ---
  const chartOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
    },
    colors: ["#10B981"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: chartCategories,
      labels: { style: { colors: "#9CA3AF" }, rotate: -45 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#9CA3AF" }, formatter: (val) => `R$ ${val}` },
    },
    grid: { show: true, borderColor: "#374151", strokeDashArray: 4 },
    theme: { mode: "dark" },
    tooltip: { theme: "dark", y: { formatter: (val) => `R$ ${val}` } },
    noData: { text: "Sem dados...", style: { color: "#9CA3AF" } },
  };

  useEffect(() => {
    if (!user) return;

    const qOpen = query(
      collection(db, "work_shifts"),
      where("userId", "==", user.uid),
      where("status", "==", "open"),
      limit(1),
    );

    const unsubscribeShift = onSnapshot(qOpen, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setCurrentShift({ id: doc.id, ...doc.data() });
      } else {
        setCurrentShift(null);
      }
      setLoading(false);
    });

    async function loadHistory() {
      const qHistory = query(
        collection(db, "work_shifts"),
        where("userId", "==", user.uid),
        where("status", "==", "closed"),
        orderBy("date", "desc"),
        limit(5),
      );
      const snapshot = await getDocs(qHistory);
      setShiftHistory(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    }
    loadHistory();

    return () => unsubscribeShift();
  }, [user]);

  useEffect(() => {
    if (!currentShift?.id) {
      setTodayTransactions([]);
      return;
    }
    const qTrans = query(
      collection(db, "transactions"),
      where("shiftId", "==", currentShift.id),
      orderBy("date", "desc"),
    );
    const unsubscribeTrans = onSnapshot(qTrans, (snapshot) => {
      setTodayTransactions(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
    return () => unsubscribeTrans();
  }, [currentShift?.id]);

  useEffect(() => {
    if (!user) return;
    async function loadChartData() {
      const now = new Date();
      let startDate = new Date();
      if (chartFilter === "Semana") startDate.setDate(now.getDate() - 7);
      if (chartFilter === "Mês") startDate.setMonth(now.getMonth() - 1);
      if (chartFilter === "Ano") startDate.setFullYear(now.getFullYear() - 1);
      if (chartFilter === "Dia") startDate.setDate(now.getDate() - 5);

      const qChart = query(
        collection(db, "work_shifts"),
        where("userId", "==", user.uid),
        where("status", "==", "closed"),
        where("date", ">=", startDate.toISOString()),
        orderBy("date", "asc"),
      );

      const snapshot = await getDocs(qChart);
      const cats = [];
      const data = [];
      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        const dateObj = new Date(d.date);
        let label =
          chartFilter === "Ano"
            ? dateObj.toLocaleDateString("pt-BR", { month: "short" })
            : dateObj.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });
        cats.push(label);
        data.push(d.totalEarnings - d.totalExpenses);
      });
      setChartCategories(cats);
      setChartData(data);
    }
    loadChartData();
  }, [user, chartFilter, currentShift]);

  // --- RELATÓRIOS (CORRIGIDO) ---

  async function handleGenerateReport() {
    if (!reportStartDate || !reportEndDate)
      return alert("Selecione as datas de início e fim.");

    setLoadingReport(true);
    setReportData([]);

    // CORREÇÃO DE FUSO HORÁRIO: Forçamos o início e o fim do dia
    // Adicionamos o horário explicitamente na string para garantir o dia local
    const start = new Date(reportStartDate + "T00:00:00");
    const end = new Date(reportEndDate + "T23:59:59.999");

    try {
      // IMPORTANTE: Se aparecer um link vermelho no console, CLIQUE NELE para criar o índice
      const q = query(
        collection(db, "work_shifts"),
        where("userId", "==", user.uid),
        where("status", "==", "closed"),
        where("date", ">=", start.toISOString()),
        where("date", "<=", end.toISOString()),
        orderBy("date", "desc"),
      );

      const snapshot = await getDocs(q);
      const shifts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Turnos encontrados:", shifts.length); // Debug no console

      let totalEarn = 0;
      let totalExp = 0;
      let totalKm = 0;

      shifts.forEach((s) => {
        totalEarn += s.totalEarnings || 0;
        totalExp += s.totalExpenses || 0;
        totalKm += s.totalKm || 0;
      });

      setReportData(shifts);
      setReportTotals({
        earnings: totalEarn,
        expenses: totalExp,
        profit: totalEarn - totalExp,
        km: totalKm,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      if (error.code === "failed-precondition") {
        alert(
          "Configuração de banco de dados necessária. Abra o Console (F12) e clique no link do Firebase para criar o índice.",
        );
      } else {
        alert("Erro ao buscar dados. Verifique sua conexão.");
      }
    } finally {
      setLoadingReport(false);
    }
  }

  function exportToCSV() {
    if (reportData.length === 0) return alert("Gere um relatório primeiro.");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data;Ganhos (R$);Despesas (R$);Lucro (R$);KM Rodado\n";
    reportData.forEach((item) => {
      const date = new Date(item.date).toLocaleDateString("pt-BR");
      const profit = (item.totalEarnings - item.totalExpenses)
        .toFixed(2)
        .replace(".", ",");
      const earn = item.totalEarnings.toFixed(2).replace(".", ",");
      const exp = item.totalExpenses.toFixed(2).replace(".", ",");
      csvContent += `${date};${earn};${exp};${profit};${item.totalKm}\n`;
    });
    csvContent += `\nTOTAL;${reportTotals.earnings.toFixed(2).replace(".", ",")};${reportTotals.expenses.toFixed(2).replace(".", ",")};${reportTotals.profit.toFixed(2).replace(".", ",")};${reportTotals.km}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${reportStartDate}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  function exportToPDF() {
    if (reportData.length === 0) return alert("Gere um relatório primeiro.");

    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text("Relatório Financeiro - Lucro Real", 14, 22);

    // Período
    doc.setFontSize(11);
    doc.text(
      `Período: ${new Date(reportStartDate).toLocaleDateString("pt-BR")} a ${new Date(reportEndDate).toLocaleDateString("pt-BR")}`,
      14,
      30,
    );
    doc.text(`Motorista: ${userData?.name || "Motorista"}`, 14, 36);

    // Resumo
    doc.setFontSize(12);
    doc.text("Resumo do Período:", 14, 48);
    doc.setFontSize(10);
    doc.setTextColor(0, 128, 0); // Verde
    doc.text(
      `Ganhos Totais: R$ ${reportTotals.earnings.toFixed(2).replace(".", ",")}`,
      14,
      55,
    );
    doc.setTextColor(200, 0, 0); // Vermelho
    doc.text(
      `Despesas Totais: R$ ${reportTotals.expenses.toFixed(2).replace(".", ",")}`,
      14,
      61,
    );
    doc.setTextColor(0, 0, 0); // Preto
    doc.setFont(undefined, "bold");
    doc.text(
      `Lucro Líquido: R$ ${reportTotals.profit.toFixed(2).replace(".", ",")}`,
      14,
      69,
    );
    doc.setFont(undefined, "normal");
    doc.text(`KM Total: ${reportTotals.km} km`, 14, 75);

    // Tabela
    const tableColumn = ["Data", "Ganhos", "Despesas", "Lucro", "KM"];
    const tableRows = [];

    reportData.forEach((item) => {
      const date = new Date(item.date).toLocaleDateString("pt-BR");
      const profit = item.totalEarnings - item.totalExpenses;
      const rowData = [
        date,
        `R$ ${item.totalEarnings.toFixed(2).replace(".", ",")}`,
        `R$ ${item.totalExpenses.toFixed(2).replace(".", ",")}`,
        `R$ ${profit.toFixed(2).replace(".", ",")}`,
        item.totalKm,
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      startY: 85,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save(`relatorio_lucro_certo_${reportStartDate}.pdf`);
  }

  // --- AÇÕES ---

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleStartShift(e) {
    e.preventDefault();
    setIsStarting(true);
    try {
      const newShift = {
        userId: user.uid,
        date: new Date().toISOString(),
        status: "open",
        odometerStart: Number(startKm),
        odometerEnd: 0,
        totalKm: 0,
        totalEarnings: 0,
        totalExpenses: 0,
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "work_shifts"), newShift);
      await updateDoc(doc(db, "users", user.uid), { isWorking: true });
    } catch (error) {
      console.error(error);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSaveTransaction(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const val = Number(amount);
      if (!val || val <= 0) return;
      const shiftRef = doc(db, "work_shifts", currentShift.id);
      const fieldToUpdate =
        transactionType === "income" ? "totalEarnings" : "totalExpenses";

      if (editingTransaction) {
        const oldVal = editingTransaction.amount;
        const diff = val - oldVal;
        const transRef = doc(db, "transactions", editingTransaction.id);
        await updateDoc(transRef, {
          amount: val,
          description: description,
          type: transactionType,
        });
        if (transactionType === editingTransaction.type) {
          await updateDoc(shiftRef, { [fieldToUpdate]: increment(diff) });
        }
      } else {
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          shiftId: currentShift.id,
          type: transactionType,
          amount: val,
          description: description,
          date: new Date().toISOString(),
        });
        await updateDoc(shiftRef, { [fieldToUpdate]: increment(val) });
      }
      closeTransactionModal();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTransaction(item) {
    if (!confirm(`Tem certeza que deseja apagar?`)) return;
    try {
      await deleteDoc(doc(db, "transactions", item.id));
      const shiftRef = doc(db, "work_shifts", currentShift.id);
      const fieldToUpdate =
        item.type === "income" ? "totalEarnings" : "totalExpenses";
      await updateDoc(shiftRef, { [fieldToUpdate]: increment(-item.amount) });
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  }

  async function handleEndShift(e) {
    e.preventDefault();
    setIsEnding(true);
    try {
      const finalKm = Number(endKm);
      const start = currentShift.odometerStart;
      if (finalKm < start) {
        alert(`O KM Final deve ser maior que o Inicial (${start})!`);
        setIsEnding(false);
        return;
      }
      const totalKmRodado = finalKm - start;
      const shiftRef = doc(db, "work_shifts", currentShift.id);
      const closedData = {
        status: "closed",
        odometerEnd: finalKm,
        totalKm: totalKmRodado,
        closedAt: new Date().toISOString(),
      };
      await updateDoc(shiftRef, closedData);
      await updateDoc(doc(db, "users", user.uid), { isWorking: false });
      setShiftHistory((prev) => [{ ...currentShift, ...closedData }, ...prev]);
      setEndKm("");
      setIsEndShiftModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnding(false);
    }
  }

  function openNewTransactionModal(type) {
    setEditingTransaction(null);
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setIsTransactionModalOpen(true);
  }
  function openEditTransactionModal(item) {
    setEditingTransaction(item);
    setTransactionType(item.type);
    setAmount(item.amount);
    setDescription(item.description);
    setIsTransactionModalOpen(true);
  }
  function closeTransactionModal() {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  }

  if (loading)
    return (
      <div className="p-8 text-center dark:text-white">
        Carregando painel...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 dark:bg-green-900 p-1.5 rounded-full">
              <Car
                size={20}
                className="text-green-600 dark:text-green-400"
                weight="fill"
              />
            </div>
            <span className="font-bold text-gray-800 dark:text-white">
              Olá, {userData?.name?.split(" ")[0]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${currentShift ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}
            >
              {currentShift ? "EM CORRIDA" : "OFFLINE"}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sair do Sistema"
            >
              <SignOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {!currentShift && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Novo Expediente
            </h2>
            <form onSubmit={handleStartShift}>
              <div className="mb-6 text-left">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  Odômetro Atual (KM)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 50000"
                  className="w-full text-center text-2xl font-bold p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isStarting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isStarting ? "Iniciando..." : "INICIAR DIA"}
              </button>
            </form>
          </div>
        )}

        {currentShift && (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">
                  Ganhos
                </span>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  R$ {currentShift.totalEarnings.toFixed(2).replace(".", ",")}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">
                  Custos
                </span>
                <div className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">
                  R$ {currentShift.totalExpenses.toFixed(2).replace(".", ",")}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-green-900 dark:to-emerald-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs font-bold opacity-80 uppercase">
                  Lucro Líquido Hoje
                </span>
                <div className="text-4xl font-bold mt-1">
                  R${" "}
                  {(currentShift.totalEarnings - currentShift.totalExpenses)
                    .toFixed(2)
                    .replace(".", ",")}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs opacity-70">
                  <Car size={16} />{" "}
                  <span>KM Inicial: {currentShift.odometerStart}</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <CurrencyDollar size={120} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => openNewTransactionModal("income")}
                className="bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors group"
              >
                <div className="bg-green-500 text-white p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <PlusCircle size={24} weight="bold" />
                </div>
                <span className="text-sm font-bold text-green-800 dark:text-green-300">
                  Novo Ganho
                </span>
              </button>
              <button
                onClick={() => openNewTransactionModal("expense")}
                className="bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 p-4 rounded-xl flex flex-col items-center gap-2 transition-colors group"
              >
                <div className="bg-red-500 text-white p-2 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <GasPump size={24} weight="fill" />
                </div>
                <span className="text-sm font-bold text-red-800 dark:text-red-300">
                  Novo Gasto
                </span>
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <ListDashes
                  size={20}
                  className="text-gray-500 dark:text-gray-400"
                />
                <h3 className="font-bold text-sm text-gray-700 dark:text-white">
                  Movimentações de Hoje
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto">
                {todayTransactions.length === 0 ? (
                  <p className="p-4 text-xs text-center text-gray-400">
                    Nenhum lançamento ainda.
                  </p>
                ) : (
                  todayTransactions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-full ${item.type === "income" ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"}`}
                        >
                          {item.type === "income" ? (
                            <TrendUp size={16} weight="bold" />
                          ) : (
                            <TrendDown size={16} weight="bold" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">
                            {item.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.date).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-bold ${item.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                        >
                          R$ {item.amount.toFixed(2)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditTransactionModal(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(item)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setIsEndShiftModalOpen(true)}
              className="w-full mt-4 p-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <StopCircle size={20} weight="fill" className="text-red-500" />{" "}
              ENCERRAR EXPEDIENTE
            </button>
          </div>
        )}

        <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Resumo e Histórico
            </h3>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-md transition-transform active:scale-95"
            >
              <FileText size={18} weight="bold" /> Relatório Completo
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                <CalendarBlank size={20} /> Evolução
              </h3>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {["Dia", "Semana", "Mês", "Ano"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setChartFilter(filter)}
                    className={`px-2 py-1 text-[10px] sm:text-xs rounded-md transition-all ${chartFilter === filter ? "bg-white dark:bg-gray-600 shadow text-green-600 dark:text-white font-bold" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48">
              <ReactApexChart
                options={chartOptions}
                series={[{ name: "Lucro Líquido", data: chartData }]}
                type="area"
                height="100%"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Scroll
                size={20}
                className="text-green-600 dark:text-green-400"
              />
              <h3 className="font-bold text-gray-700 dark:text-white">
                Últimos Turnos
              </h3>
            </div>
            {shiftHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum turno finalizado.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {shiftHistory.map((shift) => {
                  const profit = shift.totalEarnings - shift.totalExpenses;
                  const date = new Date(shift.date).toLocaleDateString("pt-BR");
                  return (
                    <div
                      key={shift.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <CalendarBlank
                            weight="fill"
                            className="text-gray-400"
                          />
                          <span className="font-bold text-gray-800 dark:text-white text-sm">
                            {date}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-bold text-lg ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
                          >
                            R$ {profit.toFixed(2).replace(".", ",")}
                          </span>
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Lucro
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <TrendUp weight="bold" />{" "}
                          <span>
                            Bruto: R$ {shift.totalEarnings.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                          <TrendDown weight="bold" />{" "}
                          <span>Desp: R$ {shift.totalExpenses.toFixed(2)}</span>
                        </div>
                        <div className="ml-auto text-gray-400">
                          {shift.totalKm} KM
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {isTransactionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
              <div
                className={`px-6 py-4 flex justify-between items-center ${transactionType === "income" ? "bg-green-600" : "bg-red-600"}`}
              >
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  {editingTransaction
                    ? "Editar Lançamento"
                    : transactionType === "income"
                      ? "Registrar Ganho"
                      : "Registrar Gasto"}
                </h3>
                <button
                  onClick={closeTransactionModal}
                  className="text-white/80 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-4 text-3xl font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-xl border-none focus:ring-2 outline-none"
                    style={{
                      "--tw-ring-color":
                        transactionType === "income" ? "#10B981" : "#EF4444",
                    }}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {(transactionType === "income"
                    ? incomeTags
                    : expenseTags
                  ).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setDescription(tag)}
                      className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${description === tag ? (transactionType === "income" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800") : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      transactionType === "income"
                        ? "Ex: Corrida Particular"
                        : "Ex: Abastecimento"
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2"
                    style={{
                      "--tw-ring-color":
                        transactionType === "income" ? "#10B981" : "#EF4444",
                    }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-4 rounded-xl text-white font-bold shadow-lg flex justify-center items-center gap-2 ${transactionType === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {isSaving ? "Salvando..." : "CONFIRMAR"}
                </button>
              </form>
            </div>
          </div>
        )}

        {isEndShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StopCircle
                    size={32}
                    className="text-red-600 dark:text-red-400"
                    weight="fill"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Fim do Expediente
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Informe o KM final para fechar o caixa.
                </p>
              </div>
              <form onSubmit={handleEndShift}>
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 ml-1">
                    Odômetro Final
                  </label>
                  <input
                    type="number"
                    required
                    placeholder={`Maior que ${currentShift?.odometerStart}`}
                    className="w-full text-center text-2xl font-bold p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                    value={endKm}
                    onChange={(e) => setEndKm(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEndShiftModalOpen(false)}
                    className="py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isEnding}
                    className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/30"
                  >
                    {isEnding ? "Fechando..." : "ENCERRAR"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL DE RELATÓRIO AVANÇADO --- */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={24} className="text-blue-600" /> Relatório
                  Financeiro
                </h3>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-6">
                  <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-3">
                    Período de Análise
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Início
                      </label>
                      <input
                        type="date"
                        className="w-full mt-1 p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Fim
                      </label>
                      <input
                        type="date"
                        className="w-full mt-1 p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateReport}
                    disabled={loadingReport}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {loadingReport ? (
                      "Buscando..."
                    ) : (
                      <>
                        <MagnifyingGlass weight="bold" /> Gerar Relatório
                      </>
                    )}
                  </button>
                </div>

                {/* DADOS NA TELA (Sempre visíveis se houver dados) */}
                {reportData.length > 0 && (
                  <div className="space-y-6">
                    {/* Card de Totais (Unificado) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/50">
                        <p className="text-xs text-green-700 dark:text-green-400 font-bold uppercase">
                          Total Ganhos
                        </p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-400">
                          R$ {reportTotals.earnings.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                        <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase">
                          Total Custos
                        </p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-400">
                          R$ {reportTotals.expenses.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-900 dark:bg-gray-700 text-white p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">
                          Lucro do Período
                        </p>
                        <p className="text-2xl font-bold">
                          R$ {reportTotals.profit.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">
                          KM Total
                        </p>
                        <p className="text-xl font-bold">
                          {reportTotals.km} km
                        </p>
                      </div>
                    </div>

                    {/* Lista Detalhada */}
                    <div>
                      <h4 className="font-bold text-sm text-gray-700 dark:text-white mb-2">
                        Detalhamento por Dia
                      </h4>
                      <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 sticky top-0">
                            <tr>
                              <th className="px-4 py-2">Data</th>
                              <th className="px-4 py-2 text-right">Lucro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {reportData.map((item) => (
                              <tr key={item.id} className="dark:text-gray-300">
                                <td className="px-4 py-2">
                                  {new Date(item.date).toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </td>
                                <td
                                  className={`px-4 py-2 text-right font-bold ${item.totalEarnings - item.totalExpenses >= 0 ? "text-green-600" : "text-red-500"}`}
                                >
                                  R${" "}
                                  {(
                                    item.totalEarnings - item.totalExpenses
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* BOTÕES DE EXPORTAÇÃO */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={exportToCSV}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs"
                      >
                        <DownloadSimple size={20} weight="bold" /> Baixar Excel
                        (CSV)
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs"
                      >
                        <FilePdf size={20} weight="bold" /> Baixar PDF
                      </button>
                    </div>
                  </div>
                )}

                {reportData.length === 0 &&
                  reportStartDate &&
                  reportEndDate &&
                  !loadingReport && (
                    <p className="text-center text-gray-400 text-sm mt-4">
                      Nenhum dado encontrado para este período.
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
