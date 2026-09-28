import { Component, OnInit } from '@angular/core';
import { DatabaseService } from './services/database/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit{

  constructor(
    private databaseService: DatabaseService
  ) {}

  async ngOnInit() {

    await this.databaseService.initialize();

    console.log('Database initialized');
  }
  
}
