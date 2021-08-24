import Version from './version'

describe('Version ', () => {
  it('should return a semver string', () => {
    expect(Version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/)
  })
})

