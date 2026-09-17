import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface Task {
    id?: number;
    taskName: string;
    description: string;
    date_time: string;
    repeat_type: 'none' | 'daily' | 'weekly',
    repeat_days: number[];
}
@Injectable({
    providedIn: 'root'
})
export class TaskService {

    public loading: boolean = false;
    
    private db: SQLiteDBConnection | undefined;
    private sqlite: SQLiteConnection | undefined;
    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite)
    }

    private async initDB(): Promise<SQLiteDBConnection> {
        if (this.db) return this.db;
    
        this.db = await this.sqlite?.createConnection(
            'taskdb',
            false,
            'no-encryption',
            1,
            false
        );
    
        await this.db?.open();
    
        await this.db?.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                taskName TEXT NOT NULL,
                description TEXT,
                date_time TEXT,
                repeat_type TEXT DEFAULT 'none',
                repeat_days TEXT DEFAULT '[]'
            )
        `);
    
        // Check existing columns
        const tableInfo = await this.db?.query(`PRAGMA table_info(tasks)`);
    
        const columns = tableInfo?.values?.map((column: any) => column.name) || [];
    
        // Migration: repeat_type
        if (!columns.includes('repeat_type')) {
            await this.db?.execute(`
                ALTER TABLE tasks
                ADD COLUMN repeat_type TEXT DEFAULT 'none'
            `);
        }
    
        // Migration: repeat_days
        if (!columns.includes('repeat_days')) {
            await this.db?.execute(`
                ALTER TABLE tasks
                ADD COLUMN repeat_days TEXT
            `);
        }
    
        return this.db!;
    }

    async addTask(task: Task): Promise<any> {
        const db = await this.initDB();
        const result = await db.run(
            'INSERT INTO tasks (taskName, description, date_time, repeat_type, repeat_days) VALUES (?, ?, ?, ?, ?)',
            [task.taskName, task.description, task.date_time, task.repeat_type, JSON.stringify(task.repeat_days)]
        );
        this.loading = false;
        return result.changes?.lastId;
    }

    async getTasks(): Promise<Task[]> {
        const db = await this.initDB();
        const result = await db.query('Select * from tasks');
        this.loading = false;
        return result.values as Task[];
    }

    async getTaskById(id: any): Promise<Task | undefined> {
        const db = await this.initDB();
        const result = await db.query('select * from tasks where id = ?', [id]);
        this.loading = false;
        return result.values?.[0] as Task | undefined;
    }

    async updateTask(id: any, task: Task): Promise<void> {
        if(!id) throw new Error('Id is required');
        const db = await this.initDB();
        await db.run(
            `update tasks set taskName = ?, description = ?, date_time = ?, repeat_type =?, repeat_days = ? where id = ?`,
            [task.taskName, task.description, task.date_time, task.repeat_type, JSON.stringify(task.repeat_days), id]
        );
        this.loading = false;
    }

    async deleteTask(id: any): Promise<number> {
        if(!id) throw new Error('Id is required');
        const db = await this.initDB();
        const result = await db.run(`delete from tasks where id = ?`, [id]);
        this.loading = false;
        return result.changes?.changes ?? 0;
    }

    // notification
    async scheduleTaskNotification(task: Task) {
        if(!task.date_time || !task.id) return;

        const date = new Date(task.date_time);
        
        switch(task.repeat_type) {
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

    private async scheduleOnce(task: Task) {
        await LocalNotifications.schedule({
            notifications: [{
                 id: task.id!,
                 title: 'Task Reminder',
                 body: task.taskName,
                 schedule: {
                    at: new Date(task.date_time)
                 },
                 extra: {
                    taskId: task.id
                 }
            }]
        });
    }

    private async scheduleDaily(task: Task, date: Date) {
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

    private async scheduleWeekly(task: Task, date: Date) {
        if(!task.repeat_days.length) return;

        const notifications = task.repeat_days.map((day: any) => ({
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
        })
    }

    private getNotificationId(taskId: number, day: number): number {
        return taskId * 10 + day;
    }

    async removeTaskNotification(id: number) {
        await LocalNotifications.cancel({
            notifications: [{
              id: id
            }]
          });
    }

}
