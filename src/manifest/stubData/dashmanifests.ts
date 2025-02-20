export const DASH_MANIFEST_STRINGS = {
  BAD_ATTRIBUTES: `<?xml version="1.0" encoding="UTF-8"?>
  <MPD
  type="invalid"
  availabilityStartTime="not-valid-iso-time">
    <Period start="PT0S">
      <AdaptationSet startWithSAP="2" segmentAlignment="true" par="16:9" id="1" contentType="video" mimeType="video/mp4" >
        <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
            <SegmentTemplate startNumber="402266486" presentationTimeOffset="308940660480" timescale="invalid" duration="invalid" media="$RepresentationID$/$Number%06d$.m4s" initialization="$RepresentationID$/IS.mp4" />
        <Representation id="1920x1080i25" codecs="avc3.640028" height="1080" width="1920" frameRate="25" scanType="interlaced" bandwidth="8606480" />
      </AdaptationSet>
    </Period>
  </MPD>`,
  TIMESHIFT_PTO: `<?xml version="1.0" encoding="UTF-8"?>
  <MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  type="dynamic"
  publishTime="2018-12-01T00:28:35Z"
  minimumUpdatePeriod="PT30S"
  availabilityStartTime="2024-11-06T23:45:14.56Z"
  timeShiftBufferDepth="PT6H"
  minBufferTime="PT4S"
  suggestedPresentationDelay="PT20S"
  profiles="urn:mpeg:dash:profile:isoff-live:2011">
    <Period start="PT0S" id="1">
      <AdaptationSet id="1" contentType="audio" mimeType="audio/mp4" segmentAlignment="true" audioSamplingRate="48000" codecs="mp4a.40.2" startWithSAP="1" group="1" lang="en">
      <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
      <InbandEventStream schemeIdUri="urn:mpeg:dash:event:2012" value="1"/>
      <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
      <Representation id="audio1" bandwidth="128000">
        <SegmentTemplate initialization="audio1/segment.init" media="audio1/$Number$.m4s" startNumber="450764760" timescale="48000" duration="184320" presentationTimeOffset="83084960378880"/>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="2" contentType="video" mimeType="video/mp4" segmentAlignment="true" sar="1:1" startWithSAP="1" group="2" par="16:9">
      <InbandEventStream schemeIdUri="urn:mpeg:dash:event:2012" value="1"/>
      <Representation id="video1" bandwidth="2812032" width="960" height="540" codecs="avc3.64001F" frameRate="50" scanType="progressive">
        <SegmentTemplate initialization="video1/segment.init" media="video1/$Number$.m4s" startNumber="450764760" timescale="50" duration="192" presentationTimeOffset="86546833728"/>
      </Representation>
      <Representation id="video2" bandwidth="5070016" width="1280" height="720" codecs="avc3.640020" frameRate="50" scanType="progressive">
        <SegmentTemplate initialization="video2/segment.init" media="video2/$Number$.m4s" startNumber="450764760" timescale="50" duration="192" presentationTimeOffset="86546833728"/>
      </Representation>
    </AdaptationSet>
    </Period>
  </MPD>`,
  PTO_NO_TIMESHIFT: `<?xml version="1.0" encoding="UTF-8"?>
  <MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  type="dynamic"
  publishTime="2018-12-01T00:28:35Z"
  minimumUpdatePeriod="PT30S"
  availabilityStartTime="2024-11-06T23:45:14.56Z"
  minBufferTime="PT4S"
  suggestedPresentationDelay="PT20S"
  profiles="urn:mpeg:dash:profile:isoff-live:2011">
    <Period start="PT0S" id="1">
      <AdaptationSet id="1" contentType="audio" mimeType="audio/mp4" segmentAlignment="true" audioSamplingRate="48000" codecs="mp4a.40.2" startWithSAP="1" group="1" lang="en">
      <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
      <InbandEventStream schemeIdUri="urn:mpeg:dash:event:2012" value="1"/>
      <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
      <Representation id="audio1" bandwidth="128000">
        <SegmentTemplate initialization="audio1/segment.init" media="audio1/$Number$.m4s" startNumber="450764760" timescale="48000" duration="184320" presentationTimeOffset="83084960378880"/>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="2" contentType="video" mimeType="video/mp4" segmentAlignment="true" sar="1:1" startWithSAP="1" group="2" par="16:9">
      <InbandEventStream schemeIdUri="urn:mpeg:dash:event:2012" value="1"/>
      <Representation id="video1" bandwidth="2812032" width="960" height="540" codecs="avc3.64001F" frameRate="50" scanType="progressive">
        <SegmentTemplate initialization="video1/segment.init" media="video1/$Number$.m4s" startNumber="450764760" timescale="50" duration="192" presentationTimeOffset="86546833728"/>
      </Representation>
      <Representation id="video2" bandwidth="5070016" width="1280" height="720" codecs="avc3.640020" frameRate="50" scanType="progressive">
        <SegmentTemplate initialization="video2/segment.init" media="video2/$Number$.m4s" startNumber="450764760" timescale="50" duration="192" presentationTimeOffset="86546833728"/>
      </Representation>
    </AdaptationSet>
    </Period>
  </MPD>`,
  TIMESHIFT_NO_PTO: `<?xml version="1.0" encoding="UTF-8"?>
  <MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xmlns:cenc="urn:mpeg:cenc:2013"
  xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
  type="dynamic"
  publishTime="2018-12-01T00:28:35Z"
  minimumUpdatePeriod="PT30S"
  availabilityStartTime="1970-01-01T00:01:00Z"
  timeShiftBufferDepth="PT2H"
  minBufferTime="PT4S"
  suggestedPresentationDelay="PT20S"
  profiles="urn:mpeg:dash:profile:isoff-live:2011">
    <Period start="PT0S" id="1">
      <AdaptationSet mimeType="video/mp4" frameRate="30/1" segmentAlignment="true" subsegmentAlignment="true" startWithSAP="1" subsegmentStartsWithSAP="1" bitstreamSwitching="false">
        <SegmentTemplate timescale="200" duration="768" startNumber="1543623951"/>
        <Representation id="1" width="1280" height="720" bandwidth="2000000" codecs="avc1.4d401f">
          <SegmentTemplate duration="768" startNumber="1543623951" media="dash-2Mbps-$Number$.mp4" initialization="dash-2Mbps-init.mp4"/>
        </Representation>
        <Representation id="2" width="640" height="360" bandwidth="800000" codecs="avc1.4d401e">
          <SegmentTemplate duration="768" startNumber="1543623951" media="dash-800kbps-$Number$.mp4" initialization="dash-800kbps-init.mp4"/>
        </Representation>
      </AdaptationSet>
      <AdaptationSet mimeType="audio/mp4" segmentAlignment="0">
        <SegmentTemplate timescale="48000" media="dash-64kbps-Audio-$Number$.mp4" initialization="dash-64kbps-Audio-init.mp4" duration="232320" startNumber="1543623951"/>
        <Representation id="3" bandwidth="64000" audioSamplingRate="48000" codecs="mp4a.40.2"/>
      </AdaptationSet>
    </Period>
  </MPD>`,
  STATIC_NO_PTO: `<?xml version="1.0" encoding="UTF-8"?>
  <MPD
    xmlns="urn:mpeg:dash:schema:mpd:2011"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
    profiles="urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014"
    type="static"
    mediaPresentationDuration="PT5M3.36S"
    minBufferTime="PT10S"
    maxSegmentDuration="PT4S"
  >
    <Period id="1" start="PT0S">
      <AdaptationSet id="1" contentType="audio" mimeType="audio/mp4" segmentAlignment="true" audioSamplingRate="48000" codecs="mp4a.40.2" startWithSAP="1" group="1" lang="en">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
        <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
        <Representation id="1" bandwidth="128000">
          <SegmentTemplate initialization="dash-128kbps-audio-init.mp4" media="dash-128kbps-audio-$Number$.mp4" timescale="48000" duration="184320"/>
        </Representation>
      </AdaptationSet>
      <AdaptationSet id="2" contentType="video" mimeType="video/mp4" segmentAlignment="true" sar="1:1" startWithSAP="1" group="2" par="16:9">
        <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
        <Representation id="2" bandwidth="1604032" width="960" height="540" codecs="avc3.4D401F" frameRate="25" scanType="progressive">
          <SegmentTemplate initialization="dash-2Mbps-video-init.m4s" media="dash-2Mbps-video-$Number$.m4s" timescale="50" duration="96"/>
        </Representation>
        <Representation id="3" bandwidth="2812032" width="960" height="540" codecs="avc3.64001F" frameRate="50" scanType="progressive">
          <SegmentTemplate initialization="dash-3Mbps-video-init.m4s" media="dash-3Mbps-video-$Number$.m4s" timescale="50" duration="192"/>
        </Representation>
      </AdaptationSet>
    </Period>
  </MPD>`,
  STATIC_PTO: `<?xml version="1.0" encoding="UTF-8"?>
  <MPD
    xmlns="urn:mpeg:dash:schema:mpd:2011"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
    profiles="urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014"
    type="static"
    mediaPresentationDuration="PT5M3.36S"
    minBufferTime="PT10S"
    maxSegmentDuration="PT4S"
  >
    <Period id="1" start="PT0S">
      <AdaptationSet id="1" contentType="audio" mimeType="audio/mp4" segmentAlignment="true" audioSamplingRate="48000" codecs="mp4a.40.2" startWithSAP="1" group="1" lang="en">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
        <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
        <Representation id="1" bandwidth="128000">
          <SegmentTemplate initialization="dash-128kbps-audio-init.mp4" media="dash-128kbps-audio-$Number$.mp4" startNumber="450764760" timescale="48000" duration="184320" presentationTimeOffset="83084960378880"/>
        </Representation>
      </AdaptationSet>
      <AdaptationSet id="2" contentType="video" mimeType="video/mp4" segmentAlignment="true" sar="1:1" startWithSAP="1" group="2" par="16:9">
        <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
        <Representation id="2" bandwidth="1604032" width="960" height="540" codecs="avc3.4D401F" frameRate="25" scanType="progressive">
          <SegmentTemplate initialization="dash-2Mbps-video-init.m4s" media="dash-2Mbps-video-$Number$.m4s" startNumber="450764760" timescale="50" duration="96" presentationTimeOffset="86546833728"/>
        </Representation>
        <Representation id="3" bandwidth="2812032" width="960" height="540" codecs="avc3.64001F" frameRate="50" scanType="progressive">
          <SegmentTemplate initialization="dash-3Mbps-video-init.m4s" media="dash-3Mbps-video-$Number$.m4s" startNumber="450764760" timescale="50" duration="192" presentationTimeOffset="86546833728"/>
        </Representation>
      </AdaptationSet>
    </Period>
  </MPD>`,
}

const DashManifests = Object.fromEntries(
  Object.entries(DASH_MANIFEST_STRINGS).map(([currentManifestName, currentManifestString]) => [
    currentManifestName,
    () => new DOMParser().parseFromString(currentManifestString, "application/xml"),
  ])
)

export default DashManifests
