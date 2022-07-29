const config = {
  testDir: '../',
  webServer: {
    command: 'npm run start:integration',
    port: 10001,
    reuseExistingServer: false
  },
  use: {
    baseURL: 'http://localhost:10001',
    launchOptions: {
      args: ['--disable-web-security']
    },
    ignoreHTTPSErrors: true,
    headless: false,
    channel: 'chrome',
    browserName: 'chromium',
  }
};

export default config

    