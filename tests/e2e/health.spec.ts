import { test, expect } from '@playwright/test';

test('health endpoint returns status payload', async ({ request }) => {
  const response = await request.get('/api/health');
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
  expect(body).toMatchObject({
    timestamp: expect.any(String),
  });
});
