import {
  Body,
  Controller,
  HttpCode,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SendGroupInviteEmailDto } from './dto/send-group-invite-email.dto';
import { GroupInviteEmailService } from './group-invite-email.service';

@Controller('invites/group')
export class GroupInviteEmailController {
  constructor(private readonly inviteMail: GroupInviteEmailService) {}

  /**
   * Sends the email side-effect for an already-created group invite.
   *
   * Invite creation and membership validation live in the frontend/Supabase flow;
   * this handler focuses on the server-only Gmail credential boundary so those
   * secrets never ship to the browser.
   *
   * @param body Request body containing invite recipient, care-group context,
   * and invite-link fields required by `GroupInviteEmailService`.
   * @returns Email send result from `GroupInviteEmailService`.
   * @throws Error Propagates validation, mail configuration, or SMTP delivery errors.
   */
  @Post('send-email')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async sendEmail(@Body() body: SendGroupInviteEmailDto) {
    return this.inviteMail.sendInviteEmail(body);
  }
}
