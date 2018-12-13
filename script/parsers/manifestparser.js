define('bigscreenplayer/parsers/manifestparser',
  [
    'bigscreenplayer/utils/playbackutils'
  ],
 function (Utils) {
   'use strict';
   return function ManifestParser (manifest, type, dateWithOffset) {
     function parseMPD () {
       var mpd = manifest.getElementsByTagName('MPD')[0];

       var availabilityStartTime = Date.parse(mpd.getAttribute('availabilityStartTime'));

       var tsbdAttr = mpd.getAttribute('timeShiftBufferDepth');
       var timeShiftBufferDepth = tsbdAttr && Utils.durationToSeconds(tsbdAttr);

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
       }

       // TODO: correct error handling

       return {
         windowStartTime: windowStartTime,
         windowEndTime: windowEndTime,
         timeCorrection: timeCorrection
       };
     }

     function parse () {
       if (type === 'mpd') {
         return parseMPD();
       }
     }

     return {
       parse: parse
     };
   };
 });
