const {
  handleRegister,
  handleUpdate,
  handleDeregister,
} = require('../../server/handleRegistration.js');

const clientRegistry = require('../../server/clientRegistry');
jest.mock('../../server/clientRegistry');

describe('LwM2M Registration Handlers', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      url: '/rd?ep=testClient&lt=60&b=U',
      rsinfo: { address: '127.0.0.1', port: 56830 }
    };

    mockRes = {
      code: '',
      end: jest.fn(),
      setOption: jest.fn()
    };

    jest.clearAllMocks();
  });

  describe('handleRegister', () => {
    test('should register client and respond with 2.01', async () => {
      clientRegistry.registerClient.mockImplementation(() => {});

      const result = await handleRegister(mockReq, mockRes, 'udp');

      expect(result).toHaveProperty('ep', 'testClient');
      expect(mockRes.code).toBe('2.01');
      expect(mockRes.setOption).toHaveBeenCalledWith('Location-Path', expect.any(Array));
      expect(mockRes.end).toHaveBeenCalled();
      expect(clientRegistry.registerClient).toHaveBeenCalledWith(
        'testClient',
        expect.objectContaining({
          address: '127.0.0.1',
          protocol: 'udp',
          location: expect.any(String),
          lifetime: 60,
          binding: 'U'
        })
      );
    });

    test('should fail if ep is missing', async () => {
      mockReq.url = '/rd?lt=60';

      await expect(handleRegister(mockReq, mockRes, 'udp')).rejects.toThrow('Missing ep');
      expect(mockRes.code).toBe('4.00');
      expect(mockRes.end).toHaveBeenCalledWith('Missing ep');
    });
  });

  describe('handleUpdate', () => {
    test('should update client and respond with 2.04', async () => {
      clientRegistry.updateClient.mockReturnValue('testClient');
      const mockPath = '/rd/12345';

      const result = await handleUpdate(mockReq, mockRes, mockPath);

      expect(result).toEqual({ ep: 'testClient', location: '/rd/12345' });
      expect(mockRes.code).toBe('2.04');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should fail if client not found', async () => {
      clientRegistry.updateClient.mockReturnValue(undefined);
      const mockPath = '/rd/99999';

      await expect(handleUpdate(mockReq, mockRes, mockPath)).rejects.toThrow('Client not found');
      expect(mockRes.code).toBe('4.04');
      expect(mockRes.end).toHaveBeenCalledWith('Client not found');
    });
  });

  describe('handleDeregister', () => {
    test('should deregister client and respond with 2.02', async () => {
      clientRegistry.deregisterClientByLocation.mockReturnValue('testClient');
      const mockPath = '/rd/54321';

      const result = await handleDeregister(mockReq, mockRes, mockPath);

      expect(result).toEqual({ ep: 'testClient', location: '/rd/54321' });
      expect(mockRes.code).toBe('2.02');
      expect(mockRes.end).toHaveBeenCalled();
    });

    test('should fail if client not found', async () => {
      clientRegistry.deregisterClientByLocation.mockReturnValue(undefined);
      const mockPath = '/rd/54321';

      await expect(handleDeregister(mockReq, mockRes, mockPath)).rejects.toThrow('Client not found');
      expect(mockRes.code).toBe('4.04');
      expect(mockRes.end).toHaveBeenCalledWith('Client not found');
    });
  });
});
