jest.mock('../config/database', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(),
      },
    })),
  };
});

