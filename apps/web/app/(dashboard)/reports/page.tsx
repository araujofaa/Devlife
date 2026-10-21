'use client';

import { useState } from 'react';
import { apiClient } from '@devlife/api-client';
import { useAuth } from '@/hooks/useAuth';
import { generateTasksReport } from '@/lib/pdf/tasks-report';
import { generateNotesReport } from '@/lib/pdf/notes-report';
import { generatePeriodicReport } from '@/lib/pdf/periodic-report';
import {
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'done';
  due_date?: string;
  subtasks?: any[];
  categories?: any[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getEndOfWeek(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function getEndOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  // Modal de escolha de período
  const [periodModal, setPeriodModal] = useState<{
    type: 'weekly' | 'monthly';
    date: Date; // data base (usada para calcular o range)
  } | null>(null);

  // ============================================
  // RELATÓRIO DE TAREFAS (customizado)
  // ============================================
  const handleTasksReport = async () => {
    setLoading('tasks');
    try {
      const response = await apiClient.get('/tasks?limit=1000');
      if (response.success) {
        const tasks = response.data.tasks;
        if (tasks.length === 0) {
          toast.error('Nenhuma tarefa para gerar relatório');
          return;
        }
        generateTasksReport(tasks, user?.name || 'Usuário');
        toast.success('Relatório gerado!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(null);
    }
  };

  // ============================================
  // RELATÓRIO DE NOTAS
  // ============================================
  const handleNotesReport = async () => {
    setLoading('notes');
    try {
      const response = await apiClient.get('/notes?limit=1000');
      if (response.success) {
        const notes = response.data.notes;
        if (notes.length === 0) {
          toast.error('Nenhuma nota para gerar relatório');
          return;
        }
        generateNotesReport(notes, user?.name || 'Usuário');
        toast.success('Relatório gerado!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(null);
    }
  };

  // ============================================
  // ABRIR MODAL DE PERÍODO
  // ============================================
  const openPeriodModal = (type: 'weekly' | 'monthly') => {
    setPeriodModal({
      type,
      date: new Date(),
    });
  };

  // ============================================
  // NAVEGAR PERÍODO
  // ============================================
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (!periodModal) return;
    const newDate = new Date(periodModal.date);

    if (periodModal.type === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
    }

    setPeriodModal({ ...periodModal, date: newDate });
  };

  // ============================================
  // GERAR RELATÓRIO PERIÓDICO
  // ============================================
  const handleGeneratePeriodicReport = async () => {
    if (!periodModal) return;

    const { type, date } = periodModal;
    let startDate: Date;
    let endDate: Date;

    if (type === 'weekly') {
      startDate = getStartOfWeek(date);
      endDate = getEndOfWeek(startDate);
    } else {
      startDate = getStartOfMonth(date.getFullYear(), date.getMonth());
      endDate = getEndOfMonth(date.getFullYear(), date.getMonth());
    }

    setLoading('periodic');
    try {
      // Busca tarefas do período
      const params = new URLSearchParams({
        limit: '1000',
        due_date_from: startDate.toISOString(),
        due_date_to: endDate.toISOString(),
      });

      const response = await apiClient.get(`/tasks?${params.toString()}`);
      if (response.success) {
        const tasks = response.data.tasks;
        if (tasks.length === 0) {
          toast.error('Nenhuma tarefa no período selecionado');
          setLoading(null);
          return;
        }

        generatePeriodicReport(tasks, user?.name || 'Usuário', {
          type,
          startDate,
          endDate,
        });

        toast.success('Relatório gerado!');
        setPeriodModal(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(null);
    }
  };

  // ============================================
  // TÍTULO DO PERÍODO NO MODAL
  // ============================================
  const getPeriodTitle = (): string => {
    if (!periodModal) return '';

    if (periodModal.type === 'weekly') {
      const start = getStartOfWeek(periodModal.date);
      const end = getEndOfWeek(start);
      const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      return `${startStr} - ${endStr}`;
    } else {
      return `${MONTHS[periodModal.date.getMonth()]} ${periodModal.date.getFullYear()}`;
    }
  };

  const isCurrentPeriod = (): boolean => {
    if (!periodModal) return false;
    const today = new Date();

    if (periodModal.type === 'weekly') {
      const todayWeekStart = getStartOfWeek(today);
      const selectedWeekStart = getStartOfWeek(periodModal.date);
      return todayWeekStart.getTime() === selectedWeekStart.getTime();
    } else {
      return (
        periodModal.date.getMonth() === today.getMonth() &&
        periodModal.date.getFullYear() === today.getFullYear()
      );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gere relatórios em PDF dos seus dados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Relatório Semanal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Relatório Semanal
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Visão dia a dia da semana
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
            <li>• Detalhamento por dia da semana</li>
            <li>• Tarefas e subtarefas organizadas por hora</li>
            <li>• Estatísticas do período</li>
          </ul>

          <button
            onClick={() => openPeriodModal('weekly')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Escolher Semana
          </button>
        </div>

        {/* Relatório Mensal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Relatório Mensal
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Visão completa do mês
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
            <li>• Detalhamento por dia do mês</li>
            <li>• Estatísticas consolidadas</li>
            <li>• Apenas dias com itens</li>
          </ul>

          <button
            onClick={() => openPeriodModal('monthly')}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            Escolher Mês
          </button>
        </div>

        {/* Relatório de Tarefas (customizado) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Relatório Completo de Tarefas
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Todas as tarefas com filtros
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
            <li>• Todas as tarefas do sistema</li>
            <li>• Subtarefas com texto completo</li>
            <li>• Categorias e progresso</li>
          </ul>

          <button
            onClick={handleTasksReport}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {loading === 'tasks' ? 'Gerando...' : 'Baixar Relatório'}
          </button>
        </div>

        {/* Relatório de Notas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Relatório de Notas
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Todas as notas com conteúdo completo
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
            <li>• Lista resumida de todas as notas</li>
            <li>• Conteúdo completo de cada nota</li>
            <li>• Categorias associadas</li>
          </ul>

          <button
            onClick={handleNotesReport}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {loading === 'notes' ? 'Gerando...' : 'Baixar Relatório'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Dica:</strong> Os relatórios são gerados no navegador e incluem
          apenas as tarefas do período selecionado. Você pode navegar entre semanas ou
          meses antes de gerar o PDF.
        </p>
      </div>

      {/* ============================================
          MODAL: ESCOLHER PERÍODO
          ============================================ */}
      {periodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPeriodModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {periodModal.type === 'weekly' ? 'Escolher Semana' : 'Escolher Mês'}
              </h2>
              <button
                onClick={() => setPeriodModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Navegação */}
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => navigatePeriod('prev')}
                  className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  title="Anterior"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>

                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                    {getPeriodTitle()}
                  </div>
                  {isCurrentPeriod() && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center justify-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      Período atual
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigatePeriod('next')}
                  className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  title="Próximo"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Info do período */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Período do relatório:
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {periodModal.type === 'weekly' ? (
                    <>
                      {getStartOfWeek(periodModal.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      até{' '}
                      {getEndOfWeek(getStartOfWeek(periodModal.date)).toLocaleDateString(
                        'pt-BR',
                        { day: '2-digit', month: '2-digit', year: 'numeric' }
                      )}
                    </>
                  ) : (
                    <>
                      {getStartOfMonth(
                        periodModal.date.getFullYear(),
                        periodModal.date.getMonth()
                      ).toLocaleDateString('pt-BR')}{' '}
                      até{' '}
                      {getEndOfMonth(
                        periodModal.date.getFullYear(),
                        periodModal.date.getMonth()
                      ).toLocaleDateString('pt-BR')}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setPeriodModal(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePeriodicReport}
                disabled={loading === 'periodic'}
                className={`px-5 py-2 text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 ${
                  periodModal.type === 'weekly'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                {loading === 'periodic' ? 'Gerando...' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}