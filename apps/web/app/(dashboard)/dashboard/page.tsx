'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  tasks: { done: number; pending: number; total: number };
  notes: { total: number; thisMonth: number };
  charts: {
    tasksStatus: { name: string; value: number; color: string }[];
    weeklyProgress: { day: string; created: number; completed: number }[];
    priorityDistribution: { name: string; value: number; color: string }[];
    notesPerMonth: { month: string; count: number }[];
  };
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 🆕 Componente de card clicável
interface StatCardProps {
  href: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  valueColor?: string;
  delay: number;
}

function StatCard({
  href,
  label,
  value,
  icon: Icon,
  iconColor,
  valueColor = 'text-gray-900 dark:text-white',
  delay,
}: StatCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <Link
        href={href}
        className="group block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {label}
            </p>
            <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Icon className={`w-10 h-10 ${iconColor} group-hover:scale-110 transition-transform`} />
            <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/stats/dashboard');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500">Não foi possível carregar as estatísticas.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo — agora clicáveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          href="/tasks"
          label="Total de Tarefas"
          value={stats.tasks.total}
          icon={ClipboardDocumentListIcon}
          iconColor="text-blue-500"
          delay={0.05}
        />

        <StatCard
          href="/tasks?status=done"
          label="Concluídas"
          value={stats.tasks.done}
          icon={CheckCircleIcon}
          iconColor="text-green-500"
          valueColor="text-green-600"
          delay={0.1}
        />

        <StatCard
          href="/tasks?status=pending"
          label="Pendentes"
          value={stats.tasks.pending}
          icon={ClockIcon}
          iconColor="text-amber-500"
          valueColor="text-amber-600"
          delay={0.15}
        />

        <StatCard
          href="/notes"
          label="Notas"
          value={stats.notes.total}
          icon={DocumentTextIcon}
          iconColor="text-purple-500"
          delay={0.2}
        />
      </div>

      {/* Gráficos - Linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pizza: Tarefas concluídas vs pendentes */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status das Tarefas
          </h3>
          {stats.tasks.total === 0 ? (
            <p className="text-center text-gray-500 py-8">Sem dados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.charts.tasksStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                >
                  {stats.charts.tasksStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pizza: Distribuição por prioridade */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pendentes por Prioridade
          </h3>
          {stats.tasks.pending === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma tarefa pendente. 🎉</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.charts.priorityDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                >
                  {stats.charts.priorityDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Gráficos - Linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Barras: Progresso semanal */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progresso Semanal
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.charts.weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="created" name="Criadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Linhas: Notas por mês */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notas Criadas (últimos 6 meses)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.charts.notesPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Notas"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}