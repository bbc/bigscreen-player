/* eslint-disable*/
define('testdata/dashmanifests',
  [
  ],
 function () {
   'use strict';
   return function DashManifests () {
     var slidingWindowString = `<?xml version="1.0" encoding="utf-8"?>
                          <MPD
                            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                            xmlns="urn:mpeg:dash:schema:mpd:2011"
                            xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
                            type="dynamic"
                            availabilityStartTime="1970-01-01T00:01:00Z"
                            publishTime="2018-12-13T09:00:41.017742Z"
                            minimumUpdatePeriod="PT8H"
                            timeShiftBufferDepth="PT2H"
                            suggestedPresentationDelay="PT45S"
                            maxSegmentDuration="PT4S"
                            minBufferTime="PT10S"
                            profiles="urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014">
                            <UTCTiming
                              schemeIdUri="urn:mpeg:dash:utc:http-iso:2014"
                              value="https://time.akamai.com/?iso" />
                            <Period
                              id="1"
                              start="PT0S">
                              <BaseURL>dash/</BaseURL>
                              <AdaptationSet
                                group="1"
                                contentType="audio"
                                lang="en"
                                minBandwidth="128000"
                                maxBandwidth="128000"
                                segmentAlignment="true"
                                audioSamplingRate="48000"
                                mimeType="audio/mp4"
                                codecs="mp4a.40.2"
                                startWithSAP="1">
                                <AudioChannelConfiguration
                                  schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011"
                                  value="2">
                                </AudioChannelConfiguration>
                                <Role
                                  schemeIdUri="urn:mpeg:dash:role:2011"
                                  value="main">
                                </Role>
                                <SegmentTemplate
                                  timescale="48000"
                                  duration="184320"
                                  initialization="channel-$RepresentationID$.dash"
                                  media="channel-$RepresentationID$-$Number$.m4s">
                                </SegmentTemplate>
                                <Representation
                                  id="pa4=128000"
                                  bandwidth="128000">
                                </Representation>
                              </AdaptationSet>
                              <AdaptationSet
                                group="2"
                                contentType="video"
                                par="16:9"
                                minBandwidth="827008"
                                maxBandwidth="5070016"
                                maxWidth="1280"
                                maxHeight="720"
                                minFrameRate="25"
                                maxFrameRate="50"
                                segmentAlignment="true"
                                sar="1:1"
                                mimeType="video/mp4"
                                startWithSAP="1">
                                <Role
                                  schemeIdUri="urn:mpeg:dash:role:2011"
                                  value="main">
                                </Role>
                                <Representation
                                  id="video=827008"
                                  bandwidth="827008"
                                  width="704"
                                  height="396"
                                  frameRate="25"
                                  codecs="avc3.4D401E"
                                  scanType="progressive">
                                  <SegmentTemplate
                                    timescale="25"
                                    duration="96"
                                    initialization="channel-$RepresentationID$.dash"
                                    media="channel-$RepresentationID$-$Number$.m4s">
                                  </SegmentTemplate>
                                </Representation>
                                <Representation
                                  id="video=1604032"
                                  bandwidth="1604032"
                                  width="960"
                                  height="540"
                                  frameRate="25"
                                  codecs="avc3.4D401F"
                                  scanType="progressive">
                                  <SegmentTemplate
                                    timescale="25"
                                    duration="96"
                                    initialization="channel-$RepresentationID$.dash"
                                    media="channel-$RepresentationID$-$Number$.m4s">
                                  </SegmentTemplate>
                                </Representation>
                              </AdaptationSet>
                            </Period>
                          </MPD>`;
      function slidingWindow() {
        var parser = new DOMParser();
        return parser.parseFromString(slidingWindowString, "application/xml");
      }
     return {
       slidingWindow: slidingWindow
     };
   };
 });
