'use client';

import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Recurrence {
  type: string | null;
  interval: number;
  endDate: string;
}

interface Props {
  value: Recurrence;
  onChange: (value: Recurrence) => void;
}

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Diariamente', unit: 'dia(s)' },
  { value: 'weekly', label: 'Semanalmente', unit: 'semana(s)' },
  { value: 'monthly', label: 'Mensalmente', unit: 'mês(es)' },
  { value: 'yearly', label: 'Anualmente', unit: 'ano(s)' },
];

export default function RecurrenceSelector({ value, onChange }: Props) {
  const isEnabled = value.type !== null;

  const handleToggle = () => {
    if (isEnabled) {
      onChange({ type: null, interval: 1, endDate: '' });
    } else {
      onChange({ type: 'weekly', interval: 1, endDate: '' });
    }
  };

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <label className="font-medium text-gray-900 dark:text-white">
            Tarefa recorrente
          </label>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Opções (só quando habilitado) */}
      {isEnabled && (
        <div className="space-y-3 mt-4">
          {/* Frequência */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Frequência
            </label>
            <select
              value={value.type || 'weekly'}
              onChange={(e) => onChange({ ...value, type: e.target.value })}
              className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Intervalo */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Repetir a cada
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={value.interval}
                onChange={(e) =>
                  onChange({ ...value, interval: parseInt(e.target.value) || 1 })
                }
                className="w-20 border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {RECURRENCE_OPTIONS.find((o) => o.value === value.type)?.unit || 'período(s)'}
              </span>
            </div>
          </div>

          {/* Data final (opcional) */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Termina em (opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={value.endDate}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                className="flex-1 border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {value.endDate && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, endDate: '' })}
                  className="px-3 text-gray-500 hover:text-gray-700"
                  title="Remover data final"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Deixe vazio para repetir indefinidamente
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm">
            <p className="text-blue-800 dark:text-blue-200">
              📅 Esta tarefa se repetirá{' '}
              <strong>
                {RECURRENCE_OPTIONS.find((o) => o.value === value.type)?.label.toLowerCase()}
              </strong>
              {value.interval > 1 && ` a cada ${value.interval} ${RECURRENCE_OPTIONS.find((o) => o.value === value.type)?.unit}`}
              {value.endDate && ` até ${new Date(value.endDate).toLocaleDateString('pt-BR')}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}