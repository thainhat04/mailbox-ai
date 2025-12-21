import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import {
  KanbanColumnDto,
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
} from "../dto/kanban-column.dto";
import { MailProviderRegistry } from "../providers/provider.registry";

@Injectable()
export class KanbanColumnService {
  private readonly logger = new Logger(KanbanColumnService.name);
  private readonly MAX_COLUMNS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: MailProviderRegistry,
  ) {}

  /**
   * Get all columns for a user (sorted by order)
   */
  async getColumns(userId: string): Promise<KanbanColumnDto[]> {
    const columns = await this.prisma.kanbanColumn.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    return columns.map(this.mapToDto);
  }

  /**
   * Create a new column
   */
  async createColumn(
    userId: string,
    dto: CreateKanbanColumnDto,
  ): Promise<KanbanColumnDto> {
    // 1. Validate column limit
    const count = await this.prisma.kanbanColumn.count({
      where: { userId },
    });

    if (count >= this.MAX_COLUMNS) {
      throw new BadRequestException(
        `Maximum ${this.MAX_COLUMNS} columns allowed per user`,
      );
    }

    // 2. Get max order
    const maxOrderColumn = await this.prisma.kanbanColumn.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
    });

    const nextOrder = maxOrderColumn ? maxOrderColumn.order + 1 : 0;

    // 3. Try to create Gmail label if user has connected email account
    let gmailLabelId: string | null = null;
    let gmailLabelName: string | null = null;

    try {
      // Get user's primary email account (Google) via Account relation
      const emailAccount = await this.prisma.emailAccount.findFirst({
        where: {
          userId,
          account: {
            provider: "google",
          },
        },
        include: {
          account: true,
        },
      });

      if (emailAccount) {
        // Get mail provider
        const provider = await this.providerRegistry.getProvider(
          emailAccount.id,
        );

        // Check if label already exists with the same name
        const existingLabels = await provider.listLabels();
        const existingLabel = existingLabels.find(
          (label) => label.name.toLowerCase() === dto.name.toLowerCase(),
        );

        if (existingLabel) {
          // Use existing label
          gmailLabelId = existingLabel.id;
          gmailLabelName = existingLabel.name;
          this.logger.log(
            `Using existing Gmail label "${gmailLabelName}" for new column`,
          );
        } else {
          // Create new Gmail label with color
          const newLabel = await provider.createLabel(
            dto.gmailLabelName || dto.name,
            dto.color,
          );
          gmailLabelId = newLabel.id;
          gmailLabelName = newLabel.name;

          // Store label in database
          await this.prisma.label.upsert({
            where: {
              emailAccountId_labelId: {
                emailAccountId: emailAccount.id,
                labelId: newLabel.id,
              },
            },
            create: {
              emailAccountId: emailAccount.id,
              labelId: newLabel.id,
              name: newLabel.name,
              type: "user",
              messageListVisibility: newLabel.messageListVisibility,
              labelListVisibility: newLabel.labelListVisibility,
            },
            update: {
              name: newLabel.name,
            },
          });

          this.logger.log(
            `Created Gmail label "${gmailLabelName}" (${gmailLabelId}) for new column`,
          );
        }
      }
    } catch (error) {
      // Log error but don't fail column creation
      // Label can be created later via initializeLabelsForUser
      this.logger.warn(
        `Could not create Gmail label for column "${dto.name}": ${error.message}`,
      );
    }

    // 4. Generate KEY from name (uppercase, no spaces/special chars)
    const generatedKey = this.generateKeyFromName(dto.name);

    // 5. Check if KEY already exists for this user
    const existingColumn = await this.prisma.kanbanColumn.findFirst({
      where: { userId, key: generatedKey },
    });

    if (existingColumn) {
      throw new BadRequestException(
        `A column with similar name already exists: "${existingColumn.name}"`,
      );
    }

    // 6. Create column with auto-generated KEY
    const column = await this.prisma.kanbanColumn.create({
      data: {
        userId,
        name: dto.name,
        key: generatedKey,
        color: dto.color,
        icon: dto.icon,
        order: nextOrder,
        gmailLabelId,
        gmailLabelName,
        isSystemProtected: false,
      },
    });

    this.logger.log(
      `Created column "${column.name}" with key "${generatedKey}" for user ${userId}`,
    );
    return this.mapToDto(column);
  }

  /**
   * Update a column
   */
  async updateColumn(
    userId: string,
    columnId: string,
    dto: UpdateKanbanColumnDto,
  ): Promise<KanbanColumnDto> {
    // 1. Check column exists and belongs to user
    const column = await this.prisma.kanbanColumn.findUnique({
      where: { id: columnId },
    });

    if (!column || column.userId !== userId) {
      throw new NotFoundException("Column not found");
    }

    // 2. Try to update Gmail label if column has one
    if (column.gmailLabelId) {
      try {
        // Get user's email account
        const emailAccount = await this.prisma.emailAccount.findFirst({
          where: {
            userId,
            account: {
              provider: "google",
            },
          },
          include: {
            account: true,
          },
        });

        if (emailAccount) {
          // Get mail provider
          const provider = await this.providerRegistry.getProvider(
            emailAccount.id,
          );

          // Update Gmail label (name and/or color)
          const updatedLabel = await provider.updateLabel(
            column.gmailLabelId,
            dto.gmailLabelName ?? column.gmailLabelName ?? column.name,
            dto.color ?? column.color ?? undefined,
          );

          this.logger.log(
            `Updated Gmail label "${updatedLabel.name}" (${column.gmailLabelId})`,
          );

          // Update label in database
          await this.prisma.label.updateMany({
            where: {
              emailAccountId: emailAccount.id,
              labelId: column.gmailLabelId,
            },
            data: {
              name: updatedLabel.name,
            },
          });
        }
      } catch (error) {
        // Log error but don't fail column update
        this.logger.warn(
          `Could not update Gmail label for column "${column.name}": ${error.message}`,
        );
      }
    }

    // 3. Update KEY if name changed
    const updateData: any = {
      color: dto.color,
      icon: dto.icon,
      gmailLabelName: dto.gmailLabelName,
    };

    // If name is being updated, regenerate KEY
    if (dto.name && dto.name !== column.name) {
      const newKey = this.generateKeyFromName(dto.name);

      // Check if new KEY conflicts with existing column
      const existingColumn = await this.prisma.kanbanColumn.findFirst({
        where: {
          userId,
          key: newKey,
          id: { not: columnId }, // Exclude current column
        },
      });

      if (existingColumn) {
        throw new BadRequestException(
          `Cannot rename: A column with similar name already exists: "${existingColumn.name}"`,
        );
      }

      updateData.name = dto.name;
      updateData.key = newKey;

      this.logger.log(
        `Updating column "${column.name}" → "${dto.name}" (KEY: ${column.key} → ${newKey})`,
      );
    }

    // 4. Update column in database
    const updated = await this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: updateData,
    });

    this.logger.log(`Updated column "${updated.name}" (${columnId})`);
    return this.mapToDto(updated);
  }

  /**
   * Delete a column (move emails to INBOX)
   */
  async deleteColumn(userId: string, columnId: string): Promise<void> {
    // 1. Check column exists and belongs to user (outside transaction)
    const column = await this.prisma.kanbanColumn.findUnique({
      where: { id: columnId },
    });

    if (!column || column.userId !== userId) {
      throw new NotFoundException("Column not found");
    }

    // 2. Cannot delete system protected columns (INBOX, FROZEN)
    if (column.isSystemProtected) {
      throw new ForbiddenException(
        `Cannot delete system protected column: ${column.name}`,
      );
    }

    // 3. Try to delete Gmail label first (before transaction)
    if (column.gmailLabelId) {
      try {
        // Get user's email account
        const emailAccount = await this.prisma.emailAccount.findFirst({
          where: {
            userId,
            account: {
              provider: "google",
            },
          },
          include: {
            account: true,
          },
        });

        if (emailAccount) {
          // Get mail provider
          const provider = await this.providerRegistry.getProvider(
            emailAccount.id,
          );

          // Delete Gmail label
          await provider.deleteLabel(column.gmailLabelId);

          this.logger.log(
            `Deleted Gmail label "${column.gmailLabelName}" (${column.gmailLabelId})`,
          );

          // Delete label from database
          await this.prisma.label.deleteMany({
            where: {
              emailAccountId: emailAccount.id,
              labelId: column.gmailLabelId,
            },
          });
        }
      } catch (error) {
        // Log error but continue with column deletion
        this.logger.warn(
          `Could not delete Gmail label for column "${column.name}": ${error.message}`,
        );
      }
    }

    // 4. Delete column and move emails in transaction
    await this.prisma.$transaction(async (tx) => {
      // Find INBOX column
      const inboxColumn = await tx.kanbanColumn.findFirst({
        where: { userId, isSystemProtected: true },
      });

      if (!inboxColumn) {
        throw new BadRequestException("Inbox column not found for this user");
      }

      // Move all emails from this column to INBOX
      const movedCount = await tx.emailMessage.updateMany({
        where: { kanbanColumnId: columnId },
        data: {
          kanbanColumnId: inboxColumn.id,
          kanbanStatus: "INBOX", // Backward compatible
          statusChangedAt: new Date(),
        },
      });

      this.logger.log(
        `Moved ${movedCount.count} emails from column "${column.name}" to INBOX`,
      );

      // Delete the column
      await tx.kanbanColumn.delete({
        where: { id: columnId },
      });

      this.logger.log(`Deleted column "${column.name}" (${columnId})`);
    });
  }

  /**
   * Reorder columns
   */
  async reorderColumns(
    userId: string,
    columnIds: string[],
  ): Promise<KanbanColumnDto[]> {
    // 1. Validate all columns belong to user
    const columns = await this.prisma.kanbanColumn.findMany({
      where: { userId, id: { in: columnIds } },
    });

    if (columns.length !== columnIds.length) {
      throw new BadRequestException(
        "Invalid column IDs or columns do not belong to user",
      );
    }

    // 2. Update order in transaction
    await this.prisma.$transaction(
      columnIds.map((id, index) =>
        this.prisma.kanbanColumn.update({
          where: { id, userId }, // Security: double-check userId
          data: { order: index },
        }),
      ),
    );

    this.logger.log(`Reordered ${columnIds.length} columns for user ${userId}`);

    // 3. Return sorted columns
    return this.getColumns(userId);
  }

  /**
   * Initialize default columns for new user
   */
  async initializeDefaultColumns(userId: string): Promise<void> {
    const existingColumns = await this.prisma.kanbanColumn.count({
      where: { userId },
    });

    if (existingColumns > 0) {
      this.logger.warn(
        `User ${userId} already has columns, skipping initialization`,
      );
      return;
    }

    const defaultColumns = [
      {
        name: "Inbox",
        key: "INBOX",
        color: "#3B82F6",
        icon: "📥",
        order: 0,
        gmailLabelId: "INBOX", // Gmail system label
        gmailLabelName: "Inbox",
        isSystemProtected: true,
      },
      {
        name: "To Do",
        key: "TODO",
        color: "#F59E0B",
        icon: "📝",
        order: 1,
        gmailLabelId: null, // Will be created on OAuth
        gmailLabelName: null,
        isSystemProtected: false,
      },
      {
        name: "Processing",
        key: "PROCESSING",
        color: "#8B5CF6",
        icon: "⚙️",
        order: 2,
        gmailLabelId: null,
        gmailLabelName: null,
        isSystemProtected: false,
      },
      {
        name: "Done",
        key: "DONE",
        color: "#10B981",
        icon: "✅",
        order: 3,
        gmailLabelId: null,
        gmailLabelName: null,
        isSystemProtected: false,
      },
      {
        name: "Frozen",
        key: "FROZEN",
        color: "#6B7280",
        icon: "❄️",
        order: 4,
        gmailLabelId: null,
        gmailLabelName: null,
        isSystemProtected: true,
      },
    ];

    await this.prisma.kanbanColumn.createMany({
      data: defaultColumns.map((col) => ({
        userId,
        ...col,
      })),
    });

    this.logger.log(
      `Initialized ${defaultColumns.length} default columns for user ${userId}`,
    );
  }

  private generateKeyFromName(name: string): string {
    return name
      .normalize("NFD") // Decompose Vietnamese characters
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
      .replace(/đ/g, "d") // Replace đ → d
      .replace(/Đ/g, "D") // Replace Đ → D
      .toUpperCase() // Convert to uppercase
      .replace(/[^A-Z0-9]/g, "") // Remove all non-alphanumeric characters (spaces, special chars)
      .trim(); // Remove any leading/trailing whitespace (shouldn't be any)
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDto(column: any): KanbanColumnDto {
    return {
      id: column.id,
      name: column.name,
      key: column.key,
      color: column.color,
      icon: column.icon,
      order: column.order,
      gmailLabelId: column.gmailLabelId,
      gmailLabelName: column.gmailLabelName,
      isSystemProtected: column.isSystemProtected,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
    };
  }
}
