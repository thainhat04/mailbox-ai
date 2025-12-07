import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Gmail API Client
 * Handles HTTP communication with Gmail API
 */
export class GmailApiClient {
  private readonly logger = new Logger(GmailApiClient.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl = 'https://gmail.googleapis.com/gmail/v1';

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
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
    includeSpamTrash?: boolean;
  }) {
    const response = await this.client.get('/users/me/messages', { params });
    return response.data;
  }

  async getMessage(messageId: string, format: 'minimal' | 'full' | 'raw' | 'metadata' = 'full') {
    const response = await this.client.get(`/users/me/messages/${messageId}`, {
      params: { format },
    });
    return response.data;
  }

  async sendMessage(data: { raw: string }) {
    const response = await this.client.post('/users/me/messages/send', data);
    return response.data;
  }

  async modifyMessage(
    messageId: string,
    data: { addLabelIds?: string[]; removeLabelIds?: string[] },
  ) {
    const response = await this.client.post(
      `/users/me/messages/${messageId}/modify`,
      data,
    );
    return response.data;
  }

  async trashMessage(messageId: string) {
    const response = await this.client.post(
      `/users/me/messages/${messageId}/trash`,
    );
    return response.data;
  }

  async deleteMessage(messageId: string) {
    await this.client.delete(`/users/me/messages/${messageId}`);
  }

  // ----------------- Threads -----------------

  async getThread(threadId: string, format: 'minimal' | 'full' | 'metadata' = 'full') {
    const response = await this.client.get(`/users/me/threads/${threadId}`, {
      params: { format },
    });
    return response.data;
  }

  async modifyThread(
    threadId: string,
    data: { addLabelIds?: string[]; removeLabelIds?: string[] },
  ) {
    const response = await this.client.post(
      `/users/me/threads/${threadId}/modify`,
      data,
    );
    return response.data;
  }

  async trashThread(threadId: string) {
    const response = await this.client.post(
      `/users/me/threads/${threadId}/trash`,
    );
    return response.data;
  }

  // ----------------- Labels -----------------

  async listLabels() {
    const response = await this.client.get('/users/me/labels');
    return response.data;
  }

  async createLabel(data: {
    name: string;
    messageListVisibility?: 'show' | 'hide';
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
    color?: {
      backgroundColor?: string;
      textColor?: string;
    };
  }) {
    const response = await this.client.post('/users/me/labels', data);
    return response.data;
  }

  async updateLabel(
    labelId: string,
    data: {
      name?: string;
      messageListVisibility?: 'show' | 'hide';
      labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide';
      color?: {
        backgroundColor?: string;
        textColor?: string;
      };
    },
  ) {
    const response = await this.client.put(`/users/me/labels/${labelId}`, data);
    return response.data;
  }

  async deleteLabel(labelId: string) {
    await this.client.delete(`/users/me/labels/${labelId}`);
  }

  // ----------------- Attachments -----------------

  async getAttachment(messageId: string, attachmentId: string) {
    const response = await this.client.get(
      `/users/me/messages/${messageId}/attachments/${attachmentId}`,
    );
    return response.data;
  }

  // ----------------- History (Sync) -----------------

  async listHistory(params: {
    startHistoryId: string;
    maxResults?: number;
    pageToken?: string;
    labelId?: string;
    historyTypes?: string[];
  }) {
    const response = await this.client.get('/users/me/history', { params });
    return response.data;
  }

  // ----------------- Watch -----------------

  async watch(data: {
    topicName: string;
    labelIds?: string[];
    labelFilterAction?: 'include' | 'exclude';
  }) {
    const response = await this.client.post('/users/me/watch', data);
    return response.data;
  }

  async stopWatch() {
    await this.client.post('/users/me/stop');
  }

  // ----------------- Profile -----------------

  async getProfile() {
    const response = await this.client.get('/users/me/profile');
    return response.data;
  }
}
