import { notesRepository } from '../repository/notes.repository';
import { NoteCreateInput, NoteUpdateInput, NoteFilters } from '../schemas/notes.schemas';

export const notesService = {
  async create(userId: string, data: NoteCreateInput) {
    const { categoryIds, ...noteData } = data;

    // Cria a nota
    const note = await notesRepository.create({
      userId,
      title: noteData.title,
      content: noteData.content,
    });

    return note;
  },

  async list(userId: string, filters: NoteFilters) {
    const { search, categoryId, page, limit } = filters;
    return notesRepository.findAll(userId, {
      search,
      categoryId,
      page,
      limit,
    });
  },

  async getById(userId: string, id: string) {
    const note = await notesRepository.findById(id, userId);
    if (!note) {
      throw new Error('Nota não encontrada');
    }
    return note;
  },

  async update(userId: string, id: string, data: NoteUpdateInput) {
    const { categoryIds, ...noteData } = data;

    await notesRepository.findById(id, userId);
    return notesRepository.update(id, userId, noteData);
  },

  async delete(userId: string, id: string) {
    await notesRepository.findById(id, userId);
    return notesRepository.delete(id, userId);
  },
};