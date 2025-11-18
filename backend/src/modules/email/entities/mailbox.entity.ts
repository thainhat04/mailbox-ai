import { MailboxType } from "../dto/mailbox.dto";

export interface Mailbox {
  id: string;
  name: string;
  type: MailboxType;
  unreadCount: number;
  totalCount: number;
  icon?: string;
  color?: string;
  order: number;
}
