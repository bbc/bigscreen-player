**This page lists the areas that are to be considered for testing Bigscreen Player changes**

Different Streaming types should be considered - MP4, HLS, DASH - Audio and Video
* Subtitles (currently on demand only)
* CDN Failover
* Tearing down playback and immediately starting something new (e.g 'autoplay' features)
* Soak testing (i.e. play for a long period of time)
* End of playback 
* Seeking and related UI (e.g. scrub bar, thumbnails)
* Buffering UI
* Adaptive Bit Rate (ABR)
* Any other application behaviour driven by Bigscreen Player events (e.g. stats)

## Live Playback specific areas
Different types of live playback capability should be considered - **Playable, Restartable, Seekable**

### Sliding Windows
1. Live Restart Curtain 
2. Manifest Parsing 
* Watch form Live
* Start from a given point in the window (a.k.a Live restart)
* Watch from the start of the window
* Auto resume at the start of the window
* Seeking 

### Growing Windows
1. Live Restart Curtain 
2. Manifest Parsing 
* Watch from Live
* Live restart
* Seeking 
3. End of stream (Ended Event)
