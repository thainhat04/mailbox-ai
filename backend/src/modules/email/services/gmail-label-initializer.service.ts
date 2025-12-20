import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { MailProviderRegistry } from "../providers/provider.registry";

interface LabelCreationResult {
  columnId: string;
  columnName: string;
  labelId: string;
  labelName: string;
  created: boolean;
}

@Injectable()
export class GmailLabelInitializerService {
  private readonly logger = new Logger(GmailLabelInitializerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: MailProviderRegistry,
  ) {}

  /**
   * Initialize Gmail labels for user's Kanban columns
   * Called after OAuth callback when user connects Gmail
   */
  async initializeLabelsForUser(
    userId: string,
    emailAccountId: string,
  ): Promise<LabelCreationResult[]> {
    const results: LabelCreationResult[] = [];

    try {
      // Get mail provider for this email account
      const provider = await this.providerRegistry.getProvider(emailAccountId);

      // Get all columns for this user that need Gmail labels
      const columns = await this.prisma.kanbanColumn.findMany({
        where: {
          userId,
          key: { not: "INBOX" }, // Skip INBOX (already exists in Gmail)
          gmailLabelId: null, // Only columns without labels
        },
        orderBy: { order: "asc" },
      });

      if (columns.length === 0) {
        this.logger.log(
          `No columns need label initialization for user ${userId}`,
        );
        return results;
      }

      this.logger.log(
        `Initializing Gmail labels for ${columns.length} columns (user: ${userId})`,
      );

      // Create labels for each column
      for (const column of columns) {
        try {
          // Check if label already exists
          const existingLabels = await provider.listLabels();
          const existingLabel = existingLabels.find(
            (label) => label.name.toLowerCase() === column.name.toLowerCase(),
          );

          let labelId: string;
          let labelName: string;
          let created = false;

          if (existingLabel) {
            // Use existing label
            labelId = existingLabel.id;
            labelName = existingLabel.name;
            this.logger.log(
              `Using existing Gmail label "${labelName}" for column "${column.name}"`,
            );
          } else {
            // Create new label
            const newLabel = await provider.createLabel(column.name);

            labelId = newLabel.id;
            labelName = newLabel.name;
            created = true;

            this.logger.log(
              `Created Gmail label "${labelName}" (${labelId}) for column "${column.name}"`,
            );
          }

          // Update column with label info
          await this.prisma.kanbanColumn.update({
            where: { id: column.id },
            data: {
              gmailLabelId: labelId,
              gmailLabelName: labelName,
            },
          });

          // Store label in database
          await this.prisma.label.upsert({
            where: {
              emailAccountId_labelId: {
                emailAccountId,
                labelId,
              },
            },
            create: {
              emailAccountId,
              labelId,
              name: labelName,
              type: "user",
              messageListVisibility: "show",
              labelListVisibility: "labelShow",
            },
            update: {
              name: labelName,
            },
          });

          results.push({
            columnId: column.id,
            columnName: column.name,
            labelId,
            labelName,
            created,
          });
        } catch (error) {
          this.logger.error(
            `Failed to initialize label for column "${column.name}": ${error.message}`,
            error.stack,
          );
          // Continue with next column even if one fails
        }
      }

      this.logger.log(
        `Successfully initialized ${results.length} Gmail labels for user ${userId}`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to initialize Gmail labels for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
