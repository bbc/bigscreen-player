/* eslint-disable*/
define('testdata/hlsmanifests',
  [
  ],
 function () {
   'use strict';
   return function HlsManifests () {
     var slidingWindowString = '#EXTM3U\n' +
                                '#EXT-X-VERSION:2\n' +
                                '## Created with Unified Streaming Platform(version=1.7.9)\n' +
                                '#EXT-X-MEDIA-SEQUENCE:179532414\n' +
                                '#EXT-X-TARGETDURATION:8\n' +
                                '#USP-X-TIMESTAMP-MAP:MPEGTS=2003059584,LOCAL=2015-07-07T08:55:10Z\n' +
                                '#EXT-X-PROGRAM-DATE-TIME:2015-07-07T08:55:10Z\n' +
                                '#EXTINF:18.98, no desc\n' +
                                'content-audio_2=96000-video=1374000-179532414.ts\n' +
                                '#EXTINF:4, no desc\n' +
                                'content-audio_2=96000-video=1374000-179532414.ts\n' +
                                '#EXTINF:2.68, no desc\n' +
                                'content-audio_2=96000-video=1374000-179532414.ts\n' +
                                '#EXTINF:6.50, no desc\n' +
                                'content-audio_2=96000-video=1374000-179532414.ts\n';

      var invalidDateString = '#EXTM3U\n' +
                              '#EXT-X-VERSION:2\n' +
                              '## Created with Unified Streaming Platform(version=1.7.9)\n' +
                              '#EXT-X-MEDIA-SEQUENCE:179532414\n' +
                              '#EXT-X-TARGETDURATION:8\n' +
                              '#USP-X-TIMESTAMP-MAP:MPEGTS=2003059584,LOCAL=2015-07-07T08:55:10Z\n' +
                              '#EXT-X-PROGRAM-DATE-TIME:invaliddatetime\n' +
                              '#EXTINF:8, no desc\n' +
                              'content-audio_2=96000-video=1374000-179532414.ts\n';

      function slidingWindow() {
        return slidingWindowString;
      }
      function invalidDate() {
        return invalidDateString;
      }
     return {
       slidingWindow: slidingWindow,
       invalidDate: invalidDate
     };
   };
 });
