'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ImportPreview {
  version: string;
  exported_at?: string;
  exported_by?: string;
  total_tasks: number;
  total_subtasks: number;
  tasks: any[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  categories_created: number;
  subtasks_imported: number;
  errors: string[];
}

export default function ImportExportPage() {
  // Export
  const [exporting, setExporting] = useState(false);

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preserveCompleted, setPreserveCompleted] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // EXPORTAR
  // ============================================
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await apiClient.get('/tasks/export');

      if (response.success) {
        const data = response.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `devlife-tarefas-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(
          `${data.total_tasks} tarefas e ${data.total_subtasks} subtarefas exportadas!`
        );
      } else {
        toast.error(response.error?.message || 'Erro ao exportar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao exportar');
    } finally {
      setExporting(false);
    }
  };

  // ============================================
  // IMPORTAR — leitura do arquivo
  // ============================================
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Arquivo deve ser JSON');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 10 MB)');
      return;
    }

    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validação básica
        if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
          toast.error('Arquivo inválido: campo "tasks" não encontrado');
          setImportFile(null);
          return;
        }

        const totalSubtasks = parsed.tasks.reduce(
          (acc: number, t: any) => acc + (t.subtasks?.length || 0),
          0
        );

        setImportPreview({
          version: parsed.version || '1.0',
          exported_at: parsed.exported_at,
          exported_by: parsed.exported_by,
          total_tasks: parsed.tasks.length,
          total_subtasks: totalSubtasks,
          tasks: parsed.tasks,
        });

        toast.success('Arquivo lido com sucesso!');
      } catch (err) {
        toast.error('Erro ao ler JSON');
        setImportFile(null);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const clearImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================
  // IMPORTAR — envio para API
  // ============================================
  const handleImport = async () => {
    if (!importPreview) return;

    setImporting(true);
    setImportResult(null);

    try {
      const payload = {
        version: importPreview.version,
        exported_at: importPreview.exported_at,
        exported_by: importPreview.exported_by,
        options: {
          preserve_completed: preserveCompleted,
          skip_duplicates: skipDuplicates,
        },
        tasks: importPreview.tasks,
      };

      const response = await apiClient.post('/tasks/import', payload);

      if (response.success) {
        setImportResult(response.data);
        toast.success(
          `${response.data.imported} tarefa(s) importada(s)!`
        );
      } else {
        toast.error(response.error?.message || 'Erro ao importar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar para Tarefas
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Importar / Exportar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Compartilhe suas tarefas entre contas do DevLife
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ============================================
            CARD EXPORTAR
            ============================================ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DocumentArrowDownIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Exportar
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Baixar suas tarefas em JSON
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
            <li>• Todas as tarefas ativas</li>
            <li>• Subtarefas incluídas</li>
            <li>• Categorias (por nome)</li>
            <li>• Arquivo compartilhável</li>
          </ul>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {exporting ? 'Exportando...' : 'Baixar JSON'}
          </button>
        </div>

        {/* ============================================
            CARD IMPORTAR
            ============================================ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DocumentArrowUpIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importar
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adicionar tarefas de outro arquivo
              </p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-6">
            <li>• Categorias criadas automaticamente</li>
            <li>• Detecta duplicatas</li>
            <li>• Preview antes de importar</li>
            <li>• Subtarefas incluídas</li>
          </ul>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Escolher Arquivo
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* ============================================
          ÁREA DE DROP / PREVIEW / RESULTADO
          ============================================ */}
      <div className="mt-6">
        {/* Drag zone (só quando não tem arquivo) */}
        {!importPreview && !importFile && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }
            `}
          >
            <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              Arraste um arquivo JSON aqui
            </p>
            <p className="text-sm text-gray-400 mt-1">
              ou clique para escolher
            </p>
          </div>
        )}

        {/* Preview do arquivo */}
        {importPreview && !importResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header do preview */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Preview do Arquivo
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {importFile?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={clearImport}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remover
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900/30">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tarefas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {importPreview.total_tasks}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Subtarefas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {importPreview.total_subtasks}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Versão</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {importPreview.version}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Exportado por
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {importPreview.exported_by || '—'}
                </p>
              </div>
            </div>

            {/* Lista de tarefas (primeiras 5) */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Primeiras {Math.min(5, importPreview.tasks.length)} tarefas:
              </p>
              <ul className="space-y-1 text-sm">
                {importPreview.tasks.slice(0, 5).map((task: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-gray-400">•</span>
                    <span className="truncate">
                      {task.title}
                      {task.subtasks?.length > 0 && (
                        <span className="text-xs text-blue-500 ml-2">
                          ({task.subtasks.length} subtarefas)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
                {importPreview.tasks.length > 5 && (
                  <li className="text-xs text-gray-500 italic">
                    ... e mais {importPreview.tasks.length - 5}
                  </li>
                )}
              </ul>
            </div>

            {/* Opções */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={preserveCompleted}
                  onChange={(e) => setPreserveCompleted(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Preservar status "concluída" das tarefas e subtarefas
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Pular tarefas duplicadas (mesmo título e data)
                </span>
              </label>
            </div>

            {/* Botão importar */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={clearImport}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-5 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                <ArrowUpTrayIcon className="w-5 h-5" />
                {importing ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        )}

        {/* Resultado da importação */}
        {importResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              {importResult.errors.length === 0 ? (
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Importação Concluída
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-green-700 dark:text-green-300">
                  Importadas
                </p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {importResult.imported}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Puladas
                </p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {importResult.skipped}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Subtarefas
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {importResult.subtasks_imported}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Categorias novas
                </p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {importResult.categories_created}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {importResult.errors.length} erro(s) encontrados:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5 max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/tasks"
                className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Ver Minhas Tarefas
              </Link>
              <button
                onClick={clearImport}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200"
              >
                Importar Outro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Dica:</strong> O arquivo exportado contém apenas o título, dados e
          categorias (por nome). IDs internos e tokens não são compartilhados. Ao
          importar em outra conta, as categorias são criadas automaticamente se não
          existirem.
        </p>
      </div>
    </div>
  );
}