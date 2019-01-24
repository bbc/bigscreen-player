define('bigscreenplayer/parsers/manifestparser',
  [
    'bigscreenplayer/utils/timeutils'
  ],
 function (TimeUtils) {
   'use strict';
   return function ManifestParser (manifest, type, dateWithOffset) {
     function parseMPD () {
       try {
         var mpd = manifest.getElementsByTagName('MPD')[0];

         var availabilityStartTime = Date.parse(mpd.getAttribute('availabilityStartTime'));

         var tsbdAttr = mpd.getAttribute('timeShiftBufferDepth');
         var timeShiftBufferDepth = tsbdAttr && TimeUtils.durationToSeconds(tsbdAttr);

       // Getting zeroth SegmentTemplate may grab either audio or video
       // data. This shouldn't matter as we only use the factor of
       // duration/timescale, which is the same for both.
         var segmentTemplate = manifest.getElementsByTagName('SegmentTemplate')[0];
         var timescale = parseFloat(segmentTemplate.getAttribute('timescale'));
         var duration = parseFloat(segmentTemplate.getAttribute('duration'));
         var oneSegment = 1000 * duration / timescale;

         if (availabilityStartTime && oneSegment) {
           var windowEndTime = dateWithOffset - (timeShiftBufferDepth ? availabilityStartTime : 0) - oneSegment;
           var windowStartTime = timeShiftBufferDepth ? windowEndTime - (timeShiftBufferDepth * 1000) : availabilityStartTime;
           var timeCorrection = timeShiftBufferDepth ? windowStartTime / 1000 : 0;
         } else {
           return {error: 'Error parsing DASH manifest attributes'};
         }

         return {
           windowStartTime: windowStartTime,
           windowEndTime: windowEndTime,
           timeCorrection: timeCorrection
         };
       } catch (e) {
         return {error: 'Error parsing DASH manifest'};
       }
     }

     function parseM3U8 () {
       var windowStartTime = getM3U8ProgramDateTime(manifest);
       var duration = getM3U8WindowSizeInSeconds(manifest);

       if (windowStartTime && duration) {
         var windowEndTime = windowStartTime + duration * 1000;
       } else {
         return {error: 'Error parsing HLS manifest'};
       }
       return {
         windowStartTime: windowStartTime,
         windowEndTime: windowEndTime
       };
     }

     function getM3U8ProgramDateTime (data) {
       var programDateTime;
       var match = /^#EXT-X-PROGRAM-DATE-TIME:(.*)$/m.exec(data);
       if (match) {
         var parsedDate = Date.parse(match[1]);
         if (!isNaN(parsedDate)) {
           programDateTime = parsedDate;
         }
       }
       return programDateTime;
     }

     function getM3U8WindowSizeInSeconds (data) {
       var regex = /#EXTINF:(\d+(?:\.\d+)?)/g;
       var matches = regex.exec(data);
       var result = 0;
       while (matches) {
         result += (+matches[1]);
         matches = regex.exec(data);
       }
       return Math.floor(result);
     }

     function parse () {
       if (type === 'mpd') {
         return parseMPD();
       } else if (type === 'm3u8') {
         return parseM3U8();
       }
     }

     return {
       parse: parse
     };
   };
 });
