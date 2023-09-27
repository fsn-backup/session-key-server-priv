import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExecController } from './exec.controller';

@Module({
  imports: [],
  controllers: [AppController, ExecController],
  providers: [AppService],
})
export class AppModule {}
