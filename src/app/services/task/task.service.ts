
import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { DatabaseService } from '../database/database.service';

export interface SelectedTaskImage {
  file_path: string;
}

export interface SelectedTaskFile {
  file_name: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
}

export interface Task {
  id?: number;
  taskName: string;
  description: string;
  date_time: string;
  repeat_type: 'none' | 'daily' | 'weekly';
  repeat_days: number[];
  is_completed?: boolean;
  sort_order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  public loading = false;

  constructor(
    private databaseService: DatabaseService
  ) {}

  // Create a task without images or attachments.
  async addTask(task: Task): Promise<number> {
    const db = this.databaseService.getDB();

    const result = await db.query(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
      FROM tasks
    `);

    const sortOrder = result.values?.[0]?.next_order ?? 0;

    const insertResult = await db.run(
      `INSERT INTO tasks (
        taskName,
        description,
        date_time,
        repeat_type,
        repeat_days,
        is_completed,
        sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        task.taskName,
        task.description ?? '',
        task.date_time,
        task.repeat_type,
        JSON.stringify(task.repeat_days ?? []),
        task.is_completed ? 1 : 0,
        sortOrder
      ]
    );

    this.loading = false;

    const taskId = insertResult.changes?.lastId;

    if (!taskId) {
      throw new Error('Failed to create task.');
    }

    return taskId;
  }

