import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface Task {
    id?: number;
    taskName: string;
    description: string;
    date_time: string;
}
@Injectable({
    providedIn: 'root'
})
export class TaskService {

    private db: SQLiteDBConnection | undefined;
    private sqlite: SQLiteConnection | undefined;
    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite)
    }

    private async initDB(): Promise<SQLiteDBConnection> {
        if (this.db) return this.db;

        this.db = await this.sqlite?.createConnection('taskdb', false, 'no-encryption', 1, false);
        await this.db?.open();
        await this.db?.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                taskName TEXT NOT NULL,
                description TEXT,
                date_time TEXT
            )
        `)

        return this.db!;
    }

    async addTask(task: Task): Promise<void> {
        const db = await this.initDB();
        await db.run(
            'INSERT INTO tasks (taskName, description, date_time) VALUES (?, ?, ?)',
            [task.taskName, task.description, task.date_time]
        )
    }

    async getTasks(): Promise<Task[]> {
        const db = await this.initDB();
        const result = await db.query('Select * from tasks');
        return result.values as Task[];
    }

}
