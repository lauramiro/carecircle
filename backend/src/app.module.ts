import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { AppThrottlingModule } from './throttling/throttling.module';

@Module({
  imports: [AppConfigModule, AppThrottlingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
