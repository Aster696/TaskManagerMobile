import { TestBed } from '@angular/core/testing';

import { TaskAttachmentService } from './task-attachment.service';

describe('TaskAttachmentService', () => {
  let service: TaskAttachmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskAttachmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
