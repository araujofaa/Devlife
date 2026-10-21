'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface NoteCategory {
  category: Category;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  categories?: NoteCategory[];
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null); // 🆕 Modal
  const limit = 10;

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(selectedCategoryId && { categoryId: selectedCategoryId }),
      });

      const response = await apiClient.get(`/notes?${params.toString()}`);
      if (response.success) {
        setNotes(response.data.notes);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [page, search, selectedCategoryId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;
    try {
      const response = await apiClient.delete(`/notes/${id}`);
      if (response.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        toast.success('Nota excluída!');
      }
    } catch (error) {
      console.error('Erro ao excluir', error);
      toast.error('Erro ao excluir nota');
    }
  };

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / limit);

  // Fecha o modal com Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNote(null);
    };
    if (selectedNote) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [selectedNote]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Minhas Notas
        </h1>
        <Link
          href="/notes/create"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nova Nota
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Buscar por título ou conteúdo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma nota encontrada.
          </p>
          <Link
            href="/notes/create"
            className="inline-block mt-4 text-blue-600 hover:underline"
          >
            Criar primeira nota
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 flex flex-col group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                    {note.title}
                  </h3>
                </div>

                {/* Preview do conteúdo */}
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 flex-1 mb-3 whitespace-pre-wrap">
                  {note.content}
                </p>

                {/* 🆕 Botão "Ver mais" se o conteúdo for longo */}
                {note.content.length > 150 && (
                  <button
                    onClick={() => setSelectedNote(note)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-3 text-left font-medium"
                  >
                    Ler mais →
                  </button>
                )}

                {/* Categorias */}
                {note.categories && note.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.categories.map((nc) => (
                      <span
                        key={nc.category.id}
                        className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                        style={{ backgroundColor: nc.category.color }}
                      >
                        {nc.category.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">
                    {new Date(note.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/notes/${note.id}/edit`}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                      title="Editar"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Excluir"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50 dark:border-gray-700 dark:text-white"
              >
                Anterior
              </button>
              <span className="px-4 py-2 dark:text-white">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50 dark:border-gray-700 dark:text-white"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* 🆕 Modal para ver o conteúdo completo */}
      {selectedNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white break-words">
                  {selectedNote.title}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Criada em{' '}
                    {new Date(selectedNote.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {selectedNote.updated_at !== selectedNote.created_at && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • Editada em{' '}
                      {new Date(selectedNote.updated_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                {selectedNote.categories && selectedNote.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedNote.categories.map((nc) => (
                      <span
                        key={nc.category.id}
                        className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                        style={{ backgroundColor: nc.category.color }}
                      >
                        {nc.category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Fechar (Esc)"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                {selectedNote.content}
              </p>
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={`/notes/${selectedNote.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </Link>
              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}