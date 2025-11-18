import { Controller, Get, Param, Query, Patch, Delete } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { EmailService } from "./email.service";
import {
  EmailDto,
  MailboxDto,
  EmailListQueryDto,
  EmailListResponseDto,
} from "./dto";
import { ResponseDto } from "../../common/dtos/response.dto";

@ApiTags("Email")
@Controller("api")
@ApiBearerAuth("JWT-auth")
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
  ): Promise<ResponseDto<EmailListResponseDto>> {
    const result = this.emailService.findEmailsByMailbox(id, query);
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
}
