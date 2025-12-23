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
                    validateStatus: (status) => status < 500, // Don't throw on 4xx errors
                }
            );

            // Check for HTTP errors
            if (response.status >= 400) {
                const errorMsg = `AI service returned ${response.status}: ${JSON.stringify(response.data)}`;
                this.logger.error(`[AI Service] ${errorMsg}`);
                throw new Error(errorMsg);
            }

            this.logger.log(`[AI Service] Received response with ${response.data?.embeddings?.length || 0} embeddings`);

            if (!response.data?.embeddings) {
                this.logger.error(`[AI Service] Invalid response structure: ${JSON.stringify(response.data)}`);
                throw new Error('Invalid response from AI service: missing embeddings');
            }

            return response.data.embeddings as Array<number[]>;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                // Connection errors (ECONNREFUSED, ETIMEDOUT, etc.)
                if (error.code) {
                    this.logger.error(
                        `[AI Service] Connection error (${error.code}): Cannot connect to ${this.aiServiceUrl}. Is the AI service running?`,
                    );
                    throw new Error(
                        `AI service connection failed: ${error.message}. Please ensure the AI service is running at ${this.aiServiceUrl}`,
                    );
                }

                // HTTP errors
                if (error.response) {
                    this.logger.error(
                        `[AI Service] HTTP error ${error.response.status}: ${error.response.statusText}`,
                    );
                    this.logger.error(`[AI Service] Response data: ${JSON.stringify(error.response.data)}`);
                    throw new Error(
                        `AI service error: ${error.response.status} ${error.response.statusText}`,
                    );
                }

                // Request timeout
                if (error.code === 'ECONNABORTED') {
                    this.logger.error(`[AI Service] Request timeout after 60s`);
                    throw new Error('AI service request timeout. The service may be overloaded.');
                }

                // Other axios errors
                this.logger.error(`[AI Service] Axios error: ${error.message}`);
                throw error;
            } else {
                // Non-axios errors
                this.logger.error(`[AI Service] Error: ${error.message}`);
                throw error;
            }
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