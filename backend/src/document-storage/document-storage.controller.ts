import {
  Controller,
  Get,
  Headers,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DocumentStorageService,
  type DocumentStorageUsage,
} from './document-storage.service';

@Controller('document-storage')
export class DocumentStorageController {
  constructor(
    private readonly documentStorageService: DocumentStorageService,
  ) {}

  @Get('groups/:groupId/usage')
  getGroupUsage(
    @Param('groupId') groupId: string,
    @Headers('authorization') authorizationHeader?: string,
  ): Promise<DocumentStorageUsage> {
    const accessToken = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!accessToken) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    return this.documentStorageService.getGroupStorageUsage(
      groupId,
      accessToken,
    );
  }
}
