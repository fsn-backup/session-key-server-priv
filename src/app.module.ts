import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExecController } from './exec.controller';
import { ExecService } from './exec.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, ExecController],
  providers: [AppService, ExecService],
})
export class AppModule {}
