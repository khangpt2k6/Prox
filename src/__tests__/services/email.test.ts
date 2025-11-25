import { EmailService } from '../../services/email';
import { Deal } from '../../types/deal';
import { Resend } from 'resend';

jest.mock('resend');
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockResendSend: jest.Mock;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.FROM_EMAIL = 'test@example.com';

    mockResendSend = jest.fn();
    (Resend as jest.Mock).mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    }));

    service = new EmailService();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  describe('sendWeeklyDealsEmail', () => {
    const sampleDeals: Deal[] = [
      {
        id: '1',
        retailer_id: 'r1',
        product_id: 'p1',
        price: 9.99,
        start_date: '2025-09-01',
        end_date: '2025-09-07',
        retailer_name: 'Test Retailer',
        product_name: 'Test Product',
        product_size: '1 lb',
        category: 'produce',
      },
    ];

    it('should successfully send email', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', sampleDeals);

      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: expect.stringContaining('Weekly Deals'),
        html: expect.any(String),
        text: expect.any(String),
      });
    });

    it('should skip sending when no deals available', async () => {
      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', []);

      expect(mockResendSend).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping email')
      );
    });

    it('should handle Resend API errors', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'API error' },
      });

      await expect(
        service.sendWeeklyDealsEmail('user@example.com', 'Test User', sampleDeals)
      ).rejects.toThrow('Resend API error');

      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockResendSend.mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendWeeklyDealsEmail('user@example.com', 'Test User', sampleDeals)
      ).rejects.toThrow();

      expect(console.error).toHaveBeenCalled();
    });

    it('should generate HTML with Prox brand colors', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', sampleDeals);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('#0FB872');
      expect(callArgs.html).toContain('#0A4D3C');
      expect(callArgs.html).toContain('#F4FBF8');
    });

    it('should group deals by retailer in HTML', async () => {
      const deals: Deal[] = [
        { ...sampleDeals[0], retailer_name: 'Retailer A' },
        { ...sampleDeals[0], retailer_name: 'Retailer B' },
      ];

      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', deals);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Retailer A');
      expect(callArgs.html).toContain('Retailer B');
    });

    it('should include plain-text fallback', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', sampleDeals);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.text).toBeDefined();
      expect(callArgs.text).toContain('Test User');
      expect(callArgs.text).toContain('Test Product');
    });

    it('should include manage preferences link', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', sampleDeals);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Manage Preferences');
      expect(callArgs.text).toContain('Manage Preferences');
    });

    it('should handle deals with missing retailer name', async () => {
      const deals: Deal[] = [
        {
          ...sampleDeals[0],
          retailer_name: '',
        },
      ];

      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', deals);

      expect(mockResendSend).toHaveBeenCalled();
    });

    it('should format prices correctly', async () => {
      const deals: Deal[] = [
        { ...sampleDeals[0], price: 9.99 },
        { ...sampleDeals[0], price: 1.5 },
      ];

      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', deals);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('$9.99');
      expect(callArgs.html).toContain('$1.50');
    });

    it('should handle multiple deals from same retailer', async () => {
      const deals: Deal[] = [
        { ...sampleDeals[0], product_name: 'Product 1' },
        { ...sampleDeals[0], product_name: 'Product 2' },
      ];

      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await service.sendWeeklyDealsEmail('user@example.com', 'Test User', deals);

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Product 1');
      expect(callArgs.html).toContain('Product 2');
    });
  });
});

