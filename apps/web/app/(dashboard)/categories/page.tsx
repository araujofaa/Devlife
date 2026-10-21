'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@devlife/api-client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

const PRESET_COLORS = [
  '#3b82f6', // azul
  '#ef4444', // vermelho
  '#22c55e', // verde
  '#f59e0b', // amarelo
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#06b6d4', // ciano
  '#6b7280', // cinza
  '#f97316', // laranja
  '#10b981', // esmeralda
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', color: '#3b82f6', icon: 'tag' });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Digite um nome para a categoria');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Editar
        const response = await apiClient.patch(`/categories/${editingId}`, form);
        if (response.success) {
          setCategories(categories.map((c) => (c.id === editingId ? response.data : c)));
          toast.success('Categoria atualizada!');
          resetForm();
        } else {
          toast.error(response.error?.message || 'Erro ao atualizar');
        }
      } else {
        // Criar
        const response = await apiClient.post('/categories', form);
        if (response.success) {
          setCategories([...categories, response.data].sort((a, b) => a.name.localeCompare(b.name)));
          toast.success('Categoria criada!');
          resetForm();
        } else {
          toast.error(response.error?.message || 'Erro ao criar');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setForm({
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
    setEditingId(category.id);
    setShowForm(true);
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"? As tarefas e notas associadas NÃO serão excluídas.`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/categories/${id}`);
      if (response.success) {
        setCategories(categories.filter((c) => c.id !== id));
        toast.success('Categoria excluída!');
      } else {
        toast.error(response.error?.message || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro de conexão');
    }
  };

  const resetForm = () => {
    setForm({ name: '', color: '#3b82f6', icon: 'tag' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categorias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize suas tarefas e notas por contexto
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Nova Categoria
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Nome *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={50}
                autoFocus
                placeholder="Ex: Trabalho, Pessoal, Estudos..."
                className="w-full border px-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">{form.name.length}/50 caracteres</p>
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Cor
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                      form.color === color
                        ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {form.color === color && (
                      <CheckIcon className="w-5 h-5 text-white drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Cor selecionada: <span className="font-mono">{form.color}</span>
              </p>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Pré-visualização
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-sm text-white font-medium inline-flex items-center gap-1.5"
                  style={{ backgroundColor: form.color }}
                >
                  <TagIcon className="w-4 h-4" />
                  {form.name || 'Nome da categoria'}
                </span>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Categoria'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de categorias */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
          <TagIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Nenhuma categoria criada
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Crie categorias para organizar suas tarefas e notas
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Criar primeira categoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all p-4 border-l-4 group"
              style={{ borderLeftColor: category.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: category.color }}
                  >
                    <TagIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {category.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{category.color}</p>
                  </div>
                </div>

                <div className="flex gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Editar categoria"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Excluir categoria"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumo */}
      {!loading && categories.length > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'} no total
        </p>
      )}
    </div>
  );
}