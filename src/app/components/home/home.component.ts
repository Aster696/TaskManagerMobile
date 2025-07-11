import { Component, OnInit } from '@angular/core';
import { IonToolbar } from "@ionic/angular/standalone";
import { TaskService } from 'src/app/services/task/task.service';

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
        for (let i = 0; i < 100; i++) {
            this.items.push(i)
        }
    }

    loadMore(event: any) {
        setTimeout(() => {
            this.items.push()
        }, 1000);
    }

}
