import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExecController } from './exec/exec.controller';
import { ExecService } from './exec/exec.service';
import { ConfigModule } from '@nestjs/config';
import { LruCacheService } from './lru-cache/lru-cache.service';
import { UserOpService } from './user-op/user-op.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, ExecController],
  providers: [AppService, ExecService, LruCacheService, UserOpService],
})
export class AppModule {}
