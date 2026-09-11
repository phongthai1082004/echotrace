export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  email?: string;
  phone?: string;
}

export interface Observer {
  update(payload: NotificationPayload): Promise<void> | void;
}