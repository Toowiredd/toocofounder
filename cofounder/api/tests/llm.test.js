import { expect } from 'chai';
import { llm_fn } from '../system/functions/op/llm.js';

describe('LLM Function Tests', () => {
  it('should interact correctly with the locally hosted AI model', async () => {
    const model = 'local-model';
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how can I assist you today?' }
    ];
    const response = await llm_fn({ model, messages });
    expect(response).to.have.property('text');
    expect(response.text).to.be.a('string');
  });
});
