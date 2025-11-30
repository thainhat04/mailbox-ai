import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ImapService } from '../email/services/imap.service';
import { OAuth2TokenService } from '../email/services/oauth2-token.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [MailService, ImapService, OAuth2TokenService],
  exports: [MailService, ImapService, OAuth2TokenService],
})
export class MailModule { }
