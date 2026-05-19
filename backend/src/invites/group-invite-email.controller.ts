import { Body, Controller, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { SendGroupInviteEmailDto } from './dto/send-group-invite-email.dto';
import { GroupInviteEmailService } from './group-invite-email.service';

@Controller('invites/group')
export class GroupInviteEmailController {
  constructor(private readonly inviteMail: GroupInviteEmailService) {}

  @Post('send-email')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async sendEmail(@Body() body: SendGroupInviteEmailDto) {
    return this.inviteMail.sendInviteEmail(body);
  }
}
