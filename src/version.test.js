import Version from './version'

describe('Version ', function () {
  it('should return a semver string', function () {
    expect(Version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
  });
});

