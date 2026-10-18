
import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import * as moment from 'moment';

import { Task, TaskService } from 'src/app/services/task/task.service';
import { TaskImageService } from 'src/app/services/task-image/task-image.service';
import { TaskAttachmentService } from 'src/app/services/task-attachment/task-attachment.service';

interface ExistingTaskImage {
  id: number;
  task_id: number;
  file_path: string;
  sort_order?: number;
  previewUrl: string;
  remove: boolean;
}

interface ExistingTaskAttachment {
  id: number;
  task_id: number;
  file_name: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
  sort_order?: number;
  remove: boolean;
}

interface SelectedTaskImage {
  file_path: string;
  previewUrl: string;
  file_name: string;
}

interface SelectedTaskFile {
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
}

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.scss'],
  standalone: false
})
export class AddTaskComponent implements OnInit, OnDestroy {

  form!: FormGroup;

  id: number | null = null;

  saving = false;

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

  // Images already saved in SQLite.
  existingImages: ExistingTaskImage[] = [];

  // Attachments already saved in SQLite.
  existingAttachments: ExistingTaskAttachment[] = [];

  // Newly selected images.
  selectedImages: SelectedTaskImage[] = [];

  // Newly selected attachments.
  selectedFiles: SelectedTaskFile[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private location: Location,
    private taskService: TaskService,
    private taskImageService: TaskImageService,
    private taskAttachmentService: TaskAttachmentService,
    private router: Router,
    private aroute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.buildForm();

    this.aroute.paramMap.subscribe(params => {
      const routeId = params.get('id');

      this.id = routeId !== null ? Number(routeId) : null;

      if (this.id !== null && Number.isFinite(this.id) && this.id > 0) {
        void this.getTaskById();
      } else {
        this.id = null;
      }
    });
  }

  buildForm(data?: Partial<Task>): void {
    this.selectedDays = [...(data?.repeat_days ?? [])];

    this.form = this.formBuilder.group({
      taskName: [
        data?.taskName ?? null,
        [Validators.required, Validators.minLength(3)]
      ],
      description: [data?.description ?? null],
      date_time: [
        data?.date_time ?? moment().format('YYYY-MM-DDTHH:mm:ss')
      ],
      repeat_type: [data?.repeat_type ?? 'none'],
      repeat_days: [this.selectedDays]
    });
  }

  // Load task details and existing media for edit mode.
  async getTaskById(): Promise<void> {
    if (this.id === null) {
      return;
    }

    this.taskService.loading = true;

    try {
      const taskId = this.id;

      const [task, images, attachments] = await Promise.all([
        this.taskService.getTaskById(taskId),
        this.taskImageService.getTaskImages(taskId),
        this.taskAttachmentService.getTaskAttachments(taskId)
      ]);

      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      // Patch task fields.
      this.buildForm(task);

      // Load saved images and prepare previews.
      this.existingImages = images.map((image: any) => ({
        ...image,
        previewUrl: Capacitor.convertFileSrc(image.file_path),
        remove: false
      }));

      // Load saved attachments.
      this.existingAttachments = attachments.map((file: any) => ({
        ...file,
        remove: false
      }));

    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      this.taskService.loading = false;
    }
  }

  // Reset selected weekdays when repeat type changes.
  onRepeatTypeChange(): void {
    this.selectedDays = [];

    this.form.patchValue({
      repeat_days: []
    });
  }

