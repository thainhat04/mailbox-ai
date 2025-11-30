import { Module } from "@nestjs/common";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { ImapService } from './services/imap.service';
import { OAuth2TokenService } from './services/oauth2-token.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EmailController],
  providers: [EmailService, ImapService, OAuth2TokenService],
  exports: [EmailService, ImapService, OAuth2TokenService],
})
export class EmailModule {}
