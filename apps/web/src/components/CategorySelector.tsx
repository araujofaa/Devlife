'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@devlife/api-client';
import { TagIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function CategorySelector({ selectedIds, onChange }: Props) {
  // 🆕 Uso do React Query para buscar categorias
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.success ? (response.data as Category[]) : [];
    },
  });

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((cid) => cid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (isLoading) return <p className="text-sm text-gray-500 animate-pulse">Carregando categorias...</p>;

  if (categories.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Nenhuma categoria criada.{' '}
        <a href="/categories" className="text-blue-600 hover:underline">
          Criar categoria
        </a>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const isSelected = selectedIds.includes(category.id);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggleCategory(category.id)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all ${
              isSelected
                ? 'text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
            style={isSelected ? { backgroundColor: category.color } : {}}
          >
            {isSelected ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <TagIcon className="w-4 h-4" />
            )}
            {category.name}
          </button>
        );
      })}
    </div>
  );
}