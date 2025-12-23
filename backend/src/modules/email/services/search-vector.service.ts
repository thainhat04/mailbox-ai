import { Injectable, Logger } from '@nestjs/common';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SearchVectorService {
    private readonly logger = new Logger(SearchVectorService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly emailMessageRepository: EmailMessageRepository,
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.aiServiceUrl = this.configService.get<string>(
            'AI_SERVICE_URL',
            'http://localhost:8000',
        );
    }

    async createVectorEmbedding(text: string): Promise<number[]> {
        try {
            const response = await axios.post(`${this.aiServiceUrl}/api/v1/search/vector/embeddings`, {
                text,
            });
            return response.data.embedding as number[];
        } catch (error) {
            this.logger.error(`Failed to create vector embedding: ${error.message}`);
            throw error;
        }
    }

    async createVectorEmbeddingBatch(texts: string[]): Promise<number[][]> {
        try {
            this.logger.log(`[AI Service] Creating batch embeddings for ${texts.length} texts at ${this.aiServiceUrl}/api/v1/search/vector/embeddings/batch`);
            const response = await axios.post(
                `${this.aiServiceUrl}/api/v1/search/vector/embeddings/batch`,
                { texts },
                {
                    timeout: 60000, // 60 second timeout
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`[AI Service] Received response with ${response.data?.embeddings?.length || 0} embeddings`);

            if (!response.data?.embeddings) {
                this.logger.error(`[AI Service] Invalid response structure: ${JSON.stringify(response.data)}`);
                throw new Error('Invalid response from AI service: missing embeddings');
            }

            return response.data.embeddings as Array<number[]>;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.logger.error(
                    `[AI Service] Failed to create batch vector embeddings: ${error.message}`,
                );
                this.logger.error(`[AI Service] Response status: ${error.response?.status}`);
                this.logger.error(`[AI Service] Response data: ${JSON.stringify(error.response?.data)}`);
            } else {
                this.logger.error(`[AI Service] Failed to create batch vector embeddings: ${error.message}`);
            }
            throw error;
        }
    }

    async storeEmbedding(emailMessageId: string, embedding: number[]): Promise<void> {
        try {
            const embeddingStr = `[${embedding.join(',')}]`;

            await this.prisma.$executeRawUnsafe(`
                UPDATE message_bodies
                SET embedding = $1::vector
                WHERE "emailMessageId" = $2
            `, embeddingStr, emailMessageId);

            this.logger.debug(`Stored embedding for email message: ${emailMessageId}`);
        } catch (error) {
            this.logger.error(`Failed to store embedding for ${emailMessageId}: ${error.message}`);
            throw error;
        }
    }

    async storeBatchEmbeddings(emailMessageIds: string[], embeddings: number[][]): Promise<void> {
        if (emailMessageIds.length !== embeddings.length) {
            throw new Error('emailMessageIds and embeddings arrays must have the same length');
        }

        try {
            for (let i = 0; i < emailMessageIds.length; i++) {
                await this.storeEmbedding(emailMessageIds[i], embeddings[i]);
            }
            this.logger.log(`Stored ${embeddings.length} embeddings successfully`);
        } catch (error) {
            this.logger.error(`Failed to store batch embeddings: ${error.message}`);
            throw error;
        }
    }

    async generateAndStoreEmbedding(emailMessageId: string, subject: string, bodyText: string): Promise<void> {
        const combinedText = `${subject || ''}\n${bodyText || ''}`.trim();

        if (!combinedText) {
            this.logger.warn(`No text content for email ${emailMessageId}, skipping embedding generation`);
            return;
        }

        const embedding = await this.createVectorEmbedding(combinedText);
        await this.storeEmbedding(emailMessageId, embedding);
    }
}