jest.mock('../../server/transport/coapClient');
jest.mock('../../server/transport/mqttClient');
jest.mock('../../server/transport/sharedEmitter');
jest.mock('../../server/clientRegistry');
jest.mock('../../server/observationRegistry');
jest.mock('../../utils/payloadCodec');

const {
  getRequest,
  putRequest,
  postRequest,
  createRequest,
  discoveryRequest
} = require('../../server/resourceClient');

const coapClient = require('../../server/transport/coapClient');
const PayloadCodec = require('../../utils/payloadCodec');
const { getClient } = require('../../server/clientRegistry');
const sharedEmitter = require('../../server/transport/sharedEmitter');

describe('resourceClient.js', () => {
  const mockEp = 'testClient';
  const mockPath = '/3/0/0';
  const mockPayload = { resourceId: 0, value: 'test' };

  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockReturnValue({
      ep: mockEp,
      protocol: 'coap',
      address: 'localhost',
      port: 5683,
    });

    PayloadCodec.encode.mockImplementation((data, format) => Buffer.from(JSON.stringify(data)));
    PayloadCodec.decode.mockImplementation((payload, format) => JSON.parse(payload.toString()));
    coapClient.sendCoapRequest.mockResolvedValue({
      payload: Buffer.from(JSON.stringify({ response: 'ok' })),
      token: Buffer.from('01', 'hex'),
    });
  });

  test('getRequest() sends a GET request and returns decoded response', async () => {
    const result = await getRequest(mockEp, mockPath, 'text');

    expect(coapClient.sendCoapRequest).toHaveBeenCalled();
    expect(result).toHaveProperty('payload.response', 'ok');
    expect(sharedEmitter.emit).toHaveBeenCalledWith('response', expect.objectContaining({
      method: 'GET',
      ep: mockEp,
      path: mockPath
    }));
  });

  test('putRequest() sends a PUT request with encoded payload', async () => {
    const result = await putRequest(mockEp, mockPath, mockPayload, 'text');

    expect(PayloadCodec.encode).toHaveBeenCalledWith(mockPayload, 'text/plain');
    expect(coapClient.sendCoapRequest).toHaveBeenCalled();
    expect(result.payload).toHaveProperty('response', 'ok');
  });

  test('postRequest() sends a POST request with encoded payload', async () => {
    const result = await postRequest(mockEp, mockPath, mockPayload, 'text');

    expect(PayloadCodec.encode).toHaveBeenCalled();
    expect(result.payload).toHaveProperty('response', 'ok');
  });

  test('createRequest() sends a POST to create resource', async () => {
    const result = await createRequest(mockEp, '/3', mockPayload, 'text');

    expect(result.payload).toHaveProperty('response', 'ok');
  });

  test('discoveryRequest() sends a GET to /.well-known/core', async () => {
    const result = await discoveryRequest(mockEp);

    expect(result.path).toBe('/.well-known/core');
    expect(result.payload).toHaveProperty('response', 'ok');
  });

  test('startObserveRequest() sends an observe GET request', async () => {
    const { startObserveRequest } = require('../../server/resourceClient');

    const result = await startObserveRequest(mockEp, mockPath, 0, 'text');

    expect(coapClient.sendCoapRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: 'coap',
        address: 'localhost',
        port: 5683,
        ep: mockEp
      }),
      'GET',
      mockPath,
      null,
      '',
      expect.objectContaining({
        observe: 0,
        format: 'text/plain'
      })
    );
    expect(result).toMatchObject({
      ep: mockEp,
      path: mockPath,
      format: 'text',
    });

    // Check specifically for the presence of `token`
    expect(result).toHaveProperty('token');

  });

  test('stopObserveRequest() sends a GET request to cancel observation', async () => {
    const { stopObserveRequest } = require('../../server/resourceClient');

    const result = await stopObserveRequest(mockEp, mockPath, 1, 'text');
    console.log(result)
    expect(coapClient.sendCoapRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: 'coap',
        address: 'localhost',
        port: 5683,
        ep: mockEp
      }),
      'GET',
      mockPath,
      null,
      '',
      expect.objectContaining({
        observe: 1,
        format: 'text/plain'
      })
    );
    expect(result).toMatchObject({
      ep: mockEp,
      path: mockPath,
      format: 'text',
    });

    // Check specifically for the presence of `token`
    expect(result).toHaveProperty('token');
  });

  test('throws if client not found', async () => {
    getClient.mockReturnValue(undefined);

    await expect(getRequest('unknownClient', mockPath, 'text'))
      .rejects.toMatch('Client for ep unknownClient not found');
  });

  test('throws on encoding failure', async () => {
    PayloadCodec.encode.mockImplementationOnce(() => { throw new Error('encode error'); });

    await expect(putRequest(mockEp, mockPath, mockPayload, 'text'))
      .rejects.toMatch('Failed to encode payload: encode error');
  });

  test('throws on decoding failure', async () => {
    PayloadCodec.decode.mockImplementationOnce(() => { throw new Error('decode error'); });

    await expect(getRequest(mockEp, mockPath, 'text'))
      .rejects.toMatch('Failed to decode payload: decode error');
  });
});
