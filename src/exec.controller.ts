import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ExecService } from './exec.service';

@Controller('exec')
export class ExecController {
  constructor(private readonly execService: ExecService) {}

  @Post('sync')
  sync(@Body() body: any): string {
    console.log(body);
    return '0x';
  }
}
