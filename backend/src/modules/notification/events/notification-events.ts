import type { NotificationType, NotificationChannel } from '@echotrace/shared';

export interface NotificationPayload {
  // 1. Recipient
  userId: string;
  email?: string;
  phone?: string;

  // 2. Classification
  type: NotificationType;
  channels?: NotificationChannel[];

  // 3. Content
  title: string;
  message: string;

  // 4. Helper data for click-through navigation on the UI
  metadata?: {
    bookId?: number;
    orderId?: number;
    actionUrl?: string;
    [key: string]: unknown; // extensible with arbitrary fields later
  };
}

export interface Observer {
  update(payload: NotificationPayload): Promise<void> | void;
}
