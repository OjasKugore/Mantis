import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { setupTestEnvironment, getTestApp } from '../helpers/setup.js';

describe('OpenAPI Swagger UI Documentation Tests (T3.24 – T3.25)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  // T3.24 — GET /docs returns Swagger UI HTML page
  it('T3.24: GET /docs returns Swagger UI HTML page or redirect', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs/',
    });

    expect([200, 302]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.headers['content-type']).toContain('html');
    }
  });

  // T3.25 — GET /docs/json returns OpenAPI 3.0 specification JSON
  it('T3.25: GET /docs/json returns valid OpenAPI specification document', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi || spec.swagger).toBeDefined();
    expect(spec.info?.title).toBe('BugzillaRevamp API');
  });
});
