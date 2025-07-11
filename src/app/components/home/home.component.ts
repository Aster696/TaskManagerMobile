import { Component, OnInit } from '@angular/core';
import { TaskService } from 'src/app/services/task/task.service';
import { Task } from '../../services/task/task.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit {

    items: any[] = []

    constructor(
        private taskService: TaskService
    ) { }

    ngOnInit() {
        for (let i = 0; i < 20; i++) {
            this.items.push(i)
        }
        console.log(this.items)
        // this.getTasks()
    }

    async getTasks() {
        this.items = await this.taskService.getTasks()
        console.log(this.items, 'data')
    }

    async addTask() {
        let task: Task = {
            taskName: 'Aster',
            description: 'Desc',
            date_time: '11-07-2025'
        }
        await this.taskService.addTask(task)
        this.getTasks();
    }
}
