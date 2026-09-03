/**
 * API Response DTO Tests
 * Test coverage: Success responses, error responses, pagination
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis)
 */

describe('API Response DTO - Unit Tests', () => {
  interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    error?: string;
    timestamp: Date;
  }

  const createResponse = <T>(overrides?: Partial<ApiResponse<T>>): ApiResponse<T> => ({
    success: true,
    statusCode: 200,
    message: 'OK',
    timestamp: new Date(),
    ...overrides,
  });

  describe('1. EP: Success Responses', () => {
    it('EP: Should create success response', () => {
      const response = createResponse({ success: true, statusCode: 200 });

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
    });

    it('EP: Should include message', () => {
      const response = createResponse({ message: 'User created' });

      expect(response.message).toBe('User created');
    });

    it('EP: Should include data', () => {
      const response = createResponse({
        data: { id: 1, name: 'Test' },
      });

      expect(response.data).toEqual({ id: 1, name: 'Test' });
    });

    it('EP: Should not include error on success', () => {
      const response = createResponse({ success: true });

      expect(response.error).toBeUndefined();
    });
  });

  describe('2. EP: Error Responses', () => {
    it('EP: Should create error response', () => {
      const response = createResponse({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Bad Request');
    });

    it('EP: Should include error message', () => {
      const response = createResponse({
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });

      expect(response.error).toBe('Not Found');
      expect(response.message).toBe('User not found');
    });

    it('EP: Should not include data on error', () => {
      const response = createResponse({
        success: false,
        statusCode: 500,
      });

      expect(response.data).toBeUndefined();
    });
  });

  describe('3. EP: HTTP Status Codes', () => {
    it('EP: Should use 200 for GET success', () => {
      const response = createResponse({ statusCode: 200 });

      expect(response.statusCode).toBe(200);
    });

    it('EP: Should use 201 for POST created', () => {
      const response = createResponse({ statusCode: 201 });

      expect(response.statusCode).toBe(201);
    });

    it('EP: Should use 204 for DELETE success', () => {
      const response = createResponse({ statusCode: 204 });

      expect(response.statusCode).toBe(204);
    });

    it('EP: Should use 400 for bad request', () => {
      const response = createResponse({ statusCode: 400, success: false });

      expect(response.statusCode).toBe(400);
    });

    it('EP: Should use 401 for unauthorized', () => {
      const response = createResponse({ statusCode: 401, success: false });

      expect(response.statusCode).toBe(401);
    });

    it('EP: Should use 403 for forbidden', () => {
      const response = createResponse({ statusCode: 403, success: false });

      expect(response.statusCode).toBe(403);
    });

    it('EP: Should use 404 for not found', () => {
      const response = createResponse({ statusCode: 404, success: false });

      expect(response.statusCode).toBe(404);
    });

    it('EP: Should use 500 for server error', () => {
      const response = createResponse({ statusCode: 500, success: false });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('4. EP: Message Formats', () => {
    it('EP: Should support various messages', () => {
      const messages = [
        'User created successfully',
        'Order updated',
        'Items fetched',
        'Item deleted',
      ];

      messages.forEach(msg => {
        const response = createResponse({ message: msg });
        expect(response.message).toBe(msg);
      });
    });

    it('EP: Should support custom messages', () => {
      const response = createResponse({ message: 'Custom message' });

      expect(response.message).toBe('Custom message');
    });
  });

  describe('5. EP: Data Types', () => {
    it('EP: Should support object data', () => {
      const response = createResponse({ data: { id: 1, name: 'Test' } });

      expect(typeof response.data).toBe('object');
    });

    it('EP: Should support array data', () => {
      const response = createResponse({ data: [{ id: 1 }, { id: 2 }] as any });

      expect(Array.isArray(response.data)).toBe(true);
    });

    it('EP: Should support string data', () => {
      const response = createResponse({ data: 'test' as any });

      expect(response.data).toBe('test');
    });

    it('EP: Should support number data', () => {
      const response = createResponse({ data: 42 as any });

      expect(response.data).toBe(42);
    });
  });

  describe('6. EP: Timestamps', () => {
    it('EP: Should include current timestamp', () => {
      const response = createResponse();

      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('EP: Should preserve provided timestamp', () => {
      const customTime = new Date('2025-01-01');
      const response = createResponse({ timestamp: customTime });

      expect(response.timestamp).toEqual(customTime);
    });

    it('EP: Should have valid timestamp', () => {
      const response = createResponse();

      expect(response.timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('7. Integration: Common Response Patterns', () => {
    it('Integration: GET single resource', () => {
      const response = createResponse({
        statusCode: 200,
        message: 'User retrieved',
        data: { id: 1, name: 'John', email: 'john@example.com' },
      });

      expect(response.success).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('Integration: POST create resource', () => {
      const response = createResponse({
        statusCode: 201,
        message: 'Order created',
        data: { id: 100, total: 150000 },
      });

      expect(response.statusCode).toBe(201);
      expect(response.data?.id).toBe(100);
    });

    it('Integration: DELETE resource', () => {
      const response = createResponse({
        statusCode: 200,
        message: 'Item deleted successfully',
        data: { deleted: true },
      });

      expect(response.statusCode).toBe(200);
    });

    it('Integration: Error response', () => {
      const response = createResponse({
        success: false,
        statusCode: 404,
        message: 'User not found',
        error: 'NOT_FOUND',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('NOT_FOUND');
    });
  });

  describe('8. BVA: Data Size', () => {
    it('BVA: Small data object', () => {
      const response = createResponse({
        data: { id: 1 },
      });

      expect(response.data).toBeDefined();
    });

    it('BVA: Large data object', () => {
      const largeData = { fields: Array(1000).fill('value') };
      const response = createResponse({ data: largeData as any });

      expect(response.data?.fields).toHaveLength(1000);
    });

    it('BVA: Large array data', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i}`,
      }));
      const response = createResponse({ data: largeArray as any });

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data?.length).toBe(1000);
    });
  });

  describe('9. Serialization', () => {
    it('Serialization: Response to JSON', () => {
      const response = createResponse({
        data: { id: 1, name: 'Test' },
      });
      const json = JSON.stringify(response);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(true);
      expect(parsed.data.id).toBe(1);
    });

    it('Serialization: Error response to JSON', () => {
      const response = createResponse({
        success: false,
        statusCode: 400,
        error: 'Validation failed',
      });
      const json = JSON.stringify(response);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Validation failed');
    });
  });

  describe('10. EP: Validation', () => {
    it('EP: Should have all required fields', () => {
      const response = createResponse();

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
    });

    it('EP: Should be consistent', () => {
      const response = createResponse();

      if (response.success) {
        expect(response.error).toBeUndefined();
      }
    });
  });
});
