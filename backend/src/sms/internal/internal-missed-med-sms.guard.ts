import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Protects internal hooks invoked by the push pipeline (not for browser clients).
 */
@Injectable()
export class InternalMissedMedSmsGuard implements CanActivate {
  constructor(private readonly appConfig: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.appConfig.config.INTERNAL_MISSED_MED_SMS_KEY?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('internal_push_endpoint_disabled');
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-carecircle-internal-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (key !== secret) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
