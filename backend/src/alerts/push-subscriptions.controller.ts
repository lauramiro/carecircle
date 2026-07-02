import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
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

  /**
   * Exposes the VAPID public key required by browser PushManager.subscribe().
   *
   * Returning `null` is deliberate: it lets the frontend disable push setup in
   * local environments where push is not configured, without treating that as
   * an API failure.
   *
   * @returns Object containing the VAPID public key, or `null` when push is disabled.
   */
  @Get('vapid-public-key')
  getVapidPublicKey(): { publicKey: string | null } {
    return { publicKey: this.appConfig.config.VAPID_PUBLIC_KEY ?? null };
  }

  /**
   * Registers or refreshes a user's push subscription endpoint.
   *
   * Subscriptions are upserted by the repository because browsers can rotate
   * endpoint/key material; callers should send the complete subscription every
   * time registration succeeds rather than attempting partial updates.
   *
   * @param dto Request body containing user ID, platform, endpoint, and optional
   * browser key material.
   * @returns Object containing the stored push subscription ID.
   * @throws Error Propagates validation or repository errors when the
   * subscription cannot be stored.
   */
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

  /**
   * Deletes a push subscription owned by the requesting user.
   *
   * The `userId` body guard prevents one user from deleting another user's
   * subscription when clients clean up stale browser registrations.
   *
   * @param id Push subscription route parameter to delete.
   * @param dto Request body containing the owner `userId`.
   * @returns Object indicating whether a subscription row was deleted.
   * @throws Error Propagates repository errors when deletion fails.
   */
  @Delete('subscriptions/:id')
  async unregister(
    @Param('id') id: string,
    @Body() dto: DeletePushSubscriptionDto,
  ) {
    const deleted = await this.pushSubRepo.deleteById(id, dto.userId);
    return { deleted };
  }
}
