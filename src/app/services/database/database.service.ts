import { Injectable } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection
} from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private sqlite: SQLiteConnection;
  private db?: SQLiteDBConnection;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize(): Promise<void> {

    if (this.db) {
      return;
    }

    this.db = await this.sqlite.createConnection(
      'taskdb',
      false,
      'no-encryption',
      1,
      false
    );

    await this.db.open();

    await this.createTables();
    await this.runMigrations();
  }

  private async createTables(): Promise<void> {

    await this.db?.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskName TEXT NOT NULL,
        description TEXT,
        date_time TEXT,
        repeat_type TEXT DEFAULT 'none',
        repeat_days TEXT DEFAULT '[]',
        is_completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      )
    `);

    await this.db?.execute(`
      CREATE TABLE IF NOT EXISTS task_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `);

    await this.db?.execute(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        sort_order INTEGER DEFAULT 0
      )
    `);
  }

  private async runMigrations(): Promise<void> {

    const tableInfo = await this.db?.query(`
      PRAGMA table_info(tasks)
    `);

    const columns =
      tableInfo?.values?.map((column: any) => column.name) || [];

    if (!columns.includes('repeat_type')) {

      await this.db?.execute(`
        ALTER TABLE tasks
        ADD COLUMN repeat_type TEXT DEFAULT 'none'
      `);
    }

    if (!columns.includes('repeat_days')) {

      await this.db?.execute(`
        ALTER TABLE tasks
        ADD COLUMN repeat_days TEXT DEFAULT '[]'
      `);
    }

    if (!columns.includes('is_completed')) {

      await this.db?.execute(`
        ALTER TABLE tasks
        ADD COLUMN is_completed INTEGER DEFAULT 0
      `);
    }

    if (!columns.includes('sort_order')) {

      await this.db?.execute(`
        ALTER TABLE tasks
        ADD COLUMN sort_order INTEGER DEFAULT 0
      `);

      await this.db?.execute(`
        UPDATE tasks
        SET sort_order = id
        WHERE sort_order IS NULL
      `);
    }
  }

  getDB(): SQLiteDBConnection {

    if (!this.db) {
      throw new Error(
        'Database has not been initialized. Call initialize() first.'
      );
    }

    return this.db;
  }
}