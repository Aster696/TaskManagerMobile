import { TestBed } from '@angular/core/testing';

import { TaskImageService } from './task-image.service';

describe('TaskImageService', () => {
  let service: TaskImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
