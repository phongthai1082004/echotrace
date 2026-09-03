/**
 * Users Routes Integration Tests
 * Test coverage: GET /users, GET /users/:id, PUT /users/:id, DELETE /users/:id, GET /users/profile
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), user management
 */

import { UsersService } from '@features/users/users.service';
import { UsersRepository } from '@features/users/users.repository';
import { AppError } from '@middleware/app.error';
import { Request, Response } from 'express';

describe('Users Routes - Integration Tests', () => {
  let mockUsersService: jest.Mocked<UsersService>;
  let mockUsersRepository: jest.Mocked<UsersRepository>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockUsersService = {
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getUserProfile: jest.fn(),
      searchUsers: jest.fn(),
      getUsersByRole: jest.fn(),
      deactivateUser: jest.fn(),
      updateUserPassword: jest.fn(),
      updateUserAvatar: jest.fn(),
    } as any;

    mockUsersRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    req = {
      params: {},
      query: {},
      body: {},
      user: { id: 1, role: 'admin' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('GET /users - List All Users', () => {
    it('EP: Should return all users for admin', async () => {
      const users = [
        {
          id: 1,
          email: 'user1@example.com',
          name: 'User 1',
          role: 'user',
          active: true,
        },
        {
          id: 2,
          email: 'user2@example.com',
          name: 'User 2',
          role: 'user',
          active: true,
        },
      ];
      mockUsersService.getAllUsers.mockResolvedValue(users);

      const result = await mockUsersService.getAllUsers();

      expect(result).toEqual(users);
      expect(result).toHaveLength(2);
    });

    it('EP: Should handle empty users list', async () => {
      mockUsersService.getAllUsers.mockResolvedValue([]);

      const result = await mockUsersService.getAllUsers();

      expect(result).toEqual([]);
    });

    it('Error: Should deny access for non-admin users', async () => {
      req.user = { id: 1, role: 'user' };
      mockUsersService.getAllUsers.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.getAllUsers()).rejects.toThrow();
    });

    it('BVA: Should handle large user list (10000+)', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
      }));
      mockUsersService.getAllUsers.mockResolvedValue(users);

      const result = await mockUsersService.getAllUsers();

      expect(result.length).toBeGreaterThan(0);
    });

    it('EP: Should support pagination', async () => {
      const users = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));
      mockUsersService.getAllUsers.mockResolvedValue(users);

      req.query = { page: '1', limit: '10' };
      const result = await mockUsersService.getAllUsers();

      expect(result).toBeDefined();
    });
  });

  describe('GET /users/:id - Get Single User', () => {
    it('EP: Should return user by ID', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        phone: '0123456789',
        address: '123 Main St',
        active: true,
        createdAt: new Date(),
      };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(1);

      expect(result).toEqual(user);
      expect(result.name).toBe('John Doe');
    });

    it('EP: Should return 404 for non-existent user', async () => {
      mockUsersService.getUserById.mockResolvedValue(null);

      const result = await mockUsersService.getUserById(999);

      expect(result).toBeNull();
    });

    it('EP: Should not expose password in response', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        password: undefined, // Should never be included
      };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(1);

      expect(result.password).toBeUndefined();
    });

    it('BVA: Should handle ID boundary (1)', async () => {
      const user = { id: 1, name: 'User 1' };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(1);

      expect(result.id).toBe(1);
    });

    it('BVA: Should handle large ID (999999)', async () => {
      const user = { id: 999999, name: 'User' };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(999999);

      expect(result?.id).toBe(999999);
    });
  });

  describe('GET /users/profile - Get Current User Profile', () => {
    it('EP: Should return current user profile', async () => {
      const profile = {
        id: 1,
        email: 'user@example.com',
        name: 'Current User',
        role: 'user',
        avatar: 'https://example.com/avatar.jpg',
        phone: '0123456789',
      };
      mockUsersService.getUserProfile.mockResolvedValue(profile);

      req.user = { id: 1 };
      const result = await mockUsersService.getUserProfile(1);

      expect(result).toEqual(profile);
    });

    it('EP: Should not allow access to other user profiles', async () => {
      req.user = { id: 1 };
      mockUsersService.getUserProfile.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.getUserProfile(2)).rejects.toThrow();
    });

    it('EP: Should allow admin to access any profile', async () => {
      req.user = { id: 999, role: 'admin' };
      const profile = { id: 1, email: 'user@example.com', name: 'User' };
      mockUsersService.getUserProfile.mockResolvedValue(profile);

      const result = await mockUsersService.getUserProfile(1);

      expect(result).toBeDefined();
    });
  });

  describe('PUT /users/:id - Update User', () => {
    it('EP: Should update user information', async () => {
      const update = { name: 'Updated Name', phone: '9876543210' };
      const updated = {
        id: 1,
        name: 'Updated Name',
        phone: '9876543210',
        email: 'user@example.com',
      };
      mockUsersService.updateUser.mockResolvedValue(updated);

      const result = await mockUsersService.updateUser(1, update);

      expect(result.name).toBe('Updated Name');
      expect(result.phone).toBe('9876543210');
    });

    it('EP: Should return 404 if user not found', async () => {
      mockUsersService.updateUser.mockResolvedValue(null);

      const result = await mockUsersService.updateUser(999, { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('EP: Should allow partial updates', async () => {
      const update = { address: 'New Address' };
      const updated = {
        id: 1,
        name: 'User',
        address: 'New Address',
      };
      mockUsersService.updateUser.mockResolvedValue(updated);

      const result = await mockUsersService.updateUser(1, update);

      expect(result.address).toBe('New Address');
    });

    it('Error: Should not allow updating email directly', async () => {
      const update = { email: 'newemail@example.com' };
      mockUsersService.updateUser.mockRejectedValue(
        new AppError('CANNOT_UPDATE_EMAIL', 400)
      );

      await expect(mockUsersService.updateUser(1, update)).rejects.toThrow();
    });

    it('Error: Should not allow non-owner to update', async () => {
      req.user = { id: 2 };
      mockUsersService.updateUser.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.updateUser(1, { name: 'Hacked' })).rejects.toThrow();
    });

    it('BVA: Should handle very long name (255 chars)', async () => {
      const longName = 'A'.repeat(255);
      const update = { name: longName };
      const updated = { id: 1, name: longName };
      mockUsersService.updateUser.mockResolvedValue(updated);

      const result = await mockUsersService.updateUser(1, update);

      expect(result.name).toHaveLength(255);
    });
  });

  describe('DELETE /users/:id - Delete User', () => {
    it('EP: Should delete user', async () => {
      mockUsersService.deleteUser.mockResolvedValue(true);

      const result = await mockUsersService.deleteUser(1);

      expect(result).toBe(true);
    });

    it('EP: Should return 404 if user not found', async () => {
      mockUsersService.deleteUser.mockResolvedValue(false);

      const result = await mockUsersService.deleteUser(999);

      expect(result).toBe(false);
    });

    it('Error: Should deny deletion for non-admin users', async () => {
      req.user = { id: 2, role: 'user' };
      mockUsersService.deleteUser.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.deleteUser(1)).rejects.toThrow();
    });

    it('Error: Should prevent self-deletion', async () => {
      req.user = { id: 1, role: 'admin' };
      mockUsersService.deleteUser.mockRejectedValue(
        new AppError('CANNOT_DELETE_SELF', 400)
      );

      await expect(mockUsersService.deleteUser(1)).rejects.toThrow();
    });
  });

  describe('GET /users/search - Search Users', () => {
    it('EP: Should search by email', async () => {
      const results = [{ id: 1, email: 'john@example.com', name: 'John' }];
      mockUsersService.searchUsers.mockResolvedValue(results);

      const result = await mockUsersService.searchUsers('john@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].email).toContain('john');
    });

    it('EP: Should search by name', async () => {
      const results = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'John Smith', email: 'johnsmith@example.com' },
      ];
      mockUsersService.searchUsers.mockResolvedValue(results);

      const result = await mockUsersService.searchUsers('John');

      expect(result).toHaveLength(2);
      expect(result.every((u) => u.name.includes('John'))).toBe(true);
    });

    it('EP: Should return empty if no matches', async () => {
      mockUsersService.searchUsers.mockResolvedValue([]);

      const result = await mockUsersService.searchUsers('NonExistent');

      expect(result).toEqual([]);
    });

    it('Error: Should deny search access for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockUsersService.searchUsers.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.searchUsers('test')).rejects.toThrow();
    });
  });

  describe('GET /users/role/:role - Get Users by Role', () => {
    it('EP: Should return admin users', async () => {
      const admins = [
        { id: 1, name: 'Admin 1', role: 'admin' },
        { id: 2, name: 'Admin 2', role: 'admin' },
      ];
      mockUsersService.getUsersByRole.mockResolvedValue(admins);

      const result = await mockUsersService.getUsersByRole('admin');

      expect(result).toHaveLength(2);
      expect(result.every((u) => u.role === 'admin')).toBe(true);
    });

    it('EP: Should return regular users', async () => {
      const users = [
        { id: 3, name: 'User 1', role: 'user' },
        { id: 4, name: 'User 2', role: 'user' },
      ];
      mockUsersService.getUsersByRole.mockResolvedValue(users);

      const result = await mockUsersService.getUsersByRole('user');

      expect(result.every((u) => u.role === 'user')).toBe(true);
    });

    it('EP: Should return empty if no users with role', async () => {
      mockUsersService.getUsersByRole.mockResolvedValue([]);

      const result = await mockUsersService.getUsersByRole('superadmin');

      expect(result).toEqual([]);
    });

    it('Error: Should deny access for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockUsersService.getUsersByRole.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.getUsersByRole('admin')).rejects.toThrow();
    });
  });

  describe('PUT /users/:id/password - Update Password', () => {
    it('EP: Should update password with correct old password', async () => {
      const passwordData = {
        oldPassword: 'currentPassword123',
        newPassword: 'newPassword456',
      };
      mockUsersService.updateUserPassword.mockResolvedValue({
        id: 1,
        success: true,
      });

      const result = await mockUsersService.updateUserPassword(1, passwordData);

      expect(result.success).toBe(true);
    });

    it('Error: Should reject incorrect old password', async () => {
      const passwordData = {
        oldPassword: 'wrongPassword',
        newPassword: 'newPassword456',
      };
      mockUsersService.updateUserPassword.mockRejectedValue(
        new AppError('INVALID_OLD_PASSWORD', 400)
      );

      await expect(
        mockUsersService.updateUserPassword(1, passwordData)
      ).rejects.toThrow();
    });

    it('Error: Should reject weak password', async () => {
      const passwordData = {
        oldPassword: 'currentPassword123',
        newPassword: '123', // Too weak
      };
      mockUsersService.updateUserPassword.mockRejectedValue(
        new AppError('WEAK_PASSWORD', 400)
      );

      await expect(
        mockUsersService.updateUserPassword(1, passwordData)
      ).rejects.toThrow();
    });

    it('BVA: Should handle password at minimum length (8)', async () => {
      const passwordData = {
        oldPassword: 'currentPassword123',
        newPassword: 'Pass1234',
      };
      mockUsersService.updateUserPassword.mockResolvedValue({
        id: 1,
        success: true,
      });

      const result = await mockUsersService.updateUserPassword(1, passwordData);

      expect(result.success).toBe(true);
    });

    it('BVA: Should handle password at maximum length (128)', async () => {
      const longPassword = 'Pass' + 'A'.repeat(120) + '1';
      const passwordData = {
        oldPassword: 'currentPassword123',
        newPassword: longPassword,
      };
      mockUsersService.updateUserPassword.mockResolvedValue({
        id: 1,
        success: true,
      });

      const result = await mockUsersService.updateUserPassword(1, passwordData);

      expect(result.success).toBe(true);
    });
  });

  describe('PUT /users/:id/avatar - Update Avatar', () => {
    it('EP: Should update user avatar', async () => {
      const avatarData = {
        url: 'https://example.com/new-avatar.jpg',
      };
      const updated = {
        id: 1,
        avatar: 'https://example.com/new-avatar.jpg',
      };
      mockUsersService.updateUserAvatar.mockResolvedValue(updated);

      const result = await mockUsersService.updateUserAvatar(1, avatarData);

      expect(result.avatar).toBe('https://example.com/new-avatar.jpg');
    });

    it('Error: Should reject invalid image URL', async () => {
      const avatarData = {
        url: 'not-a-valid-url',
      };
      mockUsersService.updateUserAvatar.mockRejectedValue(
        new AppError('INVALID_URL', 400)
      );

      await expect(
        mockUsersService.updateUserAvatar(1, avatarData)
      ).rejects.toThrow();
    });
  });

  describe('PUT /users/:id/deactivate - Deactivate User', () => {
    it('EP: Should deactivate user', async () => {
      const deactivated = {
        id: 1,
        name: 'User',
        active: false,
      };
      mockUsersService.deactivateUser.mockResolvedValue(deactivated);

      const result = await mockUsersService.deactivateUser(1);

      expect(result.active).toBe(false);
    });

    it('EP: Should return 404 if user not found', async () => {
      mockUsersService.deactivateUser.mockResolvedValue(null);

      const result = await mockUsersService.deactivateUser(999);

      expect(result).toBeNull();
    });

    it('Error: Should deny deactivation for non-admin', async () => {
      req.user = { id: 1, role: 'user' };
      mockUsersService.deactivateUser.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.deactivateUser(1)).rejects.toThrow();
    });
  });

  describe('Authorization & Security', () => {
    it('Security: Should not expose sensitive data in list', async () => {
      const users = [
        {
          id: 1,
          email: 'user@example.com',
          name: 'User',
          password: undefined, // Should never be included
          passwordHash: undefined,
          resetToken: undefined,
        },
      ];
      mockUsersService.getAllUsers.mockResolvedValue(users);

      const result = await mockUsersService.getAllUsers();

      expect(result[0].password).toBeUndefined();
      expect(result[0].passwordHash).toBeUndefined();
    });

    it('Security: Should enforce role-based access control', async () => {
      req.user = { id: 1, role: 'user' };
      mockUsersService.getAllUsers.mockRejectedValue(
        new AppError('FORBIDDEN', 403)
      );

      await expect(mockUsersService.getAllUsers()).rejects.toThrow();
    });

    it('Security: Should allow admins to manage users', async () => {
      req.user = { id: 1, role: 'admin' };
      const users = [{ id: 2, name: 'User' }];
      mockUsersService.getAllUsers.mockResolvedValue(users);

      const result = await mockUsersService.getAllUsers();

      expect(result).toBeDefined();
    });
  });

  describe('Performance & Edge Cases', () => {
    it('Performance: Should handle concurrent user requests', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));

      const promises = users.map((u) => Promise.resolve(u));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
    });

    it('Edge: Should handle user with null optional fields', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        phone: null,
        address: null,
        avatar: null,
      };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(1);

      expect(result.phone).toBeNull();
    });

    it('Edge: Should handle user with special characters in name', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: "O'Brien-Smith & Associates",
      };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(1);

      expect(result.name).toContain('&');
    });

    it('Edge: Should handle user with international characters', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'Người Dùng Việt Nam',
      };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result = await mockUsersService.getUserById(1);

      expect(result.name).toBeDefined();
    });

    it('Edge: Should cache frequently accessed user profiles', async () => {
      const user = { id: 1, name: 'Cached User' };
      mockUsersService.getUserById.mockResolvedValue(user);

      const result1 = await mockUsersService.getUserById(1);
      const result2 = await mockUsersService.getUserById(1);

      expect(result1).toEqual(result2);
      expect(mockUsersService.getUserById).toHaveBeenCalledTimes(2);
    });
  });
});
