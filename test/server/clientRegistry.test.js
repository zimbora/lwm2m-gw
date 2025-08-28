const {
  registerClient,
  getClient,
  updateClient,
  deregisterClientByLocation,
  listClients,
  updateClientActivity,
  setClientOffline,
  deregisterClient
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
    expect(result).toMatchObject(info); // Use toMatchObject to ignore additional fields
    expect(result).toHaveProperty('lastActivity');
    expect(result).toHaveProperty('registeredAt');
    expect(result).toHaveProperty('offline', false);
  });

  test('updateClient with valid location', () => {
    const newInfo = { lifetime: 120 };
    const updatedEp = updateClient('/rd/001', newInfo);

    expect(updatedEp).toBe(ep);
    const updatedClient = getClient(ep);
    expect(updatedClient.lifetime).toBe(120);
    expect(updatedClient.address).toBe(info.address); // unchanged
    expect(updatedClient.offline).toBe(false); // Should be set to false on update
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

  test('updateClientActivity updates lastActivity and clears offline', () => {
    // First set the client offline
    setClientOffline(ep);
    let client = getClient(ep);
    expect(client.offline).toBe(true);

    // Then update activity
    const result = updateClientActivity(ep);
    expect(result).toBe(true);
    
    client = getClient(ep);
    expect(client.offline).toBe(false);
    expect(client.lastActivity).toBeGreaterThan(Date.now() - 1000); // Recent activity
  });

  test('updateClientActivity returns false for unknown client', () => {
    const result = updateClientActivity('unknown');
    expect(result).toBe(false);
  });

  test('setClientOffline marks client as offline', () => {
    const result = setClientOffline(ep);
    expect(result).toBe(true);
    
    const client = getClient(ep);
    expect(client.offline).toBe(true);
  });

  test('setClientOffline returns false for unknown client', () => {
    const result = setClientOffline('unknown');
    expect(result).toBe(false);
  });

  test('deregisterClient removes client by endpoint', () => {
    const result = deregisterClient(ep);
    expect(result).toBe(true);
    expect(getClient(ep)).toBeUndefined();
  });

  test('deregisterClient returns false for unknown client', () => {
    const result = deregisterClient('unknown');
    expect(result).toBe(false);
  });
});
