import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('exec')
export class ExecController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll(): string {
    return 'test';
  }
}
