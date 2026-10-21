import { storage } from './storage';
import { apiClient } from '@devlife/api-client';
import type { ApiResponse } from '@devlife/types';
import NetInfo from '@react-native-community/netinfo';

const PENDING_KEY = 'pending_operations';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const TASKS_CACHE = 'tasks_cache';
const NOTES_CACHE = 'notes_cache';

export interface PendingOperation {
  id: string;
  entity: 'task' | 'note';
  type: 'create' | 'update' | 'delete';
  data: any;
  updated_at: string;
}

export type MutationResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  queued?: boolean;
};

let syncing = false;
const listeners = new Set<() => void>();

function genId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================
// Cache helpers
// ============================================
async function getCache<T>(key: string): Promise<T[]> {
  return (await storage.getItem<T[]>(key)) ?? [];
}

async function setCache<T>(key: string, list: T[]): Promise<void> {
  await storage.setItem(key, list);
}

// ============================================
// Service
// ============================================
export const syncService = {
  // ---------- Listeners (telas se inscrevem) ----------
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  notifyAll() {
    listeners.forEach((fn) => fn());
  },

  // ---------- Sync principal ----------
  async sync(): Promise<void> {
    if (syncing) return;
    
    // 🆕 Verifica se há internet
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    // 🆕 Verifica se o usuário está logado (tem token)
    const token = await storage.getToken('access_token');
    if (!token) {
      console.log('[Sync] Abortado: Usuário sem token de acesso.');
      return;
    }

    syncing = true;
    try {
      const operations =
        (await storage.getItem<PendingOperation[]>(PENDING_KEY)) ?? [];
      const lastSync = await storage.getItem<string>(LAST_SYNC_KEY);

      const res = await apiClient.post<{
        changes: any[];
        timestamp: string;
        syncResults: any[];
      }>('/sync', {
        operations: operations.map((op) => ({
          id: op.id,
          type: op.type,
          entity: op.entity,
          data: op.data,
          updated_at: op.updated_at,
        })),
        last_sync_timestamp: lastSync || undefined,
      });

      if (!res.success) {
        console.warn('[Sync] Erro na API:', res.error);
        // Se o token for inválido (expirado), limpa a sessão
        if (res.error?.code === 'UNAUTHORIZED') {
          await storage.removeToken('access_token');
          await storage.removeToken('refresh_token');
        }
        return;
      }

      // Limpa fila só após sucesso
      if (operations.length > 0) {
        await storage.removeItem(PENDING_KEY);
      }
      await storage.setItem(LAST_SYNC_KEY, res.data?.timestamp ?? '');

      if (res.data?.changes?.length) {
        await this.applyChanges(res.data.changes);
      }

      this.notifyAll();
    } catch (err) {
      console.warn('[Sync] falhou (rede?):', err);
    } finally {
      syncing = false;
    }
  },

  async applyChanges(changes: any[]): Promise<void> {
    const tasks = await getCache<any>(TASKS_CACHE);
    const notes = await getCache<any>(NOTES_CACHE);

    for (const change of changes) {
      const entity = change.entity;
      const target = entity === 'task' ? tasks : notes;
      const idx = target.findIndex((i) => i.id === change.id);

      if (change.deleted_at) {
        if (idx >= 0) target.splice(idx, 1);
      } else if (idx >= 0) {
        target[idx] = change;
      } else {
        target.push(change);
      }
    }

    await setCache(TASKS_CACHE, tasks);
    await setCache(NOTES_CACHE, notes);
  },

  // ---------- Fila ----------
  async queueOp(op: PendingOperation): Promise<void> {
    const list = (await storage.getItem<PendingOperation[]>(PENDING_KEY)) ?? [];
    list.push(op);
    await storage.setItem(PENDING_KEY, list);
    this.sync().catch(() => {});
  },

  // ---------- Mutations (tarefas) ----------
  async createTask(data: any): Promise<MutationResult> {
    const id = genId();
    const updated_at = new Date().toISOString();
    try {
      const res = await apiClient.post<any>('/tasks', data);
      if (res.success) {
        const tasks = await getCache<any>(TASKS_CACHE);
        tasks.push(res.data);
        await setCache(TASKS_CACHE, tasks);
        this.notifyAll();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error?.message ?? 'Failed to create task' };
    } catch {
      // OFFLINE
      const cachedCategories = (await getCache<any>('categories_cache')) || [];
      const optimisticCategories = (data.categoryIds || []).map((cid: string) => {
        const cat = cachedCategories.find((c) => c.id === cid);
        return cat ? { category: cat } : null;
      }).filter(Boolean);

      const optimistic = {
        id,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? 'medium',
        status: 'pending',
        due_date: data.due_date ?? null,
        created_at: updated_at,
        updated_at,
        categories: optimisticCategories,
        subtasks: data.subtasks || [],
        recurrence_type: data.recurrence_type ?? null,
        recurrence_interval: data.recurrence_interval ?? null,
        recurrence_end_date: data.recurrence_end_date ?? null,
      };

      const tasks = await getCache<any>(TASKS_CACHE);
      tasks.push(optimistic);
      await setCache(TASKS_CACHE, tasks);
      
      await this.queueOp({
        id,
        entity: 'task',
        type: 'create',
        data: { ...data, id },
        updated_at,
      });
      this.notifyAll();
      return { success: true, data: optimistic, queued: true };
    }
  },

  async updateTask(id: string, data: any): Promise<MutationResult> {
    const updated_at = new Date().toISOString();
    try {
      const res = await apiClient.patch<any>(`/tasks/${id}`, data);
      if (res.success) {
        const tasks = await getCache<any>(TASKS_CACHE);
        const idx = tasks.findIndex((t) => t.id === id);
        if (idx >= 0) tasks[idx] = res.data;
        await setCache(TASKS_CACHE, tasks);
        this.notifyAll();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error?.message ?? 'Request failed' };
    } catch {
      const tasks = await getCache<any>(TASKS_CACHE);
      const idx = tasks.findIndex((t) => t.id === id);
      
      let optimisticCategories = tasks[idx]?.categories;
      if (data.categoryIds !== undefined) {
        const cachedCategories = (await getCache<any>('categories_cache')) || [];
        optimisticCategories = data.categoryIds.map((cid: string) => {
          const cat = cachedCategories.find((c) => c.id === cid);
          return cat ? { category: cat } : null;
        }).filter(Boolean);
      }

      if (idx >= 0) {
        tasks[idx] = { 
          ...tasks[idx], 
          ...data, 
          categories: optimisticCategories,
          updated_at 
        };
      }
      await setCache(TASKS_CACHE, tasks);
      
      await this.queueOp({ 
        id, 
        entity: 'task', 
        type: 'update', 
        data, 
        updated_at 
      });
      this.notifyAll();
      return { success: true, queued: true };
    }
  },

  async deleteTask(id: string): Promise<MutationResult> {
    const updated_at = new Date().toISOString();
    try {
      const res = await apiClient.delete(`/tasks/${id}`);
      if (res.success || res.error?.code === 'NOT_FOUND') {
        const tasks = await getCache<any>(TASKS_CACHE);
        await setCache(TASKS_CACHE, tasks.filter((t) => t.id !== id));
        this.notifyAll();
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Erro ao deletar' };
    } catch {
      const tasks = await getCache<any>(TASKS_CACHE);
      await setCache(TASKS_CACHE, tasks.filter((t) => t.id !== id));
      await this.queueOp({ id, entity: 'task', type: 'delete', data: {}, updated_at });
      this.notifyAll();
      return { success: true, queued: true };
    }
  },

  // ---------- Mutations (notas) ----------
  async createNote(data: any): Promise<MutationResult> {
    const id = genId();
    const updated_at = new Date().toISOString();
    try {
      const res = await apiClient.post<any>('/notes', data);
      if (res.success) {
        const notes = await getCache<any>(NOTES_CACHE);
        notes.unshift(res.data);
        await setCache(NOTES_CACHE, notes);
        this.notifyAll();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error?.message || 'Erro ao criar nota' };
    } catch {
      const optimistic = {
        id,
        title: data.title,
        content: data.content ?? '',
        created_at: updated_at,
        updated_at,
        categories: [],
      };
      const notes = await getCache<any>(NOTES_CACHE);
      notes.unshift(optimistic);
      await setCache(NOTES_CACHE, notes);
      await this.queueOp({
        id,
        entity: 'note',
        type: 'create',
        data: { ...data, id },
        updated_at,
      });
      this.notifyAll();
      return { success: true, data: optimistic, queued: true };
    }
  },

  async updateNote(id: string, data: any): Promise<MutationResult> {
    const updated_at = new Date().toISOString();
    try {
      const res = await apiClient.patch<any>(`/notes/${id}`, data);
      if (res.success) {
        const notes = await getCache<any>(NOTES_CACHE);
        const idx = notes.findIndex((n) => n.id === id);
        if (idx >= 0) notes[idx] = res.data;
        await setCache(NOTES_CACHE, notes);
        this.notifyAll();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error?.message || 'Erro ao atualizar' };
    } catch {
      const notes = await getCache<any>(NOTES_CACHE);
      const idx = notes.findIndex((n) => n.id === id);
      if (idx >= 0) notes[idx] = { ...notes[idx], ...data, updated_at };
      await setCache(NOTES_CACHE, notes);
      await this.queueOp({ id, entity: 'note', type: 'update', data, updated_at });
      this.notifyAll();
      return { success: true, queued: true };
    }
  },

  async deleteNote(id: string): Promise<MutationResult> {
    const updated_at = new Date().toISOString();
    try {
      const res = await apiClient.delete(`/notes/${id}`);
      if (res.success || res.error?.code === 'NOT_FOUND') {
        const notes = await getCache<any>(NOTES_CACHE);
        await setCache(NOTES_CACHE, notes.filter((n) => n.id !== id));
        this.notifyAll();
        return { success: true };
      }
      return { success: false, error: res.error?.message || 'Erro ao deletar' };
    } catch {
      const notes = await getCache<any>(NOTES_CACHE);
      await setCache(NOTES_CACHE, notes.filter((n) => n.id !== id));
      await this.queueOp({ id, entity: 'note', type: 'delete', data: {}, updated_at });
      this.notifyAll();
      return { success: true, queued: true };
    }
  },
};