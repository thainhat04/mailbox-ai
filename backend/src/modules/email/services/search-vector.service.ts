import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { PrismaService } from '../../../database/prisma.service';
import { EmailSummaryDto } from '../dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SearchVectorService {
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
        const response = await axios.post(`${this.aiServiceUrl}/api/v1/search/vector/embeddings`, {
            text,
        });
        return response.data.embedding as number[];
    }

    async createVectorEmbeddingBatch(texts: string[]): Promise<number[][]> {
        const response = await axios.post(`${this.aiServiceUrl}/api/v1/search/vector/embeddings/batch`, {
            texts,
        });
        return response.data.embeddings as Array<number[]>;
    }
}