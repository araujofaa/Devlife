import { FastifyReply } from 'fastify';
import fs from 'fs';
import { attachmentsService } from '../service/attachments.service';
import { AuthRequest } from '../../../shared/middleware/auth';
import { tasksService } from '../../tasks/service/tasks.service';
import { notesService } from '../../notes/service/notes.service';

export const attachmentsController = {
  async upload(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado' },
        });
      }

      const taskId = (data.fields.taskId as any)?.value;
      const noteId = (data.fields.noteId as any)?.value;

      if (!taskId && !noteId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Informe taskId ou noteId' },
        });
      }

      if (taskId) await tasksService.getById(userId, taskId);
      if (noteId) await notesService.getById(userId, noteId);

      const buffer = await data.toBuffer();

      const attachment = await attachmentsService.saveFile({
        userId,
        taskId,
        noteId,
        filename: data.filename,
        mimeType: data.mimetype,
        buffer,
      });

      return reply.status(201).send({ success: true, data: attachment });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message },
      });
    }
  },

  async listByTask(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { taskId } = request.params as { taskId: string };

      const attachments = await attachmentsService.listByTask(taskId, userId);
      return reply.send({ success: true, data: attachments });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async listByNote(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { noteId } = request.params as { noteId: string };

      const attachments = await attachmentsService.listByNote(noteId, userId);
      return reply.send({ success: true, data: attachments });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async download(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      const { attachment, filePath } = await attachmentsService.getFile(id, userId);

      reply.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(attachment.filename)}"`
      );
      reply.type(attachment.mime_type);

      const stream = fs.createReadStream(filePath);
      return reply.send(stream);
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async delete(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      await attachmentsService.delete(id, userId);
      return reply.send({ success: true, message: 'Anexo excluído com sucesso' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },
};