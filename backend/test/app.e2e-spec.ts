import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyApiPrefix } from './../src/bootstrap/api-prefix';
import { applyValidationPipe } from './../src/bootstrap/validation-pipe';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyApiPrefix(app);
    applyValidationPipe(app);
    await app.init();
  });

  it('/api (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');

    expect(response.headers['x-trace-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('/api (GET) propagates upstream trace id', async () => {
    const traceId = 'upstream-trace-id';
    const response = await request(app.getHttpServer())
      .get('/api')
      .set('x-request-id', traceId)
      .expect(200)
      .expect('Hello World!');

    expect(response.headers['x-trace-id']).toBe(traceId);
  });

  afterEach(async () => {
    await app.close();
  });
});
