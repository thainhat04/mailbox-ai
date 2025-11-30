import { AttachmentDto } from "./attachment.dto";

export class ReplyEmailDto {
  /**
   * replyText: plain text version of reply
   * replyHtml: optional HTML version
   * includeQuoted: if true include original message as quoted block
   * attachments: optional attachments to add to the reply
   */
  replyText?: string;
  replyHtml?: string;
  includeQuoted?: boolean;
  attachments?: AttachmentDto[];
}
