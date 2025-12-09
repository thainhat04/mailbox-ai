import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { PrismaService } from '../../../database/prisma.service';
import { EmailSummaryDto } from '../dto';

@Injectable()
export class SummaryService {
  constructor(
    private readonly emailMessageRepository: EmailMessageRepository,
    private readonly prisma: PrismaService,
  ) {}

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

    // Generate new summary
    const summary = await this.generateMockSummary(
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
   * Mock AI summarization (extractive approach)
   * Format: ✨ AI Summary: [extracted content]
   */
  private async generateMockSummary(
    subject: string,
    bodyText: string,
  ): Promise<string> {
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

  // Future: Real AI integration endpoint
  // private async generateAISummary(emailContent: string): Promise<string> {
  //   // POST to ai-service: http://ai-service:8000/api/v1/summarize
  //   // Body: { content: emailContent, maxLength: 200 }
  //   // Response: { summary: string }
  // }
}