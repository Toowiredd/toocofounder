import { expect } from 'chai';
import dotenv from 'dotenv';

dotenv.config();

describe('Environment Variables Configuration', () => {
  it('should have LOCALAI_BASE_URL set correctly', () => {
    expect(process.env.LOCALAI_BASE_URL).to.equal('http://localhost:5000');
  });

  it('should have LOCALAI_API_KEY set correctly', () => {
    expect(process.env.LOCALAI_API_KEY).to.equal('your_local_ai_api_key');
  });

  it('should not have OPENAI_API_KEY set', () => {
    expect(process.env.OPENAI_API_KEY).to.be.undefined;
  });

  it('should not have ANTHROPIC_API_KEY set', () => {
    expect(process.env.ANTHROPIC_API_KEY).to.be.undefined;
  });
});
