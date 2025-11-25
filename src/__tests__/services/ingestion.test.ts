import { IngestionService } from '../../services/ingestion';
import { supabase } from '../../config/database';
import { DealData } from '../../types/deal';

jest.mock('../../config/database');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('IngestionService', () => {
  let service: IngestionService;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    service = new IngestionService();
    mockFrom = jest.fn();
    mockSupabase.from = mockFrom as any;
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestDeals', () => {
    const sampleDeal: DealData = {
      retailer: 'Test Retailer',
      product: 'Test Product',
      size: '1 lb',
      price: 9.99,
      start: '2025-09-01',
      end: '2025-09-07',
      category: 'produce',
    };

    it('should successfully ingest a new deal', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
      };

      const mockProducts = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'deal-1' }, error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'products') return mockProducts as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      mockRetailers.insert.mockResolvedValue({
        data: { id: 'retailer-1' },
        error: null,
      });

      mockProducts.insert.mockResolvedValue({
        data: { id: 'product-1' },
        error: null,
      });

      await service.ingestDeals([sampleDeal]);

      expect(mockFrom).toHaveBeenCalledWith('retailers');
      expect(mockFrom).toHaveBeenCalledWith('products');
      expect(mockFrom).toHaveBeenCalledWith('deals');
      expect(mockDeals.insert).toHaveBeenCalled();
    });

    it('should skip duplicate deals', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'retailer-1' }, error: null }),
      };

      const mockProducts = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'product-1' }, error: null }),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'existing-deal' }, error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'products') return mockProducts as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      await service.ingestDeals([sampleDeal]);

      expect(mockDeals.insert).not.toHaveBeenCalled();
    });

    it('should handle empty deals array', async () => {
      await service.ingestDeals([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle database errors when creating retailer', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
      };

      mockFrom.mockReturnValue(mockRetailers as any);
      mockRetailers.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '23505' },
      });

      await expect(service.ingestDeals([sampleDeal])).rejects.toThrow();
    });

    it('should handle table not existing error', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
      };

      mockFrom.mockReturnValue(mockRetailers as any);
      mockRetailers.insert.mockResolvedValue({
        data: null,
        error: { message: 'does not exist', code: '42P01' },
      });

      await expect(service.ingestDeals([sampleDeal])).rejects.toThrow('Database table');
    });

    it('should handle multiple deals', async () => {
      const deals: DealData[] = [
        { ...sampleDeal, retailer: 'Retailer 1' },
        { ...sampleDeal, retailer: 'Retailer 2' },
      ];

      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'retailer-1' }, error: null }),
      };

      const mockProducts = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'product-1' }, error: null }),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'deal-1' }, error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'products') return mockProducts as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      await service.ingestDeals(deals);

      expect(mockDeals.insert).toHaveBeenCalledTimes(2);
    });

    it('should handle deal insertion error', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'retailer-1' }, error: null }),
      };

      const mockProducts = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'product-1' }, error: null }),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'products') return mockProducts as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      await expect(service.ingestDeals([sampleDeal])).rejects.toThrow('Failed to insert deal');
    });
  });

  describe('seedUsers', () => {
    const sampleUsers = [
      {
        name: 'Test User',
        email: 'test@example.com',
        preferred_retailers: ['Retailer 1'],
      },
    ];

    it('should create new user when none exists', async () => {
      const mockUsers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
      };

      mockFrom.mockReturnValue(mockUsers as any);

      await service.seedUsers(sampleUsers);

      expect(mockUsers.insert).toHaveBeenCalled();
    });

    it('should update existing user by name', async () => {
      const mockUsers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'user-1', email: 'old@example.com' }, error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockFrom.mockReturnValue(mockUsers as any);
      mockUsers.update.mockResolvedValue({ data: null, error: null });

      await service.seedUsers(sampleUsers);

      expect(mockUsers.update).toHaveBeenCalled();
    });

    it('should handle email conflict by deleting conflicting user', async () => {
      const mockUsers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: 'user-1', email: 'old@example.com' }, error: null })
          .mockResolvedValueOnce({ data: { id: 'user-2', name: 'Other User' }, error: null }),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockFrom.mockReturnValue(mockUsers as any);
      mockUsers.update.mockResolvedValue({ data: null, error: null });

      await service.seedUsers(sampleUsers);

      expect(mockUsers.delete).toHaveBeenCalled();
    });

    it('should handle empty users array', async () => {
      await service.seedUsers([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle database errors when seeding users', async () => {
      const mockUsers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockFrom.mockReturnValue(mockUsers as any);

      await service.seedUsers(sampleUsers);

      expect(console.error).toHaveBeenCalled();
    });

    it('should update user when email exists but name is different', async () => {
      const mockUsers = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: { id: 'user-1', name: 'Old Name' }, error: null }),
        update: jest.fn().mockReturnThis(),
      };

      mockFrom.mockReturnValue(mockUsers as any);
      mockUsers.update.mockResolvedValue({ data: null, error: null });

      await service.seedUsers(sampleUsers);

      expect(mockUsers.update).toHaveBeenCalled();
    });
  });
});

