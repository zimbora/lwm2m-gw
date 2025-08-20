// Test for observation registry cleanup functionality
const { registerObservation, getObservation, deregisterObservation, cleanup } = require('../../server/observationRegistry');

describe('Observation Registry Cleanup', () => {
  
  let mockSocket;
  
  beforeEach(() => {
    // Create a mock socket with close method
    mockSocket = {
      closed: false,
      close: jest.fn(() => {
        mockSocket.closed = true;
      })
    };
  });

  test('should register and retrieve observation with socket', () => {
    const token = 'test-token-123';
    const ep = 'test-endpoint';
    const path = '/3/0/0';
    const format = 'text';
    
    // Register observation with socket
    registerObservation(token, ep, path, format, mockSocket);
    
    // Retrieve observation
    const observation = getObservation(token);
    expect(observation).toBeTruthy();
    expect(observation.ep).toBe(ep);
    expect(observation.path).toBe(path);
    expect(observation.format).toBe(format);
    expect(observation.socket).toBe(mockSocket);
  });

  test('should close socket when deregistering observation', () => {
    const token = 'test-token-456';
    const ep = 'test-endpoint';
    const path = '/3/0/0';
    const format = 'text';
    
    // Register observation with socket
    registerObservation(token, ep, path, format, mockSocket);
    
    // Deregister observation
    const result = deregisterObservation(token);
    
    expect(result).toBe(true);
    expect(mockSocket.close).toHaveBeenCalled();
  });

  test('should cleanup all observations and close all sockets', () => {
    const mockSocket2 = {
      closed: false,
      close: jest.fn(() => {
        mockSocket2.closed = true;
      })
    };
    
    // Register multiple observations
    registerObservation('token-1', 'ep1', '/path1', 'text', mockSocket);
    registerObservation('token-2', 'ep2', '/path2', 'json', mockSocket2);
    
    // Cleanup all observations
    cleanup();
    
    // Verify all sockets were closed
    expect(mockSocket.close).toHaveBeenCalled();
    expect(mockSocket2.close).toHaveBeenCalled();
    
    // Verify observations are cleared
    expect(getObservation('token-1')).toBeNull();
    expect(getObservation('token-2')).toBeNull();
  });
  
  test('should handle cleanup gracefully when socket close throws error', () => {
    const faultySocket = {
      close: jest.fn(() => {
        throw new Error('Socket close error');
      })
    };
    
    // Register observation with faulty socket
    registerObservation('token-error', 'ep', '/path', 'text', faultySocket);
    
    // Cleanup should not throw error
    expect(() => cleanup()).not.toThrow();
    
    // Verify socket close was attempted
    expect(faultySocket.close).toHaveBeenCalled();
  });
});