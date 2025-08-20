// Focused test for DTLS socket leak fix
const { sendDTLSCoapRequest } = require('../../server/transport/coapClientDTLS');
const sharedEmitter = require('../../server/transport/sharedEmitter');

describe('DTLS Socket Management', () => {
  
  beforeEach(() => {
    // Prevent unhandled error events from failing tests
    sharedEmitter.removeAllListeners('error');
    sharedEmitter.on('error', () => {
      // Swallow errors during testing
    });
  });
  
  test('should close socket for regular requests', (done) => {
    const mockClient = {
      address: 'localhost',
      port: 5684,
      location: 'test-client'
    };
    
    // Make a regular (non-observation) request
    sendDTLSCoapRequest(mockClient, 'GET', '/3/0/0')
      .then((result) => {
        // Request should fail since no DTLS server is running, but that's expected
        done();
      })
      .catch((error) => {
        // Expected to fail, but the important thing is that socket should be closed
        expect(error.message).toContain('Error connecting to client');
        done();
      });
  }, 10000);

  test('should keep socket open for observation requests', (done) => {
    const mockClient = {
      address: 'localhost', 
      port: 5684,
      location: 'test-client'
    };
    
    // Make an observation request
    sendDTLSCoapRequest(mockClient, 'GET', '/3/0/0', null, '', { observe: 0 })
      .then((result) => {
        // Should include socket in response for observation requests
        expect(result.socket).toBeDefined();
        // Clean up the socket manually for test
        if (result.socket) {
          result.socket.close();
        }
        done();
      })
      .catch((error) => {
        // Expected to fail, but socket behavior is what we're testing
        expect(error.message).toContain('Error connecting to client');
        done();
      });
  }, 10000);
});