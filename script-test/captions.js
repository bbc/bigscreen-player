require(
  [
    'bigscreenplayer/captions'
  ],
  function (Captions) {
    'use strict';

    var ttml = '<?xml version="1.0" encoding="utf-8"?>' +
    '<tt xmlns="http://www.w3.org/2006/10/ttaf1" xmlns:ttp="http://www.w3.org/2006/10/ttaf1#parameter" ttp:timeBase="media" xmlns:tts="http://www.w3.org/2006/10/ttaf1#style" xml:lang="en" xmlns:ttm="http://www.w3.org/2006/10/ttaf1#metadata">' +
      '<head>' +
        '<styling>' +
          '<style id="s0" tts:backgroundColor="black" tts:fontStyle="normal" tts:fontSize="16" tts:fontFamily="sansSerif" tts:color="white" />' +
          '<style id="s1" style="s0" tts:color="yellow" />' +
          '<style id="s2" style="s0" tts:color="lime" />' +
        '</styling>' +
      '</head>' +
      '<body tts:textAlign="center" style="s0">' +
        '<div>' +
          '<p style="s1" begin="00:00:14.04" id="p1" end="00:00:16.16">Mango balloons are too expensive<br />and they smell odd, even if they taste amazing</p>' +
          '<p style="s2" begin="00:02:33.80" id="p43" end="00:02:37.92"><span tts:color="white">TV: </span>Sartorial before they sold out actually hammock<br />retro trust fund swag authentic succulents palo santo</p>' +
        '</div>' +
      '</body>' +
    '</tt>';

    var ebu = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<tt:tt xmlns:tt="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" xmlns:ebuttdt="urn:ebu:tt:datatypes" xmlns:ebuttm="urn:ebu:tt:metadata" xmlns:ebutts="urn:ebu:tt:style" xmlns:ebuttExt="urn:ebu:tt:extension" ttp:timeBase="media" ttp:cellResolution="32 15" xml:lang="en-GB" xmlns="http://www.w3.org/ns/ttml">' +
          '<tt:head>' +
              '<tt:metadata>' +
                  '<ebuttm:conformsToStandard>urn:ebu:tt:distribution:2014-01</ebuttm:conformsToStandard>' +
              '</tt:metadata>' +
              '<tt:styling>' +
                  '<tt:style xml:id="S0" tts:fontSize="100%" tts:textAlign="center" tts:lineHeight="120%" ebutts:linePadding="0.5c" tts:fontFamily="Reith-sans,proportionalSansSerif"></tt:style>' +
                  '<tt:style xml:id="S2" tts:color="#00FFFF" tts:backgroundColor="#000000"></tt:style>' +
                  '<tt:style xml:id="S3" tts:color="#FFFF00" tts:backgroundColor="#000000"></tt:style>' +
                  '<tt:style xml:id="S4" tts:color="#FFFFFF" tts:backgroundColor="#000000"></tt:style>' +
              '</tt:styling>' +
          '</tt:head>' +
          '<tt:body ttm:role="caption">' +
              '<tt:div style="S0">' +
      '<tt:p xml:id="C1" begin="00:00:33.560" end="00:00:34.960" region="R1"><span style="S2">That&#39;s lovely.</span></tt:p>' +
      '<tt:p xml:id="C2" begin="00:00:34.960" end="00:00:36.360" region="R1"><span style="S3">It&#39;s from my boyfriend.</span></tt:p>' +
      '<tt:p xml:id="C3" begin="00:00:37.520" end="00:00:39.240" region="R1"><span style="S4">One of the good ones.</span></tt:p>' +
              '</tt:div>' +
          '</tt:body>' +
      '</tt:tt>';

    describe('Caption formats', function () {
      it('Should load TTML', function () {
        var captions = new Captions();
        var docparser = new DOMParser();

        var xmldoc = docparser.parseFromString(ttml, 'text/xml');
        var items = captions.transformXML(xmldoc);

        expect(items.length).toBeGreaterThan(0);
        expect(items[0].generateHtmlElementNode().getAttribute('style')).toContain('color');
      });

      it('Should load EBU-TT-D', function () {
        var captions = new Captions();
        var docparser = new DOMParser();

        var xmldoc = docparser.parseFromString(ebu, 'text/xml');
        var items = captions.transformXML(xmldoc);

        expect(items.length).toBeGreaterThan(0);
        expect(items[0].generateHtmlElementNode().firstChild.getAttribute('style')).toContain('color');
      });
    });
  }
);
