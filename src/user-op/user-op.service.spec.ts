import { Test, TestingModule } from '@nestjs/testing';
import { UserOpService } from './user-op.service';

describe('UserOpService', () => {
  let service: UserOpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserOpService],
    }).compile();

    service = module.get<UserOpService>(UserOpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