  // Create a task, its images, and attachments atomically.
  async addTaskWithFiles(
    task: Task,
    images: SelectedTaskImage[],
    files: SelectedTaskFile[]
  ): Promise<number> {
    try {
      return await this.databaseService.runInTransaction(async (db) => {
        // 1. Get the next task order.
        const orderResult = await db.query(`
          SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
          FROM tasks
        `);

        const sortOrder = orderResult.values?.[0]?.next_order ?? 0;

        // 2. Insert the task.
        const taskResult = await db.run(
          `INSERT INTO tasks (
            taskName,
            description,
            date_time,
            repeat_type,
            repeat_days,
            is_completed,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            task.taskName,
            task.description ?? '',
            task.date_time,
            task.repeat_type,
            JSON.stringify(task.repeat_days ?? []),
            task.is_completed ? 1 : 0,
            sortOrder
          ],
          false
        );

        const taskId = taskResult.changes?.lastId;

        if (!taskId) {
          throw new Error('Failed to create task.');
        }

        // 3. Insert image records.
        for (let i = 0; i < images.length; i++) {
          await db.run(
            `INSERT INTO task_images (
              task_id,
              file_path,
              sort_order
            ) VALUES (?, ?, ?)`,
            [
              taskId,
              images[i].file_path,
              i
            ],
            false
          );
        }

        // 4. Insert attachment records.
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          await db.run(
            `INSERT INTO task_attachments (
              task_id,
              file_name,
              file_path,
              mime_type,
              file_size,
              sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              file.file_name,
              file.file_path,
              file.mime_type ?? null,
              file.file_size ?? null,
              i
            ],
            false
          );
        }

        // DatabaseService commits when this callback succeeds.
        return Number(taskId);
      });
    } finally {
      this.loading = false;
    }
  }

  async getTasks(): Promise<Task[]> {
    const db = this.databaseService.getDB();

    const result = await db.query(
      'SELECT * FROM tasks ORDER BY sort_order ASC'
    );

    this.loading = false;

    return (result.values ?? []).map((row: any) => ({
      ...row,
      repeat_days: this.parseRepeatDays(row.repeat_days),
      is_completed: Boolean(row.is_completed)
    })) as Task[];
  }

  async getTaskById(id: number | string): Promise<Task | undefined> {
    const db = this.databaseService.getDB();

    const result = await db.query(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );

    const row = result.values?.[0];

    this.loading = false;

    if (!row) {
      return undefined;
    }

    return {
      ...row,
      repeat_days: this.parseRepeatDays(row.repeat_days),
      is_completed: Boolean(row.is_completed)
    } as Task;
  }

  private parseRepeatDays(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value.map(Number);
    }

    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }

  async updateTask(id: number | string, task: Task): Promise<void> {
    if (!id) {
      throw new Error('Id is required.');
    }

    const db = this.databaseService.getDB();

    await db.run(
      `UPDATE tasks
       SET taskName = ?,
           description = ?,
           date_time = ?,
           repeat_type = ?,
           repeat_days = ?
       WHERE id = ?`,
      [
        task.taskName,
        task.description ?? '',
        task.date_time,
        task.repeat_type,
        JSON.stringify(task.repeat_days ?? []),
        id
      ]
    );

    this.loading = false;
  }

  async updateTaskCompleted(
    id: number,
    is_completed: boolean
  ): Promise<void> {
    if (!id) {
      throw new Error('Id is required.');
    }

    const db = this.databaseService.getDB();

    await db.run(
      'UPDATE tasks SET is_completed = ? WHERE id = ?',
      [is_completed ? 1 : 0, id]
    );

    this.loading = false;
  }

  async deleteTask(id: number): Promise<number> {
    if (!id) {
      throw new Error('Id is required.');
    }

    const db = this.databaseService.getDB();

    const result = await db.run(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );

    this.loading = false;

    return result.changes?.changes ?? 0;
  }

  // Notifications.
  async scheduleTaskNotification(task: Task): Promise<void> {
    if (!task.date_time || !task.id) {
      return;
    }

    const date = new Date(task.date_time);

    switch (task.repeat_type) {
      case 'none':
        await this.scheduleOnce(task);
        break;

      case 'daily':
        await this.scheduleDaily(task, date);
        break;

      case 'weekly':
        await this.scheduleWeekly(task, date);
        break;
    }
  }

  private async scheduleOnce(task: Task): Promise<void> {
    const date = new Date(task.date_time);

    // Don't schedule a one-time notification in the past.
    if (date.getTime() <= Date.now()) {
      return;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: task.id!,
        title: 'Task Reminder',
        body: task.taskName,
        schedule: {
          at: date
        },
        extra: {
          taskId: task.id
        }
      }]
    });
  }

  private async scheduleDaily(task: Task, date: Date): Promise<void> {
    await LocalNotifications.schedule({
      notifications: [{
        id: task.id!,
        title: 'Task Reminder',
        body: task.taskName,
        schedule: {
          on: {
            hour: date.getHours(),
            minute: date.getMinutes()
          }
        },
        extra: {
          taskId: task.id
        }
      }]
    });
  }

  private async scheduleWeekly(task: Task, date: Date): Promise<void> {
    if (!task.repeat_days?.length) {
      return;
    }

    const notifications = task.repeat_days.map((day: number) => ({
      id: this.getNotificationId(task.id!, day),
      title: 'Task Reminder',
      body: task.taskName,
      schedule: {
        on: {
          weekday: day,
          hour: date.getHours(),
          minute: date.getMinutes()
        }
      },
      extra: {
        taskId: task.id,
        weekday: day
      }
    }));

    await LocalNotifications.schedule({
      notifications
    });
  }

  private getNotificationId(taskId: number, day: number): number {
    return taskId * 10 + day;
  }

  // Cancel the main notification and all possible weekly notification IDs.
  async removeTaskNotification(id: number): Promise<void> {
    const notifications = Array.from(
      { length: 8 },
      (_, index) => ({
        id: index === 0 ? id : this.getNotificationId(id, index - 1)
      })
    );

    await LocalNotifications.cancel({ notifications });
  }

  // Update task ordering after drag-and-drop.
  async updateTaskOrder(tasks: Task[]): Promise<void> {
    const db = this.databaseService.getDB();

    await this.databaseService.runInTransaction(async (transactionDb) => {
      for (let i = 0; i < tasks.length; i++) {
        await transactionDb.run(
          'UPDATE tasks SET sort_order = ? WHERE id = ?',
          [i, tasks[i].id],
          false
        );
      }
    });

    this.loading = false;
  }
}