  toggleDay(day: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedDays.includes(day)) {
        this.selectedDays = [...this.selectedDays, day];
      }
    } else {
      this.selectedDays = this.selectedDays.filter(
        selectedDay => selectedDay !== day
      );
    }

    this.form.patchValue({
      repeat_days: [...this.selectedDays]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.taskService.loading = true;

    try {
      const task: Task = {
        ...this.form.getRawValue(),
        repeat_days: [...this.selectedDays]
      };

      let taskId: number;

      if (this.id === null) {
        // Create task and media records in one database transaction.
        taskId = await this.taskService.addTaskWithFiles(
          task,
          this.selectedImages,
          this.selectedFiles
        );

        // Schedule notification after successful database insertion.
        const savedTask = await this.taskService.getTaskById(taskId);

        if (savedTask) {
          try {
            await this.scheduleTaskNotification(savedTask);
          } catch (error) {
            console.error('Notification scheduling failed:', error);
          }
        }

      } else {
        taskId = this.id;

        // Update task fields.
        await this.taskService.updateTask(taskId, task);

        // Delete existing images marked for removal.
        for (const image of this.existingImages) {
          if (image.remove) {
            await this.taskImageService.deleteTaskImage(image.id);
          }
        }

        // Delete existing attachments marked for removal.
        // Uses the plural method name from your current code.
        for (const file of this.existingAttachments) {
          if (file.remove) {
            await this.taskAttachmentService.deleteTaskAttachments(
              file.id
            );
          }
        }

        // Insert newly selected images.
        for (const image of this.selectedImages) {
          await this.taskImageService.addTaskImage(
            taskId,
            image.file_path
          );
        }

        // Insert newly selected attachments.
        for (const file of this.selectedFiles) {
          await this.taskAttachmentService.addTaskAttachment({
            task_id: taskId,
            file_name: file.file_name,
            file_path: file.file_path,
            mime_type: file.mime_type,
            file_size: file.file_size
          });
        }

        // Refresh the task notification.
        try {
          await this.updateTaskNotification({
            id: taskId,
            ...task
          });
        } catch (error) {
          console.error('Notification update failed:', error);
        }
      }

      this.cleanupSelectedImagePreviews();

      await this.router.navigate(['/home']);

    } catch (error) {
      console.error('Failed to save task:', error);
      // Display an error toast here if required.
    } finally {
      this.saving = false;
      this.taskService.loading = false;
    }
  }

  onCancel(): void {
    this.cleanupSelectedImagePreviews();
    this.form.reset();
    this.location.back();
  }

  // Schedule notification for a new task.
  async scheduleTaskNotification(task: Task): Promise<void> {
    await this.taskService.scheduleTaskNotification(task);
  }

  // Cancel the old notification and schedule the updated one.
  async updateTaskNotification(task: Task): Promise<void> {
    if (!task.id) {
      return;
    }

    await this.taskService.removeTaskNotification(task.id);

    if (
      task.date_time &&
      moment(task.date_time).isAfter(moment())
    ) {
      await this.taskService.scheduleTaskNotification(task);
    }
  }

  // Select and save new banner images.
  async onImagesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      try {
        const filePath = await this.saveLocalFile(file, 'images');

        this.selectedImages.push({
          file_path: filePath,
          previewUrl: URL.createObjectURL(file),
          file_name: file.name
        });
      } catch (error) {
        console.error('Failed to save image:', error);
      }
    }

    // Permit selecting the same file again.
    input.value = '';
  }

  // Select and save new attachments.
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    for (const file of files) {
      try {
        const filePath = await this.saveLocalFile(file, 'attachments');

        this.selectedFiles.push({
          file_name: file.name,
          file_path: filePath,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size
        });
      } catch (error) {
        console.error('Failed to save attachment:', error);
      }
    }

    input.value = '';
  }

  // Mark an existing image for removal.
  removeExistingImage(imageId: number): void {
    this.existingImages = this.existingImages.map(image =>
      image.id === imageId
        ? { ...image, remove: true }
        : image
    );
  }

  undoRemoveImage(imageId: number): void {
    this.existingImages = this.existingImages.map(image =>
      image.id === imageId
        ? { ...image, remove: false }
        : image
    );
  }

  // Mark an existing attachment for removal.
  removeExistingAttachment(fileId: number): void {
    this.existingAttachments = this.existingAttachments.map(file =>
      file.id === fileId
        ? { ...file, remove: true }
        : file
    );
  }

  undoRemoveAttachment(fileId: number): void {
    this.existingAttachments = this.existingAttachments.map(file =>
      file.id === fileId
        ? { ...file, remove: false }
        : file
    );
  }

  // Remove a newly selected image before saving.
  removeImage(index: number): void {
    const image = this.selectedImages[index];

    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }

    this.selectedImages.splice(index, 1);
  }

  // Remove a newly selected attachment before saving.
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  // Save a physical file in the app's local data directory.
  private async saveLocalFile(
    file: File,
    folder: 'images' | 'attachments'
  ): Promise<string> {
    const base64Data = await this.fileToBase64(file);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const uniqueName =
      `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

    const path = `task-media/${folder}/${uniqueName}`;

    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Data,
      recursive: true
    });

    const result = await Filesystem.getUri({
      path,
      directory: Directory.Data
    });

    return result.uri;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== 'string') {
          reject(new Error('Could not read the selected file.'));
          return;
        }

        // Remove the data URL prefix.
        resolve(result.substring(result.indexOf(',') + 1));
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read file.'));
      };

      reader.readAsDataURL(file);
    });
  }

  private cleanupSelectedImagePreviews(): void {
    for (const image of this.selectedImages) {
      URL.revokeObjectURL(image.previewUrl);
    }
  }

  ngOnDestroy(): void {
    this.cleanupSelectedImagePreviews();
  }
}
