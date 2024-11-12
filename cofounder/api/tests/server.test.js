import { expect } from 'chai';
import request from 'supertest';
import app from '../server.js';

describe('AI Model Integration Tests', () => {
  it('should call the locally hosted AI model and return expected response', async () => {
    const response = await request(app)
      .post('/api/locallai/inference')
      .send({
        model: 'local-model',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how can I assist you today?' }
        ],
        stream: false
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('text');
    expect(response.body.text).to.be.a('string');
  });
});
