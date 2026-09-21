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
    }

    async updateTaskCompleted(task: any, is_completed: any) {
        task.is_completed = is_completed
        await this.taskService.updateTaskCompleted(task.id, is_completed);
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
        await this.taskService.scheduleTaskNotification(task);
    }

}
