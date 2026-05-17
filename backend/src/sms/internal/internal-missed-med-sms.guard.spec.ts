import { describe, it, expect } from 'vitest';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InternalMissedMedSmsGuard } from './internal-missed-med-sms.guard';
import type { AppConfigService } from '../../config/app-config.service';

function mockCtx(headers: Record<string, string | string[] | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

describe('InternalMissedMedSmsGuard', () => {
  it('throws ServiceUnavailable when secret is not configured', () => {
    const guard = new InternalMissedMedSmsGuard({
      config: { INTERNAL_MISSED_MED_SMS_KEY: undefined },
    } as AppConfigService);
    expect(() => guard.canActivate(mockCtx({}))).toThrow(ServiceUnavailableException);
  });

  it('throws Unauthorized when header does not match', () => {
    const guard = new InternalMissedMedSmsGuard({
      config: { INTERNAL_MISSED_MED_SMS_KEY: 'correct' },
    } as AppConfigService);
    expect(() =>
      guard.canActivate(mockCtx({ 'x-carecircle-internal-key': 'wrong' })),
    ).toThrow(UnauthorizedException);
  });

  it('allows request with matching header', () => {
    const guard = new InternalMissedMedSmsGuard({
      config: { INTERNAL_MISSED_MED_SMS_KEY: 'correct' },
    } as AppConfigService);
    expect(
      guard.canActivate(mockCtx({ 'x-carecircle-internal-key': 'correct' })),
    ).toBe(true);
  });
});
