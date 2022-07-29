import { test, expect } from '@playwright/test'


async function playbackInitialised(page) {
  await page.waitForFunction(() => window.bsp_player !== undefined)
}

test.describe('failover', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUtil: 'domcontentloaded' })

    page.on('console', msg => console.log(msg.text()))

    let windowType = 'staticWindow';
    let enableSubtitles = false;

    let minimalData = {
      initialPlaybackTime: 0,
      media: {
        playerSettings: {
          bufferingTimeout: 4000
        },
        captions: [],
        type: 'application/dash+xml',
        mimeType: 'video/mp4',
        kind: 'video',
        urls: [{
          // Content from DASH IF testing assests (used in their reference player)
          // https://reference.dashif.org/dash.js/v2.9.2/samples/dash-if-reference-player/index.htm
          url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
          cdn: 'dash.akamaized.net'
        },
        {
          // Content from DASH IF testing assests (used in their reference player)
          // https://reference.dashif.org/dash.js/v2.9.2/samples/dash-if-reference-player/index.htm
          url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
          cdn: 'dash.akamaized.net2'
        }]
      }
    };
    page.evaluate(([windowType, enableSubtitles, minimalData]) => {

      // So far the only way to determine failover has happened...
      function failoverPlugin() {
        return {
          onErrorHandled: (evt) => {
            if (evt.status === 'failover') {
              document.dispatchEvent(new Event('failover'))
              console.error('failover happening... emitting event' + JSON.stringify(evt))
            }
          }
        }
      }

      let plugin = failoverPlugin()

      window.bsp_player.init(window.playbackElement, minimalData, windowType, enableSubtitles,
        {
          onSuccess: function () {

            window.bsp_player.registerPlugin(plugin);

            window.bsp_player.toggleDebug();
            window.bsp_player.play();
          },
          onError: function () {
            window.bsp_player.toggleDebug();
          }
        });
    }, [windowType, enableSubtitles, minimalData])

    await playbackInitialised(page)
  })

  test('happens after 4 second buffering timeout', async ({ page }) => {
    // Chrome Debug Tools!
    const client = await page.context().newCDPSession(page)
    await client.send('Network.enable')

    // Play for a bit
    await page.waitForFunction(() => !(window.bsp_player && window.bsp_player.isPaused()))
    await page.waitForFunction(() => window.bsp_player.getCurrentTime() > 1)

    // Introduce failure from a slow network
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      uploadThroughput: -1,
      latency: 0,
      downloadThroughput: 25
    })

    // Wait for the dispatched event - page.waitForEvent only works on playwright defined ones...
    await page.evaluate(evt => {
      return new Promise(callback => document.addEventListener(evt, callback, { once: true }))
    }, 'failover');

    // Bring back the network
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      uploadThroughput: -1,
      latency: 0,
      downloadThroughput: -1
    })

    // Wait for some more stable time...
    await page.waitForFunction(() => window.bsp_player.getCurrentTime() > 10)
    const time = await page.evaluate(() => Promise.resolve(window.bsp_player.getCurrentTime()))
    expect(time).toBeGreaterThan(10)
  })
})
