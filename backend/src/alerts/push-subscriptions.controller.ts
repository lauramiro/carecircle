import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AppConfigService } from '../config/app-config.service';
import { PushSubscriptionRepository } from '../integrations/repositories/push-subscription.repository';

class RegisterPushSubscriptionDto {
  @IsUUID()
  userId!: string;

  @IsIn(['web_push', 'fcm'])
  platform!: 'web_push' | 'fcm';

  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsOptional()
  @IsString()
  p256dh?: string;

  @IsOptional()
  @IsString()
  auth?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

class DeletePushSubscriptionDto {
  @IsUUID()
  userId!: string;
}

@Controller('push')
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubRepo: PushSubscriptionRepository,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get('vapid-public-key')
  getVapidPublicKey(): { publicKey: string | null } {
    return { publicKey: this.appConfig.config.VAPID_PUBLIC_KEY ?? null };
  }

  @Post('subscriptions')
  async register(@Body() dto: RegisterPushSubscriptionDto) {
    const record = await this.pushSubRepo.upsert({
      userId: dto.userId,
      platform: dto.platform,
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
      userAgent: dto.userAgent,
    });
    return { id: record.id };
  }

  @Delete('subscriptions/:id')
  async unregister(@Param('id') id: string, @Body() dto: DeletePushSubscriptionDto) {
    const deleted = await this.pushSubRepo.deleteById(id, dto.userId);
    return { deleted };
  }
}
