import { expect } from 'chai';
import request from 'supertest';
import app from '../server.js';

describe('End-to-End Tests', () => {
  it('should validate the overall functionality of the system with the locally hosted AI model', async () => {
    // Test the /api/ping endpoint
    let response = await request(app).get('/api/ping');
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('message', 'pong');

    // Test the /api/projects/list endpoint
    response = await request(app).get('/api/projects/list');
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('projects').that.is.an('array');

    // Test the /api/projects/new endpoint
    response = await request(app)
      .post('/api/projects/new')
      .send({
        description: 'Test project description',
        aesthetics: 'Test project aesthetics'
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('project').that.is.a('string');

    // Test the /api/utils/transcribe endpoint
    response = await request(app)
      .post('/api/utils/transcribe')
      .send({
        audio: 'base64_encoded_audio'
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('transcript').that.is.a('string');

    // Test the /api/locallai/inference endpoint
    response = await request(app)
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
    expect(response.body).to.have.property('text').that.is.a('string');
  });
});
