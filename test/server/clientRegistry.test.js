const {
  registerClient,
  getClient,
  updateClient,
  deregisterClientByLocation,
  listClients
} = require('../../server/clientRegistry');

describe('Client Registry', () => {
  const ep = 'client123';
  const info = {
    address: '127.0.0.1',
    port: 5683,
    location: '/rd/001',
    lifetime: 60,
    binding: 'U'
  };

  beforeEach(() => {
    // Clear and re-register before each test
    registerClient(ep, { ...info });
  });

  test('registerClient and getClient', () => {
    const result = getClient(ep);
    expect(result).toEqual(info);
  });

  test('updateClient with valid location', () => {
    const newInfo = { lifetime: 120 };
    const updatedEp = updateClient('/rd/001', newInfo);

    expect(updatedEp).toBe(ep);
    const updatedClient = getClient(ep);
    expect(updatedClient.lifetime).toBe(120);
    expect(updatedClient.address).toBe(info.address); // unchanged
  });

  test('updateClient with invalid location returns null', () => {
    const result = updateClient('/rd/unknown', { lifetime: 200 });
    expect(result).toBeNull();
  });

  test('deregisterClientByLocation removes the client', () => {
    const removedEp = deregisterClientByLocation('/rd/001');
    expect(removedEp).toBe(ep);
    expect(getClient(ep)).toBeUndefined();
  });

  test('deregisterClientByLocation with unknown location returns null', () => {
    const result = deregisterClientByLocation('/rd/doesnotexist');
    expect(result).toBeNull();
  });

  test('listClients returns all registered clients', () => {
    const clients = listClients();
    expect(Array.isArray(clients)).toBe(true);
    expect(clients).toHaveLength(1);
    expect(clients[0]).toMatchObject({ ep, ...info });
  });
});
