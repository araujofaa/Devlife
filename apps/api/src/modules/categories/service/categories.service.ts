import { categoriesRepository } from '../repository/categories.repository';
import { CategoryCreateInput, CategoryUpdateInput } from '../schemas/categories.schemas';

export const categoriesService = {
  async create(userId: string, data: CategoryCreateInput) {
    const existing = await categoriesRepository.findByName(data.name, userId);
    if (existing) {
      throw new Error('Já existe uma categoria com este nome');
    }
    return categoriesRepository.create({ userId, ...data });
  },

  async list(userId: string) {
    return categoriesRepository.findAllByUser(userId);
  },

  async getById(userId: string, id: string) {
    const category = await categoriesRepository.findById(id, userId);
    if (!category) throw new Error('Categoria não encontrada');
    return category;
  },

  async update(userId: string, id: string, data: CategoryUpdateInput) {
    await categoriesRepository.findById(id, userId);

    // Verifica se o novo nome já está em uso por outra categoria
    if (data.name) {
      const existing = await categoriesRepository.findByName(data.name, userId);
      if (existing && existing.id !== id) {
        throw new Error('Já existe uma categoria com este nome');
      }
    }

    return categoriesRepository.update(id, userId, data);
  },

  async delete(userId: string, id: string) {
    await categoriesRepository.findById(id, userId);
    return categoriesRepository.delete(id, userId);
  },

  async setTaskCategories(userId: string, taskId: string, categoryIds: string[]) {
    // Valida que todas as categorias pertencem ao usuário
    for (const categoryId of categoryIds) {
      const category = await categoriesRepository.findById(categoryId, userId);
      if (!category) throw new Error(`Categoria ${categoryId} não encontrada`);
    }

    await categoriesRepository.setTaskCategories(taskId, categoryIds);
    return { message: 'Categorias atualizadas com sucesso' };
  },

  async setNoteCategories(userId: string, noteId: string, categoryIds: string[]) {
    for (const categoryId of categoryIds) {
      const category = await categoriesRepository.findById(categoryId, userId);
      if (!category) throw new Error(`Categoria ${categoryId} não encontrada`);
    }

    await categoriesRepository.setNoteCategories(noteId, categoryIds);
    return { message: 'Categorias atualizadas com sucesso' };
  },
};