import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { GmailMailerService } from '../email/gmail-mailer.service';
import { GroupInviteEmailController } from './group-invite-email.controller';
import { GroupInviteEmailService } from './group-invite-email.service';

@Module({
  imports: [AppConfigModule],
  controllers: [GroupInviteEmailController],
  providers: [GmailMailerService, GroupInviteEmailService],
})
export class InvitesModule {}
