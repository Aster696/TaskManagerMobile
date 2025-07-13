import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
      date_time: [data?.date_time || null],
    })
  }

  async getTaskById() {
    let task = await this.taskService.getTaskById(this.id)
    this.buildForm(task)
  }

  async onSubmit() {
    if(this.form.valid) {
      console.log(this.form.value)
      const task: Task = this.form.value;
      if(!this.id) {
        await this.taskService.addTask(task);
      }else {
        await this.taskService.updateTask(this.id, task)
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

}
