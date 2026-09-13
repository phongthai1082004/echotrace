export const NotificationType = {
  INFO: 'info',
  ORDER: 'order',
  PAYMENT: 'payment',
  SHIPPING: 'shipping',
  PROMOTION: 'promotion',
  SYSTEM: 'system',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const NotificationChannel = {
  DB: 'db',
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

export type NotificationChannel = typeof NotificationChannel[keyof typeof NotificationChannel];
