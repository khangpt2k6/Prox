import { DealsService } from '../../services/deals';
import { supabase } from '../../config/database';

jest.mock('../../config/database');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('DealsService', () => {
  let service: DealsService;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    service = new DealsService();
    mockFrom = jest.fn();
    mockSupabase.from = mockFrom as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopDeals', () => {
    it('should return top deals sorted by price', async () => {
      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              retailer_id: 'r1',
              product_id: 'p1',
              price: '5.99',
              start_date: '2025-09-01',
              end_date: '2025-09-07',
              retailers: { name: 'Retailer 1' },
              products: { name: 'Product 1', size: '1 lb', category: 'produce' },
            },
          ],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockDeals as any);

      const result = await service.getTopDeals(6);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(5.99);
      expect(result[0].retailer_name).toBe('Retailer 1');
      expect(mockDeals.order).toHaveBeenCalledWith('price', { ascending: true });
      expect(mockDeals.limit).toHaveBeenCalledWith(6);
    });

    it('should return empty array when no deals exist', async () => {
      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockDeals as any);

      const result = await service.getTopDeals();

      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockDeals as any);

      const result = await service.getTopDeals();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockFrom.mockReturnValue(mockDeals as any);

      await expect(service.getTopDeals()).rejects.toThrow('Failed to fetch deals');
    });

    it('should handle missing retailer/product data', async () => {
      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              retailer_id: 'r1',
              product_id: 'p1',
              price: '5.99',
              start_date: '2025-09-01',
              end_date: '2025-09-07',
              retailers: null,
              products: null,
            },
          ],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockDeals as any);

      const result = await service.getTopDeals();

      expect(result[0].retailer_name).toBe('Unknown');
      expect(result[0].product_name).toBe('Unknown');
    });

    it('should use default limit of 6', async () => {
      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockDeals as any);

      await service.getTopDeals();

      expect(mockDeals.limit).toHaveBeenCalledWith(6);
    });
  });

  describe('getDealsForUser', () => {
    it('should return deals filtered by preferred retailers', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'r1', name: 'Retailer 1' }],
          error: null,
        }),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              retailer_id: 'r1',
              product_id: 'p1',
              price: '5.99',
              start_date: '2025-09-01',
              end_date: '2025-09-07',
              retailers: { name: 'Retailer 1' },
              products: { name: 'Product 1', size: '1 lb', category: 'produce' },
            },
          ],
          error: null,
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      const result = await service.getDealsForUser(['Retailer 1'], 6);

      expect(result).toHaveLength(1);
      expect(mockRetailers.in).toHaveBeenCalledWith('name', ['Retailer 1']);
    });

    it('should return empty array when no preferred retailers match', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockRetailers as any);

      const result = await service.getDealsForUser(['Non-existent Retailer'], 6);

      expect(result).toEqual([]);
    });

    it('should handle empty preferred retailers array', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockRetailers as any);

      const result = await service.getDealsForUser([], 6);

      expect(result).toEqual([]);
    });

    it('should handle retailer fetch errors', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockFrom.mockReturnValue(mockRetailers as any);

      await expect(service.getDealsForUser(['Retailer 1'], 6)).rejects.toThrow(
        'Failed to fetch retailers'
      );
    });

    it('should handle deal fetch errors', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'r1', name: 'Retailer 1' }],
          error: null,
        }),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      await expect(service.getDealsForUser(['Retailer 1'], 6)).rejects.toThrow(
        'Failed to fetch deals'
      );
    });

    it('should limit results to specified limit', async () => {
      const mockRetailers = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'r1', name: 'Retailer 1' }],
          error: null,
        }),
      };

      const mockDeals = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'retailers') return mockRetailers as any;
        if (table === 'deals') return mockDeals as any;
        return {} as any;
      });

      await service.getDealsForUser(['Retailer 1'], 10);

      expect(mockDeals.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = {
        select: jest.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              name: 'User 1',
              email: 'user1@example.com',
              preferred_retailers: ['Retailer 1'],
            },
          ],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockUsers as any);

      const result = await service.getAllUsers();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User 1');
    });

    it('should return empty array when no users exist', async () => {
      const mockUsers = {
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockUsers as any);

      const result = await service.getAllUsers();

      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      const mockUsers = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockFrom.mockReturnValue(mockUsers as any);

      const result = await service.getAllUsers();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockUsers = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockFrom.mockReturnValue(mockUsers as any);

      await expect(service.getAllUsers()).rejects.toThrow('Failed to fetch users');
    });
  });
});

