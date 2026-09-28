import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { TaskImage } from 'src/app/models/task-image.model';
import { DatabaseService } from '../database/database.service';

@Injectable({
  providedIn: 'root'
})
export class TaskImageService {

  constructor(
    private databaseService: DatabaseService
  ) {}

  async getTaskImages(taskId: number): Promise<TaskImage[]> {

    const db = this.databaseService.getDB();

    const result = await db.query(
      `
      SELECT *
      FROM task_images
      WHERE task_id = ?
      ORDER BY sort_order ASC
      `,
      [taskId]
    );

    return result.values || [];
  }

  /**
   * Get single image
   */
  async getTaskImage(id: number): Promise<TaskImage | null> {

    const db = this.databaseService.getDB();

    const result = await db.query(
      `
      SELECT *
      FROM task_images
      WHERE id = ?
      `,
      [id]
    );

    return result.values?.[0] || null;
  }

  /**
   * Add image to a task
   */
  async addTaskImage(
    taskId: number,
    filePath: string
  ): Promise<number> {

    const db = this.databaseService.getDB();

    const result = await db.query(
      `
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
      FROM task_images
      WHERE task_id = ?
      `,
      [taskId]
    );

    const sortOrder =
      result.values?.[0]?.next_order ?? 0;

    const insertResult = await db.run(
      `
      INSERT INTO task_images
      (
        task_id,
        file_path,
        sort_order
      )
      VALUES (?, ?, ?)
      `,
      [
        taskId,
        filePath,
        sortOrder
      ]
    );

    return insertResult.changes?.lastId ?? 0;
  }

  /**
   * Delete image
   */
  async deleteTaskImage(id: number): Promise<number> {

    const db = this.databaseService.getDB();

    const result = await db.run(
      `
      DELETE FROM task_images
      WHERE id = ?
      `,
      [id]
    );

    return result.changes?.changes ?? 0;
  }

  /**
   * Delete all images belonging to a task
   */
  async deleteTaskImages(taskId: number): Promise<number> {

    const db = this.databaseService.getDB();

    const result = await db.run(
      `
      DELETE FROM task_images
      WHERE task_id = ?
      `,
      [taskId]
    );

    return result.changes?.changes ?? 0;
  }

  /**
   * Update image order
   */
  async updateImageOrder(
    images: TaskImage[]
  ): Promise<void> {

    const db = this.databaseService.getDB();

    for (let i = 0; i < images.length; i++) {

      await db.run(
        `
        UPDATE task_images
        SET sort_order = ?
        WHERE id = ?
        `,
        [
          i,
          images[i].id
        ]
      );

    }
  }

  /**
   * Update image
   */
  async updateTaskImage(
    image: TaskImage
  ): Promise<number> {

    if (!image.id) {
      return 0;
    }

    const db = this.databaseService.getDB();

    const result = await db.run(
      `
      UPDATE task_images
      SET
        file_path = ?,
        sort_order = ?
      WHERE id = ?
      `,
      [
        image.file_path,
        image.sort_order,
        image.id
      ]
    );

    return result.changes?.changes ?? 0;
  }

}
