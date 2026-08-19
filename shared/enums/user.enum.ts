export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  BANNED: 'banned',
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus]; 