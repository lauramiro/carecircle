import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

/** Hides dev-only routes outside development (returns 404). */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(private readonly appConfigService: AppConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    if (this.appConfigService.config.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return true;
  }
}
