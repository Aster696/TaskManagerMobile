import { Injectable } from '@angular/core';
import { DatabaseService } from '../database/database.service';

export interface TaskAttachment {
  id?: number;
  task_id: number;
  file_name: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
  sort_order: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskAttachmentService {

  constructor(
    private databaseService: DatabaseService
  ) {}

  // Get all attachments for a task
  async getTaskAttachments(
    taskId: number
  ): Promise<TaskAttachment[]> {

    const db = this.databaseService.getDB();

    const result = await db.query(
      `SELECT *
       FROM task_attachments
       WHERE task_id = ?
       ORDER BY sort_order ASC`,
      [taskId]
    );

    return (result.values || []) as TaskAttachment[];
  }

  // Get a single attachment by ID
  async getTaskAttachment(
    id: number
  ): Promise<TaskAttachment | null> {

    const db = this.databaseService.getDB();

    const result = await db.query(
      `SELECT *
       FROM task_attachments
       WHERE id = ?`,
      [id]
    );

    return (result.values?.[0] as TaskAttachment) || null;
  }

  // Add an attachment to a task
  async addTaskAttachment(
    attachment: Omit<TaskAttachment, 'id' | 'sort_order'> &
      Partial<Pick<TaskAttachment, 'sort_order'>>
  ): Promise<number> {

    const db = this.databaseService.getDB();

    const orderResult = await db.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM task_attachments
       WHERE task_id = ?`,
      [attachment.task_id]
    );

    const sortOrder =
      attachment.sort_order ??
      orderResult.values?.[0]?.next_order ??
      0;

    const result = await db.run(
      `INSERT INTO task_attachments (
        task_id,
        file_name,
        file_path,
        mime_type,
        file_size,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        attachment.task_id,
        attachment.file_name,
        attachment.file_path,
        attachment.mime_type ?? null,
        attachment.file_size ?? null,
        sortOrder
      ]
    );

    return result.changes?.lastId ?? 0;
  }

  // Update attachment metadata
  async updateTaskAttachment(
    attachment: TaskAttachment
  ): Promise<number> {

    if (attachment.id == null) {
      throw new Error('Attachment ID is required');
    }

    const db = this.databaseService.getDB();

    const result = await db.run(
      `UPDATE task_attachments
       SET file_name = ?,
           file_path = ?,
           mime_type = ?,
           file_size = ?,
           sort_order = ?
       WHERE id = ? AND task_id = ?`,
      [
        attachment.file_name,
        attachment.file_path,
        attachment.mime_type ?? null,
        attachment.file_size ?? null,
        attachment.sort_order,
        attachment.id,
        attachment.task_id
      ]
    );

    return result.changes?.changes ?? 0;
  }

  // Delete one attachment record
  async deleteTaskAttachment(
    id: number,
    taskId: number
  ): Promise<number> {

    const db = this.databaseService.getDB();

    const result = await db.run(
      `DELETE FROM task_attachments
       WHERE id = ? AND task_id = ?`,
      [id, taskId]
    );

    return result.changes?.changes ?? 0;
  }

  // Delete all attachment records belonging to a task
  async deleteTaskAttachments(
    taskId: number
  ): Promise<number> {

    const db = this.databaseService.getDB();

    const result = await db.run(
      `DELETE FROM task_attachments
       WHERE task_id = ?`,
      [taskId]
    );

    return result.changes?.changes ?? 0;
  }

  // Update attachment display order
  async updateAttachmentOrder(
    attachments: TaskAttachment[]
  ): Promise<void> {

    const db = this.databaseService.getDB();

    for (let i = 0; i < attachments.length; i++) {
      if (attachments[i].id == null) {
        throw new Error('Attachment ID is required');
      }

      await db.run(
        `UPDATE task_attachments
         SET sort_order = ?
         WHERE id = ? AND task_id = ?`,
        [
          i,
          attachments[i].id,
          attachments[i].task_id
        ]
      );
    }
  }
}