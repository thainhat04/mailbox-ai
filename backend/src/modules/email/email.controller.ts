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
  Put,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { EmailService } from "./email.service";
import { KanbanService } from "./services/kanban.service";
import { SummaryService } from "./services/summary.service";
import {
  EmailDto,
  EmailListQueryDto,
  EmailListResponseDto,
  LabelDto,
  FuzzySearchQueryDto,
  FuzzySearchResponseDto,
  SuggestionQueryDto,
  SuggestionResponseDto,
  SuggestionItemDto,
  SuggestionType,
  SemanticSearchQueryDto,
  SemanticSearchResponseDto,
} from "./dto";
import { ResponseDto } from "../../common/dtos/response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../common/decorators/current-user.decorator";
import { SendEmailDto } from "./dto/send-email.dto";
import { ReplyEmailDto } from "./dto/reply-emai.dto";
import { ModifyEmailDto } from "./dto/modify.dto";
import { SendEmailResponse } from "./dto/send-email-response";
import {
  UpdateKanbanStatusDto,
  UpdateKanbanColDto,
  SnoozeEmailDto,
} from "./dto/kanban.dto";

@ApiTags("Email")
@Controller()
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly kanbanService: KanbanService,
    private readonly summaryService: SummaryService,
  ) { }

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

  @Get("emails/fuzzy-search")
  @ApiOperation({
    summary: "Fuzzy search emails with typo tolerance and partial matching",
    description:
      "Search emails using PostgreSQL pg_trgm extension. Supports typos, partial matches, and Vietnamese characters. " +
      "Results are ranked by match quality (best matches first).",
  })
  async fuzzySearchEmails(
    @Query() query: FuzzySearchQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<FuzzySearchResponseDto>> {
    const result = await this.emailService.fuzzySearchEmails(
      query.q,
      user.sub,
      {
        page: query.page,
        limit: query.limit,
      },
    );
    return ResponseDto.success(
      result,
      `Found ${result.total} matching emails with fuzzy search`,
    );
  }

  @Post("emails/semantic-search")
  @ApiOperation({ summary: "Semantic search emails" })
  async semanticSearchEmails(
    @Body() dto: SemanticSearchQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<SemanticSearchResponseDto>> {
    const result = await this.emailService.semanticSearchEmails(dto.query, user.sub, {
      page: dto.page,
      limit: dto.limit,
    });
    return ResponseDto.success(
      result,
      `Found ${result.total} matching emails with semantic search`,
    );
  }

  @Get("emails/suggestions")
  @ApiOperation({
    summary: "Get search suggestions for auto-complete",
    description:
      "Returns sender names and subject keywords based on query. " +
      "Used for type-ahead search functionality.",
  })
  async getSearchSuggestions(
    @Query() query: SuggestionQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<SuggestionResponseDto>> {
    const result = await this.emailService.getSuggestions(
      query.q,
      user.sub,
      query.limit,
    );

    // Transform to SuggestionItemDto format
    const suggestions: SuggestionItemDto[] = [
      ...result.senders.map((sender) => ({
        type: SuggestionType.SENDER,
        value: sender.email,
        label: sender.name || sender.email,
      })),
      ...result.keywords.map((keyword) => ({
        type: SuggestionType.SUBJECT_KEYWORD,
        value: keyword.keyword,
        label: keyword.keyword,
      })),
    ];

    const response: SuggestionResponseDto = {
      suggestions,
      query: query.q,
    };

    return ResponseDto.success(
      response,
      `Found ${suggestions.length} suggestions`,
    );
  }

  @Get("emails/:id")
  @ApiOperation({ summary: "Get email by ID" })
  async getEmailById(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto>> {
    const email = await this.emailService.findEmailById(id, user.sub);
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

  @Put("emails/:id/modify")
  @ApiOperation({ summary: "Modify email flags (read, starred, delete)" })
  async modifyEmail(
    @Param("id") id: string,
    @Body() dto: ModifyEmailDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<EmailDto | null>> {
    let email: EmailDto | undefined;

    // Handle read flag
    if (dto.flags.read !== undefined) {
      if (dto.flags.read) {
        email = await this.emailService.markAsRead(id, user.sub);
      } else {
        email = await this.emailService.markAsUnread(id, user.sub);
      }
    }

    // Handle starred flag
    if (dto.flags.starred !== undefined) {
      // Get current email to check star status
      const currentEmail =
        email || (await this.emailService.findEmailById(id, user.sub));
      const isCurrentlyStarred = currentEmail.isStarred;

      // Only toggle if the desired state is different from current state
      if (dto.flags.starred !== isCurrentlyStarred) {
        email = await this.emailService.toggleStar(id, user.sub);
      } else {
        email = currentEmail;
      }
    }

    // Handle delete flag
    if (dto.flags.delete) {
      await this.emailService.deleteEmail(id, user.sub);
      return ResponseDto.success(null, "Email deleted successfully");
    }

    // If no email was modified or we need to fetch it
    const finalEmail =
      email || (await this.emailService.findEmailById(id, user.sub));

    return ResponseDto.success(finalEmail, "Email modified successfully");
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
    reply.header(
      "Content-Type",
      metadata.mimeType || "application/octet-stream",
    );
    reply.header(
      "Content-Disposition",
      `attachment; filename="${metadata.filename || attachmentId}"`,
    );
    reply.header(
      "Content-Length",
      metadata.size?.toString() || data.length.toString(),
    );

    reply.send(data);
  }

  // ============ KANBAN ENDPOINTS ============

  @Get("kanban/board")
  @ApiOperation({ summary: "Get Kanban board view (all columns)" })
  @ApiQuery({ name: "includeDoneAll", required: false, type: Boolean })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  @ApiQuery({ name: "hasAttachmentsOnly", required: false, type: Boolean })
  @ApiQuery({ name: "fromEmail", required: false, type: String })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["date_desc", "date_asc", "sender"],
  })
  async getKanbanBoard(
    @CurrentUser() user: JwtPayload,
    @Query("includeDoneAll") includeDoneAll?: boolean,
    @Query("unreadOnly") unreadOnly?: boolean,
    @Query("hasAttachmentsOnly") hasAttachmentsOnly?: boolean,
    @Query("fromEmail") fromEmail?: string,
    @Query("sortBy") sortBy?: "date_desc" | "date_asc" | "sender",
  ) {
    const filters = {
      unreadOnly: unreadOnly === true || unreadOnly === ("true" as any),
      hasAttachmentsOnly:
        hasAttachmentsOnly === true || hasAttachmentsOnly === ("true" as any),
      fromEmail,
    };

    const result = await this.kanbanService.getKanbanBoard(
      user.sub,
      includeDoneAll,
      filters,
      sortBy,
    );
    return ResponseDto.success(result, "Kanban board retrieved successfully");
  }

  @Patch(":id/kanban/column")
  @ApiOperation({ summary: "Update email kanban column (drag-and-drop)" })
  @ApiBody({ type: UpdateKanbanColDto })
  async updateKanbanColumn(
    @CurrentUser() user: JwtPayload,
    @Param("id") emailId: string,
    @Body() updateDto: UpdateKanbanColDto,
  ) {
    const result = await this.kanbanService.updateKanbanColumn(
      user.sub,
      emailId,
      updateDto.columnId,
    );
    return ResponseDto.success(result, "Kanban column updated successfully");
  }

  @Patch(":id/kanban/status")
  @ApiOperation({
    summary:
      "Update email kanban status (DEPRECATED: use /kanban/column instead)",
    deprecated: true,
  })
  @ApiBody({ type: UpdateKanbanStatusDto })
  async updateKanbanStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") emailId: string,
    @Body() updateDto: UpdateKanbanStatusDto,
  ) {
    const result = await this.kanbanService.updateKanbanStatus(
      user.sub,
      emailId,
      updateDto.status,
    );
    return ResponseDto.success(result, "Kanban status updated successfully");
  }

  // ============ SNOOZE ENDPOINTS ============

  @Post(":id/freeze")
  @ApiOperation({ summary: "Freeze email" })
  @ApiBody({ type: SnoozeEmailDto })
  async freezeEmail(
    @CurrentUser() user: JwtPayload,
    @Param("id") emailId: string,
    @Body() snoozeDto: SnoozeEmailDto,
  ) {
    const result = await this.kanbanService.snoozeEmail(
      user.sub,
      emailId,
      snoozeDto,
    );
    return ResponseDto.success(result, "Email frozen successfully");
  }

  @Post(":id/unfreeze")
  @ApiOperation({ summary: "Unfreeze email manually" })
  async unfreezeEmail(
    @CurrentUser() user: JwtPayload,
    @Param("id") emailId: string,
  ) {
    const result = await this.kanbanService.unsnoozeEmail(user.sub, emailId);
    return ResponseDto.success(result, "Email unfrozen successfully");
  }

  @Get("frozen")
  @ApiOperation({ summary: "Get all frozen emails" })
  async getFrozenEmails(@CurrentUser() user: JwtPayload) {
    const result = await this.kanbanService.getFrozenEmails(user.sub);
    return ResponseDto.success(result, "Frozen emails retrieved successfully");
  }

  // ============ SUMMARY ENDPOINTS ============

  @Get(":id/summary")
  @ApiOperation({ summary: "Get email summary (cached or generate)" })
  async getEmailSummary(
    @CurrentUser() user: JwtPayload,
    @Param("id") emailId: string,
    @Query("forceRegenerate") forceRegenerate?: boolean,
  ) {
    const result = await this.summaryService.getEmailSummary(
      user.sub,
      emailId,
      forceRegenerate,
    );
    return ResponseDto.success(result, "Email summary retrieved successfully");
  }
}
