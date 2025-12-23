import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { KanbanColumnService } from "../services/kanban-column.service";
import {
  KanbanColumnDto,
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
  ReorderColumnsDto,
} from "../dto/kanban-column.dto";
import { ResponseDto } from "../../../common/dtos/response.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "../../../common/decorators/current-user.decorator";

@ApiTags("Kanban Columns")
@Controller("kanban/columns")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
export class KanbanColumnController {
  constructor(private readonly columnService: KanbanColumnService) {}

  @Get()
  @ApiOperation({
    summary: "Get all Kanban columns for current user",
    description: "Returns all columns sorted by order (ascending)",
  })
  async getColumns(
    @CurrentUser() user: JwtPayload,
  ): Promise<ResponseDto<KanbanColumnDto[]>> {
    const columns = await this.columnService.getColumns(user.sub);
    return ResponseDto.success(columns, "Columns retrieved successfully");
  }

  @Post()
  @ApiOperation({
    summary: "Create a new Kanban column",
    description:
      "Creates a custom column. Max 10 columns per user. " +
      "Custom columns do not have a 'key' (key will be null).",
  })
  async createColumn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateKanbanColumnDto,
  ): Promise<ResponseDto<KanbanColumnDto>> {
    const column = await this.columnService.createColumn(user.sub, dto);
    return ResponseDto.success(column, "Column created successfully");
  }

  @Put(":id")
  @ApiOperation({
    summary: "Update a Kanban column",
    description:
      "Updates column name, color, icon, or Gmail label mapping. " +
      "Cannot change 'key' field.",
  })
  async updateColumn(
    @CurrentUser() user: JwtPayload,
    @Param("id") columnId: string,
    @Body() dto: UpdateKanbanColumnDto,
  ): Promise<ResponseDto<KanbanColumnDto>> {
    const column = await this.columnService.updateColumn(
      user.sub,
      columnId,
      dto,
    );
    return ResponseDto.success(column, "Column updated successfully");
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a Kanban column",
    description:
      "Deletes a column and moves all emails in it to INBOX. " +
      "Cannot delete INBOX (system protected).",
  })
  async deleteColumn(
    @CurrentUser() user: JwtPayload,
    @Param("id") columnId: string,
  ): Promise<ResponseDto<null>> {
    await this.columnService.deleteColumn(user.sub, columnId);
    return ResponseDto.success(null, "Column deleted successfully");
  }

  @Patch("reorder")
  @ApiOperation({
    summary: "Reorder Kanban columns",
    description:
      "Changes the display order of columns. " +
      "Provide array of column IDs in desired order.",
  })
  async reorderColumns(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReorderColumnsDto,
  ): Promise<ResponseDto<KanbanColumnDto[]>> {
    const columns = await this.columnService.reorderColumns(
      user.sub,
      dto.columnIds,
    );
    return ResponseDto.success(columns, "Columns reordered successfully");
  }
}
