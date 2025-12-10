import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { PrismaService } from '../../../database/prisma.service';
import { EmailSummaryDto } from '../dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SummaryService {
  private readonly aiServiceUrl: string;

  constructor(
    private readonly emailMessageRepository: EmailMessageRepository,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Get AI service URL from environment or use default
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  /**
   * Generate or retrieve cached summary
   */
  async getEmailSummary(
    userId: string,
    emailId: string,
    forceRegenerate?: boolean,
  ): Promise<EmailSummaryDto> {
    // Get email with body
    const email = await this.prisma.emailMessage.findFirst({
      where: {
        id: emailId,
        emailAccount: { userId },
      },
      include: {
        body: true,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Check if we have cached summary and don't need to regenerate
    if (email.summary && !forceRegenerate) {
      return {
        summary: email.summary,
        generatedAt: email.summaryGeneratedAt || new Date(),
      };
    }

    // Generate new summary using AI service
    const summary = await this.generateAISummary(
      email.subject || '',
      email.body?.bodyText || email.body?.bodyHtml || '',
    );

    // Save to database
    await this.emailMessageRepository.updateSummary(emailId, summary);

    return {
      summary,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate AI summary using LangChain + Gemini service
   * Format: ✨ AI Summary: [AI generated content]
   */
  private async generateAISummary(
    subject: string,
    body: string,
  ): Promise<string> {
    try {
      // Call AI service endpoint
      const response = await axios.post<{ summary: string; model_used: string }>(
        `${this.aiServiceUrl}/api/v1/summarize`,
        {
          subject,
          body,
          max_length: 200,
        },
        {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.summary;
    } catch (error) {
      // Fallback to extractive summary if AI service fails
      console.error('AI service error, falling back to extractive summary:', error);
      return this.generateFallbackSummary(subject, body);
    }
  }

  /**
   * Fallback extractive summary if AI service is unavailable
   * Format: ✨ AI Summary: [extracted content]
   */
  private generateFallbackSummary(
    subject: string,
    bodyText: string,
  ): string {
    // Strategy: Extract first 2-3 sentences or first 150 characters
    const cleanText = bodyText
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!cleanText || cleanText.length < 20) {
      // Fallback if body is empty/too short
      return `✨ AI Summary: ${subject}`;
    }

    // Extract first 2-3 sentences
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
    let extractedText = '';

    if (sentences.length >= 2) {
      extractedText = sentences.slice(0, 2).join(' ');
    } else {
      extractedText = cleanText.substring(0, 150);
    }

    // Ensure max length 200 chars
    if (extractedText.length > 200) {
      extractedText = extractedText.substring(0, 197) + '...';
    }

    return `✨ AI Summary: ${extractedText}`;
  }
}