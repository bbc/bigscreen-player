const HLS_MANIFESTS = {
  INVALID_PROGRAM_DATETIME:
    "#EXTM3U\n" +
    "#EXT-X-VERSION:2\n" +
    "#EXT-X-MEDIA-SEQUENCE:179532414\n" +
    "#EXT-X-TARGETDURATION:8\n" +
    "#USP-X-TIMESTAMP-MAP:MPEGTS=2003059584,LOCAL=2015-07-07T08:55:10Z\n" +
    "#EXT-X-PROGRAM-DATE-TIME:invaliddatetime\n" +
    "#EXTINF:8, no desc\n" +
    "content-audio_2=96000-video=1374000-179532414.ts\n",
  VALID_PROGRAM_DATETIME_NO_ENDLIST:
    "#EXTM3U\n" +
    "#EXT-X-VERSION:3\n" +
    "#EXT-X-INDEPENDENT-SEGMENTS\n" +
    "#EXT-X-TARGETDURATION:4\n" +
    "#EXT-X-MEDIA-SEQUENCE:450795161\n" +
    "#EXT-X-PROGRAM-DATE-TIME:2024-11-08T08:00:00.0Z\n" +
    "#EXTINF:3.84\n" +
    "450795161.ts\n" +
    "#EXTINF:3.84\n" +
    "450795162.ts\n" +
    "#EXTINF:3.84\n" +
    "450795163.ts\n" +
    "#EXTINF:3.84\n" +
    "450795164.ts\n",
  VALID_PROGRAM_DATETIME_AND_ENDLIST:
    "#EXTM3U\n" +
    "#EXT-X-VERSION:3\n" +
    "#EXT-X-INDEPENDENT-SEGMENTS\n" +
    "#EXT-X-PLAYLIST-TYPE:VOD\n" +
    "#EXT-X-TARGETDURATION:4\n" +
    "#EXT-X-MEDIA-SEQUENCE:450795161\n" +
    "#EXT-X-PROGRAM-DATE-TIME:2024-11-08T06:00:00Z\n" +
    "#EXTINF:3.84\n" +
    "450793126.ts\n" +
    "#EXTINF:3.84\n" +
    "450793127.ts\n" +
    "#EXTINF:3.84\n" +
    "450793128.ts\n" +
    "#EXTINF:3.84\n" +
    "450793129.ts\n" +
    "#EXT-X-ENDLIST\n",
  NO_PROGRAM_DATETIME_ENDLIST:
    "#EXTM3U\n" +
    "#EXT-X-VERSION:3\n" +
    "#EXT-X-TARGETDURATION:8\n" +
    "#EXT-X-MEDIA-SEQUENCE:1\n" +
    "#USP-X-TIMESTAMP-MAP:MPEGTS=900000,LOCAL=1970-01-01T00:00:00Z\n" +
    "#EXTINF:8\n" +
    "segment-1.ts\n" +
    "#EXTINF:7\n" +
    "segment-2.ts\n" +
    "#EXTINF:8\n" +
    "segment-3.ts\n" +
    "#EXTINF:8\n" +
    "segment-4.ts\n" +
    "#EXT-X-ENDLIST\n",
}

export default HLS_MANIFESTS
