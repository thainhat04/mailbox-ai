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
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { EmailService } from "./email.service";
import {
  EmailDto,
  EmailListQueryDto,
  EmailListResponseDto,
  LabelDto,
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

  @Get("labels")
  async getAllLabels(
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<LabelDto[]>> {
    const labels = await this.emailService.getLabels(user.sub);
    return ResponseDto.success(labels, "Labels retrieved successfully");
  }

  @Get("labels/:labelId")
  async getLabelById(
    @Param("labelId") labelId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<LabelDto>> {
    const label = await this.emailService.getLabelById(labelId, user.sub);
    return ResponseDto.success(label, "Label retrieved successfully");
  }

  @Get("labels/:labelId/emails")
  async getEmailsByLabel(
    @Param("labelId") labelId: string,
    @Query() query: EmailListQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailListResponseDto>> {
    const result = await this.emailService.findEmailsByLabel(
      labelId,
      query,
      user.sub,
    );
    return ResponseDto.success(result, "Emails retrieved successfully");
  }

  @Get("emails")
  @ApiOperation({ summary: "Get emails with pagination (from default INBOX)" })
  async getEmails(
    @Query() query: EmailListQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailListResponseDto>> {
    const labelIds = query.labelIds || "INBOX";
    const result = await this.emailService.findEmailsByLabel(
      labelIds,
      query,
      user.sub,
    );
    return ResponseDto.success(result, "Emails retrieved successfully");
  }

  @Get("emails/search")
  @ApiOperation({ summary: "Search emails" })
  async searchEmails(
    @Query("q") query: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto[]>> {
    const emails = await this.emailService.searchEmails(query, user.sub);
    return ResponseDto.success(
      emails,
      `Found ${emails.length} matching emails`,
    );
  }

  @Get("emails/:id")
  @ApiOperation({ summary: "Get email by ID" })
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
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.markAsRead(id, user.sub);
    return ResponseDto.success(email, "Email marked as read");
  }

  @Patch("emails/:id/star")
  @ApiOperation({ summary: "Toggle star status" })
  async toggleStar(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.toggleStar(id, user.sub);
    return ResponseDto.success(email, "Email star status toggled");
  }

  @Delete("emails/:id")
  @ApiOperation({
    summary: "Delete email (move to trash or permanently delete)",
  })
  async deleteEmail(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<null>> {
    await this.emailService.deleteEmail(id, user.sub);
    return ResponseDto.success(null, "Email deleted successfully");
  }

  @Post("emails/send")
  @ApiOperation({ summary: "Send an email" })
  async send(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendEmailDto,
  ): Promise<ResponseDto<SendEmailResponse>> {
    const result = await this.emailService.sendEmail(user.sub, dto);
    return ResponseDto.success(result, "Email sent successfully");
  }

  @Post("emails/:id/reply")
  async reply(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ReplyEmailDto,
  ): Promise<ResponseDto<SendEmailResponse>> {
    const result = await this.emailService.replyEmail(user.sub, id, dto);
    return ResponseDto.success(result, "Reply sent successfully");
  }

  @Get("attachments/:attachmentId")
  @ApiOperation({ summary: "Stream email attachment" })
  async streamAttachment(
    @Param("attachmentId") attachmentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { data, metadata } = await this.emailService.streamAttachment(
      user.sub,
      attachmentId,
    );

    // Set headers for file download with proper filename and content type
    reply.header("Content-Type", metadata.mimeType || "application/octet-stream");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${metadata.filename || attachmentId}"`,
    );
    reply.header("Content-Length", metadata.size?.toString() || data.length.toString());

    reply.send(data);
  }
}
