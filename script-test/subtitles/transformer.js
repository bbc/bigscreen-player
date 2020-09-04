/* eslint-disable es5/no-template-literals */
require(
  [
    'bigscreenplayer/subtitles/transformer'
  ],
  function (Transformer) {
    'use strict';
    var ttml = `
            <tt xmlns="http://www.w3.org/2006/10/ttaf1" xmlns:ttp="http://www.w3.org/2006/10/ttaf1#parameter" ttp:timeBase="media" xmlns:tts="http://www.w3.org/2006/10/ttaf1#style" xml:lang="en" xmlns:ttm="http://www.w3.org/2006/10/ttaf1#metadata">
              <head>
                <styling>
                  <style id="s0" tts:backgroundColor="black" tts:fontStyle="normal" tts:fontSize="16" tts:fontFamily="sansSerif" tts:color="white" />
                  <style id="s1" style="s0" tts:color="yellow" />
                  <style id="s2" style="s0" tts:color="lime" />
                </styling>
              </head>
              <body tts:textAlign="center" style="s0">
                <div>
                  <p style="s1" begin="00:00:14.04" id="p1" end="00:00:16.16">Mango balloons are too expensive<br />and they smell odd, even if they taste amazing</p>
                  <p style="s2" begin="00:02:33.80" id="p43" end="00:02:37.92"><span tts:color="white">TV: </span>Sartorial before they sold out actually hammock<br />retro trust fund swag authentic succulents palo santo</p>
                </div>
              </body>
            </tt>`;

    var ebuttd = `
              <tt:tt xmlns:tt="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" xmlns:ebuttdt="urn:ebu:tt:datatypes" xmlns:ebuttm="urn:ebu:tt:metadata" xmlns:ebutts="urn:ebu:tt:style" xmlns:ebuttExt="urn:ebu:tt:extension" ttp:timeBase="media" ttp:cellResolution="32 15" xml:lang="en-GB" xmlns="http://www.w3.org/ns/ttml">
                  <tt:head>
                      <tt:metadata>
                          <ebuttm:conformsToStandard>urn:ebu:tt:distribution:2014-01</ebuttm:conformsToStandard>
                      </tt:metadata>
                      <tt:styling>
                          <tt:style xml:id="S0" tts:fontSize="100%" tts:textAlign="center" tts:lineHeight="120%" ebutts:linePadding="0.5c" tts:fontFamily="Reith-sans,proportionalSansSerif"></tt:style>
                          <tt:style xml:id="S2" tts:color="#00FFFF" tts:backgroundColor="#000000"></tt:style>
                          <tt:style xml:id="S3" tts:color="#FFFF00" tts:backgroundColor="#000000"></tt:style>
                          <tt:style xml:id="S4" tts:color="#FFFFFF" tts:backgroundColor="#000000"></tt:style>
                      </tt:styling>
                  </tt:head>
                  <tt:body ttm:role="caption">
                    <tt:div style="S0">
                      <tt:p xml:id="C1" region="R1" begin="00:00:33.560" end="00:00:34.960"><span style="S2">Is that a balloon?</span></tt:p>
                      <tt:p xml:id="C2" region="R1"><span style="S3" begin="00:00:34.960" end="00:00:37.000">Yes</span><span style="S4" begin="00:00:35.200" end="00:00:37.000">BANG</span></tt:p>
                    </tt:div>
                  </tt:body>
              </tt:tt>`;

    describe('Subtitle transformer', function () {
      it('Should load a TTML document', function () {
        var docparser = new DOMParser();

        var xmldoc = docparser.parseFromString(ttml, 'text/xml');
        var doc = Transformer().transformXML(xmldoc);

        var subtitlesForZero = doc.subtitlesForTime(0);
        var singleSubtitle = doc.subtitlesForTime(14.1);
        var outOfRangeSubtitles = doc.subtitlesForTime(NaN);

        expect(doc.baseStyle).toEqual(jasmine.any(String));

        expect(subtitlesForZero.length).toBe(0);

        expect(singleSubtitle.length).toBe(1);
        expect(singleSubtitle[0]).toEqual(jasmine.objectContaining({start: 14.04, end: 16.16}));

        expect(outOfRangeSubtitles.length).toBe(0);
      });

      it('Should load EBU-TT-D document', function () {
        var docparser = new DOMParser();

        var xmldoc = docparser.parseFromString(ebuttd, 'text/xml');
        var doc = Transformer().transformXML(xmldoc);
        var subtitlesForZero = doc.subtitlesForTime(0);
        var singleSubtitle = doc.subtitlesForTime(33.6);
        var cumulativeSubtitles = doc.subtitlesForTime(35.5);
        var outOfRangeSubtitles = doc.subtitlesForTime(NaN);

        expect(doc.baseStyle).toEqual(jasmine.any(String));

        expect(subtitlesForZero.length).toBe(0);

        expect(singleSubtitle.length).toBe(1);
        expect(singleSubtitle[0]).toEqual(jasmine.objectContaining({start: 33.560, end: 34.960}));

        expect(cumulativeSubtitles.length).toBe(2);
        expect(cumulativeSubtitles[0]).toEqual(jasmine.objectContaining({start: 34.960, end: 37}));
        expect(cumulativeSubtitles[1]).toEqual(jasmine.objectContaining({start: 35.200, end: 37}));

        expect(outOfRangeSubtitles.length).toBe(0);
      });
    });
  }
);
