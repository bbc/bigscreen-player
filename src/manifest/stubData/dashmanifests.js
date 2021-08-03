function DashManifests () {
  var slidingWindowString = `<?xml version="1.0" encoding="UTF-8"?>
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
               </MPD>`

  var growingWindowString = `<?xml version="1.0" encoding="UTF-8"?>
               <MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns="urn:mpeg:dash:schema:mpd:2011" 
               xmlns:cenc="urn:mpeg:cenc:2013" 
               xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd" 
               type="dynamic" 
               publishTime="2018-12-01T00:28:35Z" 
               minimumUpdatePeriod="PT30S" 
               availabilityStartTime="2018-12-13T10:00:00.000Z"
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
               </MPD>`

  var badAttributesString = `<?xml version="1.0" encoding="UTF-8"?>
                           <MPD 
                           type="dynamic"
                           availabilityStartTime="not-valid-iso-time">
                             <Period start="PT0S">
                               <AdaptationSet startWithSAP="2" segmentAlignment="true" par="16:9" id="1" contentType="video" mimeType="video/mp4" >
                                 <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main"/>
                                     <SegmentTemplate startNumber="402266486" presentationTimeOffset="308940660480" timescale="invalid" duration="invalid" media="$RepresentationID$/$Number%06d$.m4s" initialization="$RepresentationID$/IS.mp4" />
                                 <Representation id="1920x1080i25" codecs="avc3.640028" height="1080" width="1920" frameRate="25" scanType="interlaced" bandwidth="8606480" />
                               </AdaptationSet>
                             </Period>
                             <UTCTiming schemeIdUri="urn:mpeg:dash:utc:http-xsdate:2014" value="https://time.akamai.com/?iso"/>
                           </MPD>`

  function slidingWindow () {
    return getXML(slidingWindowString)
  }
  function growingWindow () {
    return getXML(growingWindowString)
  }
  function badAttributes () {
    return getXML(badAttributesString)
  }
  function getXML (string) {
    var parser = new DOMParser()
    return parser.parseFromString(string, 'application/xml')
  }
  return {
    slidingWindow: slidingWindow,
    growingWindow: growingWindow,
    badAttributes: badAttributes
  }
}

export default DashManifests
