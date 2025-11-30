import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Post,
  Body,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { EmailService } from "./email.service";
import {
  EmailDto,
  MailboxDto,
  EmailListQueryDto,
  EmailListResponseDto,
  ImapTestResponseDto,
} from "./dto";
import { ResponseDto } from "../../common/dtos/response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import { SendEmailDto } from "./dto/send-email.dto";
import { ReplyEmailDto } from "./dto/reply-emai.dto";
import { ModifyEmailFlagsDto } from "./dto/modify.dto";
import { SendEmailResponse } from "./dto/send-email-response";

@ApiTags("Email")
@Controller()
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ==================== MAILBOX ENDPOINTS ====================

  @Get("mailboxes")
  @ApiOperation({ summary: "Get all mailboxes" })
  @ApiResponse({
    status: 200,
    description: "Mailboxes retrieved successfully",
    type: [MailboxDto],
  })
  async getAllMailboxes(): Promise<ResponseDto<MailboxDto[]>> {
    const mailboxes = this.emailService.findAllMailboxes();
    return ResponseDto.success(mailboxes, "Mailboxes retrieved successfully");
  }

  @Get("mailboxes/:id")
  @ApiOperation({ summary: "Get mailbox by ID" })
  @ApiParam({ name: "id", description: "Mailbox ID" })
  @ApiResponse({
    status: 200,
    description: "Mailbox retrieved successfully",
    type: MailboxDto,
  })
  @ApiResponse({ status: 404, description: "Mailbox not found" })
  async getMailboxById(
    @Param("id") id: string,
  ): Promise<ResponseDto<MailboxDto>> {
    const mailbox = this.emailService.findMailboxById(id);
    return ResponseDto.success(mailbox, "Mailbox retrieved successfully");
  }

  @Get("mailboxes/:id/emails")
  @ApiOperation({ summary: "Get emails in a mailbox with pagination" })
  @ApiParam({ name: "id", description: "Mailbox ID" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  @ApiQuery({ name: "starredOnly", required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "Emails retrieved successfully",
    type: EmailListResponseDto,
  })
  @ApiResponse({ status: 404, description: "Mailbox not found" })
  async getEmailsByMailbox(
    @Param("id") id: string,
    @Query() query: EmailListQueryDto,
    @CurrentUser() user?: JwtPayload,
  ): Promise<ResponseDto<EmailListResponseDto>> {
    const userId = user?.sub;
    const result = await this.emailService.findEmailsByMailbox(
      id,
      query,
      userId,
    );
    return ResponseDto.success(result, "Emails retrieved successfully");
  }

  // ==================== EMAIL ENDPOINTS ====================

  @Get("emails/:id")
  @ApiOperation({ summary: "Get email by ID" })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiResponse({
    status: 200,
    description: "Email retrieved successfully",
    type: EmailDto,
  })
  @ApiResponse({ status: 404, description: "Email not found" })
  async getEmailById(@Param("id") id: string): Promise<ResponseDto<EmailDto>> {
    const email = this.emailService.findEmailById(id);
    return ResponseDto.success(email, "Email retrieved successfully");
  }

  @Patch("emails/:id/read")
  @ApiOperation({ summary: "Mark email as read" })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiResponse({
    status: 200,
    description: "Email marked as read",
    type: EmailDto,
  })
  @ApiResponse({ status: 404, description: "Email not found" })
  async markAsRead(@Param("id") id: string): Promise<ResponseDto<EmailDto>> {
    const email = this.emailService.markAsRead(id);
    return ResponseDto.success(email, "Email marked as read");
  }

  @Patch("emails/:id/unread")
  @ApiOperation({ summary: "Mark email as unread" })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiResponse({
    status: 200,
    description: "Email marked as unread",
    type: EmailDto,
  })
  @ApiResponse({ status: 404, description: "Email not found" })
  async markAsUnread(@Param("id") id: string): Promise<ResponseDto<EmailDto>> {
    const email = this.emailService.markAsUnread(id);
    return ResponseDto.success(email, "Email marked as unread");
  }

  @Patch("emails/:id/star")
  @ApiOperation({ summary: "Toggle star status" })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiResponse({
    status: 200,
    description: "Email star status toggled",
    type: EmailDto,
  })
  @ApiResponse({ status: 404, description: "Email not found" })
  async toggleStar(@Param("id") id: string): Promise<ResponseDto<EmailDto>> {
    const email = this.emailService.toggleStar(id);
    return ResponseDto.success(email, "Email star status toggled");
  }

  @Delete("emails/:id")
  @ApiOperation({
    summary: "Delete email (move to trash or permanently delete)",
  })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiResponse({ status: 200, description: "Email deleted successfully" })
  @ApiResponse({ status: 404, description: "Email not found" })
  async deleteEmail(@Param("id") id: string): Promise<ResponseDto<null>> {
    this.emailService.deleteEmail(id);
    return ResponseDto.success(null, "Email deleted successfully");
  }

  @Get("emails/search")
  @ApiOperation({ summary: "Search emails" })
  @ApiQuery({ name: "q", description: "Search query" })
  @ApiResponse({
    status: 200,
    description: "Search results retrieved",
    type: [EmailDto],
  })
  async searchEmails(
    @Query("q") query: string,
  ): Promise<ResponseDto<EmailDto[]>> {
    const emails = this.emailService.searchEmails(query);
    return ResponseDto.success(
      emails,
      `Found ${emails.length} matching emails`,
    );
  }
  @Post("emails/send")
  @ApiOperation({ summary: "Send an email" })
  @ApiResponse({
    status: 200,
    description: "Email sent successfully",
    type: SendEmailResponse,
  })
  async send(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendEmailDto,
  ): Promise<ResponseDto<SendEmailResponse>> {
    const result = await this.emailService.sendEmail(user.sub, user.email, dto);
    return ResponseDto.success(result, "Email sent successfully");
  }
  @Post("emails/:id/reply")
  async reply(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: number,
    @Body() dto: ReplyEmailDto,
  ): Promise<ResponseDto<SendEmailResponse>> {
    const original = await this.emailService.getEmailDetail(
      user.sub,
      user.email,
      id,
    );
    if (!original) {
      throw new NotFoundException("Original email not found");
    }
    const result = await this.emailService.replyEmail(
      user.sub,
      user.email,
      original,
      dto,
    );
    return ResponseDto.success(result, "Email replied successfully");
  }

  @Post("emails/:id/modify")
  async modifyEmail(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: number,
    @Body() dto: ModifyEmailFlagsDto,
  ) {
    const original = await this.emailService.getEmailDetail(
      user.sub,
      user.email,
      id,
    );
    if (!original) {
      throw new NotFoundException("Original email not found");
    }
    return this.emailService.modifyEmail(user.sub, user.email, id, dto);
  }
  @Get("email-all")
  async getAllEmails(@CurrentUser() user: JwtPayload) {
    return this.emailService.getAllEmails(user.sub, user.email);
  }

  // ==================== IMAP TEST ENDPOINT ====================

  @Get("imap/test")
  @ApiOperation({ summary: "Test IMAP connection" })
  @ApiResponse({
    status: 200,
    description: "IMAP connection test result",
    type: ImapTestResponseDto,
  })
  async testImapConnection(
    @CurrentUser() user?: JwtPayload,
  ): Promise<ResponseDto<ImapTestResponseDto>> {
    if (!user?.sub) {
      const errorResult: ImapTestResponseDto = {
        success: false,
        message: "User not authenticated",
        testedAt: new Date().toISOString(),
      };
      return ResponseDto.success(errorResult, errorResult.message);
    }

    const result = await this.emailService.testImapConnection(user.sub);
    return ResponseDto.success(result, result.message);
  }
}
