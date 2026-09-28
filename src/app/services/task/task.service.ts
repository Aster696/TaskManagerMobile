    import { Injectable } from '@angular/core';
    import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
    import { LocalNotifications } from '@capacitor/local-notifications';
import { DatabaseService } from '../database/database.service';

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

        public loading: boolean = false;
    
        constructor(
            private databaseService: DatabaseService
        ) {}

        async addTask(task: Task): Promise<any> {
            const db = this.databaseService.getDB();
        
            const result = await db.query(`
                SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
                FROM tasks
            `);
        
            const sortOrder = result.values?.[0]?.next_order ?? 0;
        
            const insertResult = await db.run(
                `INSERT INTO tasks
                (taskName, description, date_time, repeat_type, repeat_days, is_completed, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    task.taskName,
                    task.description,
                    task.date_time,
                    task.repeat_type,
                    JSON.stringify(task.repeat_days),
                    task.is_completed ? 1 : 0,
                    sortOrder
                ]
            );
        
            this.loading = false;
        
            return insertResult.changes?.lastId;
        }

        async getTasks(): Promise<Task[]> {
            const db = this.databaseService.getDB();
            const result = await db.query('Select * from tasks ORDER BY sort_order ASC');
            this.loading = false;
            return result.values as Task[];
        }

        async getTaskById(id: any): Promise<Task | undefined> {
            const db = this.databaseService.getDB();
            const result = await db.query('select * from tasks where id = ?', [id]);
            let task = result.values?.[0];
            task = {
                ...task,
                repeat_days: JSON.parse(task.repeat_days)
            }
            this.loading = false;
            return task as Task | undefined;
        }

        async updateTask(id: any, task: Task): Promise<void> {
            if(!id) throw new Error('Id is required');
            const db = this.databaseService.getDB();
            await db.run(
                `update tasks set taskName = ?, description = ?, date_time = ?, repeat_type =?, repeat_days = ? where id = ?`,
                [task.taskName, task.description, task.date_time, task.repeat_type, JSON.stringify(task.repeat_days), id]
            );
            this.loading = false;
        }

        async updateTaskCompleted(id: any, is_completed: boolean): Promise<void> {
            if(!id) throw new Error('Id is required');
            const db = this.databaseService.getDB();
            await db.run(
                `update tasks set is_completed = ? where id = ?`,
                [is_completed, id]
            );
            this.loading = false;
        }

        async deleteTask(id: any): Promise<number> {
            if(!id) throw new Error('Id is required');
            const db = this.databaseService.getDB();
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

        // update task order
        async updateTaskOrder(tasks: Task[]): Promise<void> {
            const db = this.databaseService.getDB();
        
            for (let i = 0; i < tasks.length; i++) {
            await db.run(
                `UPDATE tasks SET sort_order = ? WHERE id = ?`,
                [i, tasks[i].id]
            );
            }
        }

    }
