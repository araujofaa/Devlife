'use client';

import { useEffect, useState } from 'react';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories');
        if (response.success) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((cid) => cid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Carregando categorias...</p>;

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