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
  Res,
  NotFoundException,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
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
import { ModifyEmailDto } from "./dto/modify.dto";
import { SendEmailResponse } from "./dto/send-email-response";

@ApiTags("Email")
@Controller()
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ==================== MAILBOX ENDPOINTS ====================

  @Get("mailboxes")
  @ApiOperation({ summary: "Get all mailboxes with email counts (optimized with caching)" })
  @ApiResponse({
    status: 200,
    description: "Mailboxes retrieved successfully",
    type: [MailboxDto],
  })
  async getAllMailboxes(
    @CurrentUser() user?: JwtPayload,
  ): Promise<ResponseDto<MailboxDto[]>> {
    // Use optimized cached fast counts (30s cache, no email fetching)
    // If fast method fails or returns zeros, fallback to old method
    try {
      const mailboxes = await this.emailService.getCachedFastMailboxCounts(
        user?.sub,
      );

      // Check if we got any counts - if all are zero and user is authenticated, something went wrong
      const hasAnyCounts = mailboxes.some(m => m.totalCount > 0 || m.unreadCount > 0);

      if (!hasAnyCounts && user?.sub) {
        // Fallback to old method that fetches emails
        console.warn('Fast count method returned all zeros, falling back to old method');
        const fallbackMailboxes = await this.emailService.getHardcodedMailboxesWithCounts(user.sub);
        return ResponseDto.success(fallbackMailboxes, "Mailboxes retrieved successfully (fallback)");
      }

      return ResponseDto.success(mailboxes, "Mailboxes retrieved successfully");
    } catch (error) {
      // If fast method completely fails, try old method
      console.error('Fast count method failed:', error);
      if (user?.sub) {
        const fallbackMailboxes = await this.emailService.getHardcodedMailboxesWithCounts(user.sub);
        return ResponseDto.success(fallbackMailboxes, "Mailboxes retrieved successfully (fallback)");
      }
      throw error;
    }
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

  @Get("emails")
  @ApiOperation({ summary: "Get emails with pagination (from default INBOX)" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20)",
  })
  @ApiQuery({
    name: "mailbox",
    required: false,
    type: String,
    description: "Mailbox name (default: INBOX)",
  })
  @ApiResponse({
    status: 200,
    description: "Emails retrieved successfully",
    type: EmailListResponseDto,
  })
  async getEmails(
    @Query() query: EmailListQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailListResponseDto>> {
    // Default to inbox if no mailbox specified
    const mailbox = query.mailbox || "inbox";
    console.log("userid:", user.sub);
    const result = await this.emailService.findEmailsByMailbox(
      mailbox,
      query,
      user.sub,
    );
    return ResponseDto.success(result, "Emails retrieved successfully");
  }

  @Get("emails/:id")
  @ApiOperation({ summary: "Get email by ID" })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiQuery({
    name: "mailbox",
    required: false,
    type: String,
    description:
      "Mailbox ID (inbox, sent, trash, etc.). If not provided, searches all folders.",
  })
  @ApiResponse({
    status: 200,
    description: "Email retrieved successfully",
    type: EmailDto,
  })
  @ApiResponse({ status: 404, description: "Email not found" })
  async getEmailById(
    @Param("id") id: string,
    @Query("mailbox") mailbox: string | undefined,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.findEmailById(id, user.sub, mailbox);
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
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.markAsRead(user.sub, id);
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
  async markAsUnread(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.markAsUnread(user.sub, id);
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
  async toggleStar(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.toggleStar(user.sub, id);
    return ResponseDto.success(email, "Email star status toggled");
  }

  @Delete("emails/:id")
  @ApiOperation({
    summary: "Delete email (move to trash or permanently delete)",
  })
  @ApiParam({ name: "id", description: "Email ID" })
  @ApiResponse({ status: 200, description: "Email deleted successfully" })
  @ApiResponse({ status: 404, description: "Email not found" })
  async deleteEmail(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<null>> {
    this.emailService.deleteEmail(user.sub, id);
    return ResponseDto.success(null, "Email deleted successfully");
  }

  @Get("emails/:id/thread")
  @ApiOperation({ summary: "Get all emails in a thread" })
  @ApiParam({ name: "id", description: "Thread ID (or Email ID)" })
  @ApiQuery({ name: "mailbox", required: false })
  @ApiResponse({
    status: 200,
    description: "Thread emails retrieved successfully",
    type: [EmailDto],
  })
  async getThreadEmails(
    @Param("id") id: string,
    @Query("mailbox") mailbox: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto[]>> {
    const emails = await this.emailService.getThreadEmails(
      user.sub,
      user.email,
      id,
      mailbox,
    );
    return ResponseDto.success(emails, "Thread emails retrieved successfully");
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
      dto.mailBox,
    );
    if (!original) {
      throw new NotFoundException("Original email not found");
    }
    console.log("Original email:", original);
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
    @Body() dto: ModifyEmailDto,
  ) {
    const original = await this.emailService.getEmailDetail(
      user.sub,
      user.email,
      id,
      dto.mailBox,
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

  @Get("imap/mailboxes")
  @ApiOperation({ summary: "List all available IMAP mailboxes/folders" })
  @ApiResponse({
    status: 200,
    description: "List of all available mailboxes",
  })
  async listMailboxes(
    @CurrentUser() user?: JwtPayload,
  ): Promise<ResponseDto<any>> {
    if (!user?.sub) {
      return ResponseDto.success(
        { success: false, message: "User not authenticated" },
        "User not authenticated",
      );
    }

    const result = await this.emailService.listAvailableMailboxes(user.sub);
    return ResponseDto.success(result, result.message);
  }

  // ==================== ATTACHMENT ENDPOINTS ====================

  @Get("attachments/:attachmentId")
  @ApiOperation({ summary: "Stream email attachment" })
  @ApiParam({
    name: "attachmentId",
    description: "Attachment ID (format: emailId-index)",
  })
  @ApiResponse({
    status: 200,
    description: "Attachment streamed successfully",
  })
  @ApiResponse({ status: 404, description: "Attachment not found" })
  async streamAttachment(
    @Param("attachmentId") attachmentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { stream, metadata } = await this.emailService.streamAttachment(
      user.sub,
      attachmentId,
    );

    // Properly encode filename for Content-Disposition header
    const filename = metadata.filename || "attachment";
    const encodedFilename = encodeURIComponent(filename);

    reply
      .header("Content-Type", metadata.mimeType || "application/octet-stream")
      .header(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      )
      .header("Content-Length", metadata.size || 0)
      .header("Cache-Control", "no-cache")
      .send(stream);
  }
}
