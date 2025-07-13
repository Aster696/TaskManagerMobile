import { Component, OnInit } from '@angular/core';
import { TaskService } from 'src/app/services/task/task.service';
import { Task } from '../../services/task/task.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit {

    items: any[] = []

    constructor(
        private taskService: TaskService,
        private alertCtrl: AlertController,
        private toastCtrl: ToastController,
    ) { }

    ngOnInit() {
        // for (let i = 0; i < 20; i++) {
        //     this.items.push(i)
        // }
        // console.log(this.items)
        this.getTasks()
    }

    async getTasks() {
        this.items = await this.taskService.getTasks();
        console.log(this.items, 'data')
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

}
