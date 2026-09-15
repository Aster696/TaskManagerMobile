import { Component } from '@angular/core';
import { TaskService } from 'src/app/services/task/task.service';
import * as moment from 'moment';
import { AlertController, ToastController } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent {

    items: any[] = []

    constructor(
        private taskService: TaskService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
    ) { }

    ionViewWillEnter() {
        // for (let i = 0; i < 20; i++) {
        //     this.items.push(i)
        // }
        // console.log(this.items)
        this.getTasks();
        this.notificationPermission()
    }

    isLoading() {
        return this.taskService.loading;
    }

    async getTasks() {
        this.taskService.loading = true;
        this.items = await this.taskService.getTasks();
        console.log(this.items);
        for(let item of this.items) {
            if(item.date_time && moment(item.date_time).isAfter(moment())) {
                this.scheduleTaskNotification(item);
            }
        }
    }

    async confirmDelete(id: any) {
        const alert = await this.alertCtrl.create({
            header: 'Confirm Delete',
            message: 'Are you sure you want to delete this task?',
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Confirm',
                    role: 'destructive',
                    handler: async () => {
                        try {
                            const changes = await this.taskService.deleteTask(id)
                            if(changes > 0) {
                                this.showToast('Task deleted successfully!', 'success');
                                this.getTasks();
                            }else {
                                this.showToast('Task not found or already deleted.', 'warning');
                            }
                        } catch (error) {
                            this.showToast('Failed to delete task', 'danger')
                        }
                    }
                }
            ]
        })

        alert.present();
    }

    async showToast(message: string, color: 'success' | 'warning' | 'danger') {
        const toast = await this.toastCtrl.create({
            message,
            duration: 2000,
            color,
            position: 'bottom'
        });
        await toast.present();
    }

    async notificationPermission() {
        const permission = await LocalNotifications.requestPermissions();
        console.log(permission)
    }

    async scheduleTaskNotification(task: any) {
        if(!task.date_time) return;

        await LocalNotifications.schedule({
            notifications: [{
                 id: task.id,
                 title: 'Task Reminder',
                 body: task.taskName,
                 schedule: {
                    at: new Date(task.date_time)
                 },
                 extra: {
                    taskId: task.id
                 }
            }]
        })
    }

}
