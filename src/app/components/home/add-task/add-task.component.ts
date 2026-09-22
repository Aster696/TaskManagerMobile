import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalNotifications } from '@capacitor/local-notifications';
import * as moment from 'moment';
import { TaskService } from 'src/app/services/task/task.service';
import { Task } from 'src/app/services/task/task.service';

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.scss'],
  standalone: false
})
export class AddTaskComponent  implements OnInit {

  form!: FormGroup;
  id: any;
  minDateTime = moment().format('YYYY-MM-DDTHH:mm:ss');
  days = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];
  
  selectedDays: number[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private location: Location,
    private taskService: TaskService,
    private router: Router,
    private aroute: ActivatedRoute
  ) { }

  ngOnInit() {
    this.buildForm();
    this.aroute.paramMap.subscribe((params) => {
      if(params.has('id')) {
        this.id = params.get('id');
        this.getTaskById();
      }
    })
  }

  buildForm(data?: any) {
    this.form = this.formBuilder.group({
      taskName: [data?.taskName || null, [Validators.required, Validators.minLength(3)]],
      description: [data?.description || null],
      date_time: [data?.date_time || moment().format('YYYY-MM-DDTHH:mm:ss')],
      repeat_type: [data?.repeat_type || 'none'],
      repeat_days: [[]]
    });
    this.selectedDays = data?.repeat_days || [];
  }

  async getTaskById() {
    let task = await this.taskService.getTaskById(this.id)
    this.buildForm(task)
  }

  async onSubmit() {
    if(this.form.valid) {
      this.taskService.loading = true;
      const task: Task = this.form.value;
      if(!this.id) {
        const task_id = await this.taskService.addTask(task);
        if(task_id && task.date_time) {
          this.scheduleTaskNotification({id: task_id, ...task})
        }
      }else {
        await this.taskService.updateTask(this.id, task)
        .then((res: any) => this.updateTaskNotification({id: this.id, ...task}));
      }
      this.router.navigate(['/home'])
    }else {
      this.form.markAllAsTouched();
    }
  }

  onCancel() {
    this.form.reset();
    this.location.back();
  }

  // notification
  async scheduleTaskNotification(task: any) {
    await this.taskService.scheduleTaskNotification(task);
  }

  // update notification
  async updateTaskNotification(item: any) {
    if(!item?.id || !item.date_time) return;

    await this.taskService.removeTaskNotification(item?.id);

    if(moment(item.date_time).isAfter(moment())) {
      await this.taskService.scheduleTaskNotification(item)
    }
  }

  toggleDay(day: number, checked: boolean) {
    if (checked) {
      this.selectedDays.push(day);
    } else {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    }
  
    this.form.patchValue({
      repeat_days: this.selectedDays
    });
  }

}
