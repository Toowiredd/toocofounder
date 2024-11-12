import { execSync } from 'child_process';
import { expect } from 'chai';
import { readFileSync } from 'fs';

describe('Dependencies Installation', () => {
  it('should have all dependencies installed correctly', () => {
    const packageJson = JSON.parse(readFileSync('cofounder/api/package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies);
    const devDependencies = Object.keys(packageJson.devDependencies);

    dependencies.forEach(dep => {
      const result = execSync(`npm list ${dep}`).toString();
      expect(result).to.include(dep);
    });

    devDependencies.forEach(dep => {
      const result = execSync(`npm list ${dep}`).toString();
      expect(result).to.include(dep);
    });
  });

  it('should have localai dependency installed', () => {
    const result = execSync('npm list localai').toString();
    expect(result).to.include('localai');
  });

  it('should have jest dependency installed', () => {
    const result = execSync('npm list jest').toString();
    expect(result).to.include('jest');
  });
});
