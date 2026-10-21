import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { attachmentsRepository } from '../repository/attachments.repository';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const attachmentsService = {
  async saveFile(data: {
    userId: string;
    taskId?: string;
    noteId?: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    await ensureUploadDir();

    const ext = path.extname(data.filename);
    const storedName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedName);

    await fs.writeFile(filePath, data.buffer);

    return attachmentsRepository.create({
      userId: data.userId,
      taskId: data.taskId,
      noteId: data.noteId,
      filename: data.filename,
      storedName,
      mimeType: data.mimeType,
      size: data.buffer.length,
    });
  },

  async listByTask(taskId: string, userId: string) {
    return attachmentsRepository.findByTaskId(taskId, userId);
  },

  async listByNote(noteId: string, userId: string) {
    return attachmentsRepository.findByNoteId(noteId, userId);
  },

  async getFile(id: string, userId: string) {
    const attachment = await attachmentsRepository.findById(id, userId);
    if (!attachment) throw new Error('Anexo não encontrado');

    const filePath = path.join(UPLOAD_DIR, attachment.stored_name);
    try {
      await fs.access(filePath);
    } catch {
      throw new Error('Arquivo não encontrado no servidor');
    }

    return { attachment, filePath };
  },

  async delete(id: string, userId: string) {
    const attachment = await attachmentsRepository.findById(id, userId);
    if (!attachment) throw new Error('Anexo não encontrado');

    try {
      await fs.unlink(path.join(UPLOAD_DIR, attachment.stored_name));
    } catch (err) {
      console.warn('Arquivo não encontrado no disco:', err);
    }

    return attachmentsRepository.delete(id, userId);
  },
};