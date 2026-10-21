'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import CategorySelector from '@/components/CategorySelector';
import toast from 'react-hot-toast';

export default function EditNotePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await apiClient.get(`/notes/${id}`);
        if (response.success) {
          setTitle(response.data.title);
          setContent(response.data.content || '');
          setCategoryIds(
            response.data.categories?.map((nc: any) => nc.category.id) || []
          );
        } else {
          setError('Nota não encontrada');
        }
      } catch {
        setError('Erro ao carregar nota');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchNote();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const response = await apiClient.patch(`/notes/${id}`, {
        title,
        content,
        categoryIds,
      });
      if (response.success) {
        toast.success('Nota atualizada!');
        router.push('/notes');
      } else {
        setError(response.error?.message || 'Erro ao atualizar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Editar Nota
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Conteúdo *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Categorias
          </label>
          <CategorySelector selectedIds={categoryIds} onChange={setCategoryIds} />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Atualizando...' : 'Atualizar Nota'}
          </button>
          <Link
            href="/notes"
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-400"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}