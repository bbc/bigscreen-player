## What is CDN failover?
When a user is playing video/audio and an error occurs we want playback to recover using different CDN.

### When is it triggered?
Few reasons why errors can happen when playback is attempted:
- Loss of network/low network 
- Loss of connection to a particular CDN 
- Missing segments in manifest
- Device specific fatal errors 

_Note: CDN Failover is not attempted if the error occurs in last 60 secs of static (on demand) content_

## Standard Failover - On all devices/playback strategies 

### Buffering timeout Errors
Some potential causes:
- Loss of Network
- Internal error not reported by device browser

#### Errors at the start of the playback 

1. Bigscreen Player has been initialised and is in WAITING state
1. CDN failover is attempted after 30 secs 

#### Errors during playback 

1. Playback strategy reports waiting event
1. Bigscreen Player is in WAITING state
1. CDN failover is attempted after 20 secs

_**This can be replicated by network throttling. We usually use very low setting of 12 kb/s to trigger buffering.**_

### FATAL Errors
Some potential causes:
- Loss of CDN, unavailable CDN
- Corrupted stream
- Issue with the device browser

1. Playback strategy reports error event
1. Bigscreen Player is in WAITING state
1. CDN failover is attempted after 5 secs 

_**This can be replicated by blocking CDN in the inspect debug tool.**_

## Seamless Failover - Only on  MSE Strategy Devices 

We provide dash.js with all the `urls` provided. dash.js will switch CDN 'seamlessly' if it detects an issue, which may not always result in a WAITING event being throw.

_**This can be replicated by blocking CDN in the inspect debug tool**_