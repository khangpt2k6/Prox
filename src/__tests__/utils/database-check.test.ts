import { verifyDatabaseSetup } from '../../utils/database-check';
import { supabase } from '../../config/database';

jest.mock('../../config/database');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('verifyDatabaseSetup', () => {
  let mockFrom: jest.Mock;

  beforeEach(() => {
    mockFrom = jest.fn();
    mockSupabase.from = mockFrom as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass when all tables exist', async () => {
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockFrom.mockReturnValue(mockTable as any);

    await expect(verifyDatabaseSetup()).resolves.not.toThrow();
  });

  it('should fail when retailers table is missing', async () => {
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'does not exist', code: '42P01' },
      }),
    };

    mockFrom.mockReturnValue(mockTable as any);

    await expect(verifyDatabaseSetup()).rejects.toThrow('Database tables not found');
  });

  it('should fail when products table is missing', async () => {
    let callCount = 0;
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'schema cache', code: '42P01' },
        });
      }),
    };

    mockFrom.mockReturnValue(mockTable as any);

    await expect(verifyDatabaseSetup()).rejects.toThrow('Database tables not found');
  });

  it('should fail when deals table is missing', async () => {
    let callCount = 0;
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'does not exist' },
        });
      }),
    };

    mockFrom.mockReturnValue(mockTable as any);

    await expect(verifyDatabaseSetup()).rejects.toThrow('Database tables not found');
  });

  it('should fail when users table is missing', async () => {
    let callCount = 0;
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'schema cache' },
        });
      }),
    };

    mockFrom.mockReturnValue(mockTable as any);

    await expect(verifyDatabaseSetup()).rejects.toThrow('Database tables not found');
  });

  it('should handle exceptions during table check', async () => {
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('does not exist')),
    };

    mockFrom.mockReturnValue(mockTable as any);

    await expect(verifyDatabaseSetup()).rejects.toThrow('Database tables not found');
  });

  it('should list all missing tables in error message', async () => {
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'does not exist', code: '42P01' },
      }),
    };

    mockFrom.mockReturnValue(mockTable as any);

    try {
      await verifyDatabaseSetup();
    } catch (error: any) {
      expect(error.message).toContain('retailers');
      expect(error.message).toContain('products');
      expect(error.message).toContain('deals');
      expect(error.message).toContain('users');
    }
  });
});

