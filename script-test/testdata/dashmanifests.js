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

      var growingWindowString = `<?xml version="1.0" encoding="UTF-8"?>
                              <MPD 
                              type="dynamic" 
                              xmlns="urn:mpeg:dash:schema:mpd:2011" 
                              xmlns:dvb="urn:dvb:dash-extensions:2014-1" 
                              profiles="urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014" 
                              minBufferTime="PT1.143S" 
                              maxSegmentDuration="PT3.84S" 
                              minimumUpdatePeriod="PT1H"
                              availabilityStartTime="2018-12-13T10:00:00.000Z"  
                              publishTime="2018-12-13T10:00:00.000Z">
                                <!-- BBC Live Webcast Test Stream -->
                                <!-- Email dash@rd.bbc.co.uk -->
                                <!-- Copyright (c) British Broadcasting Corporation MMXVIII.  All rights reserved.-->
                                <!-- This stream is made available for engineering test purposes only. -->
                                <!-- Redistribution and public display are not permitted. -->
                                <ProgramInformation>
                                  <Title>BBC Research and Development Webcast Test Stream - 752 seconds starting at: 2018-12-13T12:15:02.400Z</Title>
                                  <Source>BBC</Source>
                                  <Copyright>(c) British Broadcasting Corporation MMXVIII.  All rights reserved</Copyright>
                                </ProgramInformation>
                                <Period start="PT0S">
                                  <AdaptationSet startWithSAP="2" segmentAlignment="true" par="16:9" id="1" contentType="video" mimeType="video/mp4" >
                                    <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
                                        <SegmentTemplate startNumber="402266486" presentationTimeOffset="308940660480" timescale="200" duration="768" media="$RepresentationID$/$Number%06d$.m4s" initialization="$RepresentationID$/IS.mp4" />
                                    <Representation id="1920x1080i25" codecs="avc3.640028" height="1080" width="1920" frameRate="25" scanType="interlaced" bandwidth="8606480" />
                                    <Representation id="1280x720p50" codecs="avc3.640020" height="720" width="1280" frameRate="50" bandwidth="5447392" scanType="progressive" />
                                    <Representation id="960x540p50" codecs="avc3.64001f" height="540" width="960" frameRate="50" bandwidth="3116240" scanType="progressive" />
                                  </AdaptationSet>
                                  <AdaptationSet startWithSAP="2" segmentAlignment="true" id="4" codecs="mp4a.40.2" audioSamplingRate="48000" contentType="audio" lang="eng" mimeType="audio/mp4" >
                                    <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
                                    <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
                                    <SegmentTemplate startNumber="402266486" presentationTimeOffset="74145758515200" timescale="48000" duration="184320" media="$RepresentationID$/$Number%06d$.m4s" initialization="$RepresentationID$/IS.mp4" />
                                    <Representation id="320kbps-2_0" bandwidth="318808" />
                                    <Representation id="128kbps" bandwidth="126528" />
                                  </AdaptationSet>
                                </Period>
                                <UTCTiming schemeIdUri="urn:mpeg:dash:utc:http-xsdate:2014" value="https://time.akamai.com/?iso"/>
                              </MPD>`;

      function slidingWindow() {
        return getXML(slidingWindowString);
      }
      function growingWindow() {
        return getXML(growingWindowString);
      }
      function getXML(string) {
        var parser = new DOMParser();
        return parser.parseFromString(string, "application/xml");
      }
     return {
       slidingWindow: slidingWindow,
       growingWindow: growingWindow
     };
   };
 });
