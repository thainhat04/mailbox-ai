import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Microsoft Graph API Client
 * Handles HTTP communication with Microsoft Graph API
 */
export class OutlookGraphClient {
  private readonly logger = new Logger(OutlookGraphClient.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private accessToken: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use((config) => {
      this.logger.debug(`${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        this.logger.error(
          `API Error: ${error.response?.status} ${error.response?.statusText}`,
          error.response?.data,
        );
        throw error;
      },
    );
  }

  /**
   * Update access token
   */
  updateAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
    this.client.defaults.headers.common['Authorization'] =
      `Bearer ${accessToken}`;
  }

  // ----------------- Messages -----------------

  async listMessages(params: {
    $top?: number;
    $skip?: number;
    $filter?: string;
    $orderby?: string;
    $select?: string;
  }) {
    const response = await this.client.get('/me/messages', { params });
    return response.data;
  }

  async getMessage(messageId: string, select?: string) {
    const response = await this.client.get(`/me/messages/${messageId}`, {
      params: select ? { $select: select } : undefined,
    });
    return response.data;
  }

  async sendMessage(data: {
    message: {
      subject: string;
      body: {
        contentType: 'Text' | 'HTML';
        content: string;
      };
      toRecipients: Array<{
        emailAddress: { address: string; name?: string };
      }>;
      ccRecipients?: Array<{
        emailAddress: { address: string; name?: string };
      }>;
      bccRecipients?: Array<{
        emailAddress: { address: string; name?: string };
      }>;
      attachments?: any[];
    };
    saveToSentItems?: boolean;
  }) {
    const response = await this.client.post('/me/sendMail', data);
    return response.data;
  }

  async updateMessage(
    messageId: string,
    data: {
      isRead?: boolean;
      categories?: string[];
      flag?: any;
    },
  ) {
    const response = await this.client.patch(
      `/me/messages/${messageId}`,
      data,
    );
    return response.data;
  }

  async moveMessage(messageId: string, destinationId: string) {
    const response = await this.client.post(
      `/me/messages/${messageId}/move`,
      { destinationId },
    );
    return response.data;
  }

  async deleteMessage(messageId: string) {
    await this.client.delete(`/me/messages/${messageId}`);
  }

  // ----------------- Mail Folders -----------------

  async listMailFolders() {
    const response = await this.client.get('/me/mailFolders');
    return response.data;
  }

  async getMailFolder(folderId: string) {
    const response = await this.client.get(`/me/mailFolders/${folderId}`);
    return response.data;
  }

  // ----------------- Categories (Labels) -----------------

  async listCategories() {
    const response = await this.client.get('/me/outlook/masterCategories');
    return response.data;
  }

  async createCategory(data: {
    displayName: string;
    color?:
      | 'preset0'
      | 'preset1'
      | 'preset2'
      | 'preset3'
      | 'preset4'
      | 'preset5'
      | 'preset6'
      | 'preset7'
      | 'preset8'
      | 'preset9'
      | 'preset10'
      | 'preset11'
      | 'preset12'
      | 'preset13'
      | 'preset14'
      | 'preset15'
      | 'preset16'
      | 'preset17'
      | 'preset18'
      | 'preset19'
      | 'preset20'
      | 'preset21'
      | 'preset22'
      | 'preset23'
      | 'preset24';
  }) {
    const response = await this.client.post(
      '/me/outlook/masterCategories',
      data,
    );
    return response.data;
  }

  async updateCategory(
    categoryId: string,
    data: {
      displayName?: string;
      color?: string;
    },
  ) {
    const response = await this.client.patch(
      `/me/outlook/masterCategories/${categoryId}`,
      data,
    );
    return response.data;
  }

  async deleteCategory(categoryId: string) {
    await this.client.delete(`/me/outlook/masterCategories/${categoryId}`);
  }

  // ----------------- Attachments -----------------

  async listAttachments(messageId: string) {
    const response = await this.client.get(
      `/me/messages/${messageId}/attachments`,
    );
    return response.data;
  }

  async getAttachment(messageId: string, attachmentId: string) {
    const response = await this.client.get(
      `/me/messages/${messageId}/attachments/${attachmentId}`,
    );
    return response.data;
  }

  // ----------------- Delta Query (Sync) -----------------

  async getDeltaMessages(deltaLink?: string) {
    if (deltaLink) {
      // Use deltaLink directly (full URL)
      const response = await axios.get(deltaLink, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.data;
    }

    // Initial delta query
    const response = await this.client.get('/me/messages/delta', {
      params: {
        $select:
          'id,conversationId,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments',
      },
    });
    return response.data;
  }

  // ----------------- Subscriptions (Webhooks) -----------------

  async createSubscription(data: {
    changeType: string; // "created,updated,deleted"
    notificationUrl: string;
    resource: string; // "/me/messages"
    expirationDateTime: string; // ISO 8601 format
    clientState?: string;
  }) {
    const response = await this.client.post('/subscriptions', data);
    return response.data;
  }

  async updateSubscription(
    subscriptionId: string,
    data: {
      expirationDateTime: string;
    },
  ) {
    const response = await this.client.patch(
      `/subscriptions/${subscriptionId}`,
      data,
    );
    return response.data;
  }

  async deleteSubscription(subscriptionId: string) {
    await this.client.delete(`/subscriptions/${subscriptionId}`);
  }

  // ----------------- Profile -----------------

  async getProfile() {
    const response = await this.client.get('/me', {
      params: {
        $select: 'displayName,mail,userPrincipalName',
      },
    });
    return response.data;
  }

  async getProfilePhoto() {
    try {
      const response = await this.client.get('/me/photo/$value', {
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error) {
      // No photo available
      return null;
    }
  }
}
