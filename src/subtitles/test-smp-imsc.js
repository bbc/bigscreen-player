import DebugTool from '../debugger/debugtool'
var doc
var isd
var html

try {
  function createCommonjsModule (fn) {
    var module = { exports: {} }
    return fn(module, module.exports), module.exports
  }
  /*
     * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * * Redistributions of source code must retain the above copyright notice, this
     *   list of conditions and the following disclaimer.
     * * Redistributions in binary form must reproduce the above copyright notice,
     *   this list of conditions and the following disclaimer in the documentation
     *   and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
     * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
     * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
     * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
     * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
     * POSSIBILITY OF SUCH DAMAGE.
     */
  var names = createCommonjsModule(function (module, exports) {
    (function (imscNames) {
      imscNames.ns_tt = 'http://www.w3.org/ns/ttml'
      imscNames.ns_tts = 'http://www.w3.org/ns/ttml#styling'
      imscNames.ns_ttp = 'http://www.w3.org/ns/ttml#parameter'
      imscNames.ns_xml = 'http://www.w3.org/XML/1998/namespace'
      imscNames.ns_itts = 'http://www.w3.org/ns/ttml/profile/imsc1#styling'
      imscNames.ns_ittp = 'http://www.w3.org/ns/ttml/profile/imsc1#parameter'
      imscNames.ns_smpte = 'http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt'
      imscNames.ns_ebutts = 'urn:ebu:tt:style'
      imscNames.ttaf_map = {
        'http://www.w3.org/2006/10/ttaf1': imscNames.ns_tt,
        'http://www.w3.org/2006/10/ttaf1#style': imscNames.ns_tts,
        'http://www.w3.org/2006/10/ttaf1#parameter': imscNames.ns_ttp
      }
    })(exports)
  })
  /*
     * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * * Redistributions of source code must retain the above copyright notice, this
     *   list of conditions and the following disclaimer.
     * * Redistributions in binary form must reproduce the above copyright notice,
     *   this list of conditions and the following disclaimer in the documentation
     *   and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
     * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
     * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
     * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
     * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
     * POSSIBILITY OF SUCH DAMAGE.
     */
  var utils = createCommonjsModule(function (module, exports) {
    (function (imscUtils) {
      /* Documents the error handler interface */
      /**
             * @classdesc Generic interface for handling events. The interface exposes four
             * methods:
             * * <pre>info</pre>: unusual event that does not result in an inconsistent state
             * * <pre>warn</pre>: unexpected event that should not result in an inconsistent state
             * * <pre>error</pre>: unexpected event that may result in an inconsistent state
             * * <pre>fatal</pre>: unexpected event that results in an inconsistent state
             *   and termination of processing
             * Each method takes a single <pre>string</pre> describing the event as argument,
             * and returns a single <pre>boolean</pre>, which terminates processing if <pre>true</pre>.
             *
             * @name ErrorHandler
             * @class
             */
      /*
             * Parses a TTML color expression
             *
             */
      var HEX_COLOR_RE = /#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})?/
      var DEC_COLOR_RE = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
      var DEC_COLORA_RE = /rgba\(\s*(\d+),\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
      var NAMED_COLOR = {
        transparent: [0, 0, 0, 0],
        black: [0, 0, 0, 255],
        silver: [192, 192, 192, 255],
        gray: [128, 128, 128, 255],
        white: [255, 255, 255, 255],
        maroon: [128, 0, 0, 255],
        red: [255, 0, 0, 255],
        purple: [128, 0, 128, 255],
        fuchsia: [255, 0, 255, 255],
        magenta: [255, 0, 255, 255],
        green: [0, 128, 0, 255],
        lime: [0, 255, 0, 255],
        olive: [128, 128, 0, 255],
        yellow: [255, 255, 0, 255],
        navy: [0, 0, 128, 255],
        blue: [0, 0, 255, 255],
        teal: [0, 128, 128, 255],
        aqua: [0, 255, 255, 255],
        cyan: [0, 255, 255, 255]
      }
      imscUtils.parseColor = function (str) {
        var m
        var r = null
        var nc = NAMED_COLOR[str.toLowerCase()]
        if (nc !== undefined) {
          r = nc
        } else if ((m = HEX_COLOR_RE.exec(str)) !== null) {
          r = [parseInt(m[1], 16),
            parseInt(m[2], 16),
            parseInt(m[3], 16),
            (m[4] !== undefined ? parseInt(m[4], 16) : 255)]
        } else if ((m = DEC_COLOR_RE.exec(str)) !== null) {
          r = [parseInt(m[1]),
            parseInt(m[2]),
            parseInt(m[3]),
            255]
        } else if ((m = DEC_COLORA_RE.exec(str)) !== null) {
          r = [parseInt(m[1]),
            parseInt(m[2]),
            parseInt(m[3]),
            parseInt(m[4])]
        }
        return r
      }
      var LENGTH_RE = /^((?:\+|\-)?\d*(?:\.\d+)?)(px|em|c|%|rh|rw)$/
      imscUtils.parseLength = function (str) {
        var m
        var r = null
        if ((m = LENGTH_RE.exec(str)) !== null) {
          r = { value: parseFloat(m[1]), unit: m[2] }
        }
        return r
      }
      imscUtils.parseTextShadow = function (str) {
        var shadows = str.split(',')
        var r = []
        for (var i in shadows) {
          var shadow = shadows[i].split(' ')
          if (shadow.length === 1 && shadow[0] === 'none') {
            return 'none'
          } else if (shadow.length > 1 && shadow.length < 5) {
            var out_shadow = [null, null, null, null]
            /* x offset */
            var l = imscUtils.parseLength(shadow.shift())
            if (l === null) { return null }
            out_shadow[0] = l
            /* y offset */
            l = imscUtils.parseLength(shadow.shift())
            if (l === null) { return null }
            out_shadow[1] = l
            /* is there a third component */
            if (shadow.length === 0) {
              r.push(out_shadow)
              continue
            }
            l = imscUtils.parseLength(shadow[0])
            if (l !== null) {
              out_shadow[2] = l
              shadow.shift()
            }
            if (shadow.length === 0) {
              r.push(out_shadow)
              continue
            }
            var c = imscUtils.parseColor(shadow[0])
            if (c === null) { return null }
            out_shadow[3] = c
            r.push(out_shadow)
          }
        }
        return r
      }
      imscUtils.parsePosition = function (str) {
        /* see https://www.w3.org/TR/ttml2/#style-value-position */
        var s = str.split(' ')
        var isKeyword = function (str) {
          return str === 'center' ||
                        str === 'left' ||
                        str === 'top' ||
                        str === 'bottom' ||
                        str === 'right'
        }
        if (s.length > 4) {
          return null
        }
        /* initial clean-up pass */
        for (var j in s) {
          if (!isKeyword(s[j])) {
            var l = imscUtils.parseLength(s[j])
            if (l === null) { return null }
            s[j] = l
          }
        }
        /* position default */
        var pos = {
          h: { edge: 'left', offset: { value: 50, unit: '%' } },
          v: { edge: 'top', offset: { value: 50, unit: '%' } }
        }
        /* update position */
        for (var i = 0; i < s.length;) {
          /* extract the current component */
          var comp = s[i++]
          if (isKeyword(comp)) {
            /* we have a keyword */
            var offset = { value: 0, unit: '%' }
            /* peek at the next component */
            if (s.length !== 2 && i < s.length && (!isKeyword(s[i]))) {
              /* followed by an offset */
              offset = s[i++]
            }
            /* skip if center */
            if (comp === 'right') {
              pos.h.edge = comp
              pos.h.offset = offset
            } else if (comp === 'bottom') {
              pos.v.edge = comp
              pos.v.offset = offset
            } else if (comp === 'left') {
              pos.h.offset = offset
            } else if (comp === 'top') {
              pos.v.offset = offset
            }
          } else if (s.length === 1 || s.length === 2) {
            /* we have a bare value */
            if (i === 1) {
              /* assign it to left edge if first bare value */
              pos.h.offset = comp
            } else {
              /* assign it to top edge if second bare value */
              pos.v.offset = comp
            }
          } else {
            /* error condition */
            return null
          }
        }
        return pos
      }
      imscUtils.ComputedLength = function (rw, rh) {
        this.rw = rw
        this.rh = rh
      }
      imscUtils.ComputedLength.prototype.toUsedLength = function (width, height) {
        return width * this.rw + height * this.rh
      }
      imscUtils.ComputedLength.prototype.multiply = function (value, factor) {
        return factor ? value * factor : value
      }
      imscUtils.ComputedLength.prototype.isZero = function () {
        return this.rw === 0 && this.rh === 0
      }
      /**
             * Computes a specified length to a root container relative length
             *
             * @param {number} lengthVal Length value to be computed
             * @param {string} lengthUnit Units of the length value
             * @param {number} emScale length of 1em, or null if em is not allowed
             * @param {number} percentScale length to which , or null if perecentage is not allowed
             * @param {number} cellScale length of 1c, or null if c is not allowed
             * @param {number} pxScale length of 1px, or null if px is not allowed
             * @param {number} direction 0 if the length is computed in the horizontal direction, 1 if the length is computed in the vertical direction
             * @return {number} Computed length
             */
      imscUtils.toComputedLength = function (lengthVal, lengthUnit, emLength, percentLength, cellLength, pxLength) {
        if (lengthUnit === '%' && percentLength) {
          return new imscUtils.ComputedLength(percentLength.rw * lengthVal / 100, percentLength.rh * lengthVal / 100)
        } else if (lengthUnit === 'em' && emLength) {
          return new imscUtils.ComputedLength(emLength.rw * lengthVal, emLength.rh * lengthVal)
        } else if (lengthUnit === 'c' && cellLength) {
          return new imscUtils.ComputedLength(lengthVal * cellLength.rw, lengthVal * cellLength.rh)
        } else if (lengthUnit === 'px' && pxLength) {
          return new imscUtils.ComputedLength(lengthVal * pxLength.rw, lengthVal * pxLength.rh)
        } else if (lengthUnit === 'rh') {
          return new imscUtils.ComputedLength(0, lengthVal / 100)
        } else if (lengthUnit === 'rw') {
          return new imscUtils.ComputedLength(lengthVal / 100, 0)
        } else {
          return null
        }
      }
    })(exports)
  })
  /*
     * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * * Redistributions of source code must retain the above copyright notice, this
     *   list of conditions and the following disclaimer.
     * * Redistributions in binary form must reproduce the above copyright notice,
     *   this list of conditions and the following disclaimer in the documentation
     *   and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
     * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
     * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
     * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
     * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
     * POSSIBILITY OF SUCH DAMAGE.
     */
  var styles = createCommonjsModule(function (module, exports) {
    (function (imscStyles, imscNames, imscUtils) {
      function StylingAttributeDefinition (ns, name, initialValue, appliesTo, isInherit, isAnimatable, parseFunc, computeFunc) {
        this.name = name
        this.ns = ns
        this.qname = ns + ' ' + name
        this.inherit = isInherit
        this.animatable = isAnimatable
        this.initial = initialValue
        this.applies = appliesTo
        this.parse = parseFunc
        this.compute = computeFunc
      }
      imscStyles.all = [
        new StylingAttributeDefinition(imscNames.ns_tts, 'backgroundColor', 'transparent', ['body', 'div', 'p', 'region', 'span'], false, true, imscUtils.parseColor, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'color', 'white', ['span'], true, true, imscUtils.parseColor, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'direction', 'ltr', ['p', 'span'], true, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'display', 'auto', ['body', 'div', 'p', 'region', 'span'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'displayAlign', 'before', ['region'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'extent', 'auto', ['tt', 'region'], false, true, function (str) {
          if (str === 'auto') {
            return str
          } else {
            var s = str.split(' ')
            if (s.length !== 2) { return null }
            var w = imscUtils.parseLength(s[0])
            var h = imscUtils.parseLength(s[1])
            if (!h || !w) { return null }
            return { 'h': h, 'w': w }
          }
        }, function (doc, parent, element, attr, context) {
          var h
          var w
          if (attr === 'auto') {
            h = new imscUtils.ComputedLength(0, 1)
          } else {
            h = imscUtils.toComputedLength(attr.h.value, attr.h.unit, null, doc.dimensions.h, null, doc.pxLength.h)
            if (h === null) {
              return null
            }
          }
          if (attr === 'auto') {
            w = new imscUtils.ComputedLength(1, 0)
          } else {
            w = imscUtils.toComputedLength(attr.w.value, attr.w.unit, null, doc.dimensions.w, null, doc.pxLength.w)
            if (w === null) {
              return null
            }
          }
          return { 'h': h, 'w': w }
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'fontFamily', 'default', [
          'p',
          'span'
        ], true, true, function (str) {
          var ffs = str.split(',')
          var rslt = []
          for (var i in ffs) {
            if (ffs[i].charAt(0) !== "'" && ffs[i].charAt(0) !== '"') {
              if (ffs[i] === 'default') {
                /* per IMSC1 */
                rslt.push('monospaceSerif')
              } else {
                rslt.push(ffs[i])
              }
            } else {
              rslt.push(ffs[i])
            }
          }
          return rslt
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'shear', '0%', ['p'], true, true, imscUtils.parseLength, function (doc, parent, element, attr) {
          var fs
          if (attr.unit === '%') {
            fs = Math.abs(attr.value) > 100 ? Math.sign(attr.value) * 100 : attr.value
          } else {
            return null
          }
          return fs
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'fontSize', '1c', [
          'p',
          'span'
        ], true, true, imscUtils.parseLength, function (doc, parent, element, attr, context) {
          var fs
          fs = imscUtils.toComputedLength(attr.value, attr.unit, parent !== null ? parent.styleAttrs[imscStyles.byName.fontSize.qname] : doc.cellLength.h, parent !== null ? parent.styleAttrs[imscStyles.byName.fontSize.qname] : doc.cellLength.h, doc.cellLength.h, doc.pxLength.h)
          return fs
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'fontStyle', 'normal', ['span'], true, true, function (str) {
          /* TODO: handle font style */
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'fontWeight', 'normal', ['span'], true, true, function (str) {
          /* TODO: handle font weight */
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'lineHeight', 'normal', ['p'], true, true, function (str) {
          if (str === 'normal') {
            return str
          } else {
            return imscUtils.parseLength(str)
          }
        }, function (doc, parent, element, attr, context) {
          var lh
          if (attr === 'normal') {
            /* inherit normal per https://github.com/w3c/ttml1/issues/220 */
            lh = attr
          } else {
            lh = imscUtils.toComputedLength(attr.value, attr.unit, element.styleAttrs[imscStyles.byName.fontSize.qname], element.styleAttrs[imscStyles.byName.fontSize.qname], doc.cellLength.h, doc.pxLength.h)
            if (lh === null) {
              return null
            }
          }
          /* TODO: create a Length constructor */
          return lh
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'opacity', 1.0, ['region'], false, true, parseFloat, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'origin', 'auto', ['region'], false, true, function (str) {
          if (str === 'auto') {
            return str
          } else {
            var s = str.split(' ')
            if (s.length !== 2) { return null }
            var w = imscUtils.parseLength(s[0])
            var h = imscUtils.parseLength(s[1])
            if (!h || !w) { return null }
            return { 'h': h, 'w': w }
          }
        }, function (doc, parent, element, attr, context) {
          var h
          var w
          if (attr === 'auto') {
            h = new imscUtils.ComputedLength(0, 0)
          } else {
            h = imscUtils.toComputedLength(attr.h.value, attr.h.unit, null, doc.dimensions.h, null, doc.pxLength.h)
            if (h === null) {
              return null
            }
          }
          if (attr === 'auto') {
            w = new imscUtils.ComputedLength(0, 0)
          } else {
            w = imscUtils.toComputedLength(attr.w.value, attr.w.unit, null, doc.dimensions.w, null, doc.pxLength.w)
            if (w === null) {
              return null
            }
          }
          return { 'h': h, 'w': w }
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'overflow', 'hidden', ['region'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'padding', '0px', ['region'], false, true, function (str) {
          var s = str.split(' ')
          if (s.length > 4) { return null }
          var r = []
          for (var i in s) {
            var l = imscUtils.parseLength(s[i])
            if (!l) { return null }
            r.push(l)
          }
          return r
        }, function (doc, parent, element, attr, context) {
          var padding
          /* TODO: make sure we are in region */
          /*
                     * expand padding shortcuts to
                     * [before, end, after, start]
                     *
                     */
          if (attr.length === 1) {
            padding = [attr[0], attr[0], attr[0], attr[0]]
          } else if (attr.length === 2) {
            padding = [attr[0], attr[1], attr[0], attr[1]]
          } else if (attr.length === 3) {
            padding = [attr[0], attr[1], attr[2], attr[1]]
          } else if (attr.length === 4) {
            padding = [attr[0], attr[1], attr[2], attr[3]]
          } else {
            return null
          }
          /* TODO: take into account tts:direction */
          /*
                     * transform [before, end, after, start] according to writingMode to
                     * [top,left,bottom,right]
                     *
                     */
          var dir = element.styleAttrs[imscStyles.byName.writingMode.qname]
          if (dir === 'lrtb' || dir === 'lr') {
            padding = [padding[0], padding[3], padding[2], padding[1]]
          } else if (dir === 'rltb' || dir === 'rl') {
            padding = [padding[0], padding[1], padding[2], padding[3]]
          } else if (dir === 'tblr') {
            padding = [padding[3], padding[0], padding[1], padding[2]]
          } else if (dir === 'tbrl' || dir === 'tb') {
            padding = [padding[3], padding[2], padding[1], padding[0]]
          } else {
            return null
          }
          var out = []
          for (var i in padding) {
            if (padding[i].value === 0) {
              out[i] = new imscUtils.ComputedLength(0, 0)
            } else {
              out[i] = imscUtils.toComputedLength(padding[i].value, padding[i].unit, element.styleAttrs[imscStyles.byName.fontSize.qname], i === '0' || i === '2' ? element.styleAttrs[imscStyles.byName.extent.qname].h : element.styleAttrs[imscStyles.byName.extent.qname].w, i === '0' || i === '2' ? doc.cellLength.h : doc.cellLength.w, i === '0' || i === '2' ? doc.pxLength.h : doc.pxLength.w)
              if (out[i] === null) { return null }
            }
          }
          return out
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'position', 'top left', ['region'], false, true, function (str) {
          return imscUtils.parsePosition(str)
        }, function (doc, parent, element, attr) {
          var h
          var w
          h = imscUtils.toComputedLength(attr.v.offset.value, attr.v.offset.unit, null, new imscUtils.ComputedLength(-element.styleAttrs[imscStyles.byName.extent.qname].h.rw, doc.dimensions.h.rh - element.styleAttrs[imscStyles.byName.extent.qname].h.rh), null, doc.pxLength.h)
          if (h === null) { return null }
          if (attr.v.edge === 'bottom') {
            h = new imscUtils.ComputedLength(-h.rw - element.styleAttrs[imscStyles.byName.extent.qname].h.rw, doc.dimensions.h.rh - h.rh - element.styleAttrs[imscStyles.byName.extent.qname].h.rh)
          }
          w = imscUtils.toComputedLength(attr.h.offset.value, attr.h.offset.unit, null, new imscUtils.ComputedLength(doc.dimensions.w.rw - element.styleAttrs[imscStyles.byName.extent.qname].w.rw, -element.styleAttrs[imscStyles.byName.extent.qname].w.rh), null, doc.pxLength.w)
          if (h === null) { return null }
          if (attr.h.edge === 'right') {
            w = new imscUtils.ComputedLength(doc.dimensions.w.rw - w.rw - element.styleAttrs[imscStyles.byName.extent.qname].w.rw, -w.rh - element.styleAttrs[imscStyles.byName.extent.qname].w.rh)
          }
          return { 'h': h, 'w': w }
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'ruby', 'none', ['span'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'rubyAlign', 'center', ['span'], true, true, function (str) {
          if (!(str === 'center' || str === 'spaceAround')) {
            return null
          }
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'rubyPosition', 'outside', ['span'], true, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'rubyReserve', 'none', ['p'], true, true, function (str) {
          var s = str.split(' ')
          var r = [null, null]
          if (s.length === 0 || s.length > 2) { return null }
          if (s[0] === 'none' ||
                        s[0] === 'both' ||
                        s[0] === 'after' ||
                        s[0] === 'before' ||
                        s[0] === 'outside') {
            r[0] = s[0]
          } else {
            return null
          }
          if (s.length === 2 && s[0] !== 'none') {
            var l = imscUtils.parseLength(s[1])
            if (l) {
              r[1] = l
            } else {
              return null
            }
          }
          return r
        }, function (doc, parent, element, attr, context) {
          if (attr[0] === 'none') {
            return attr
          }
          var fs = null
          if (attr[1] === null) {
            fs = new imscUtils.ComputedLength(element.styleAttrs[imscStyles.byName.fontSize.qname].rw * 0.5, element.styleAttrs[imscStyles.byName.fontSize.qname].rh * 0.5)
          } else {
            fs = imscUtils.toComputedLength(attr[1].value, attr[1].unit, element.styleAttrs[imscStyles.byName.fontSize.qname], element.styleAttrs[imscStyles.byName.fontSize.qname], doc.cellLength.h, doc.pxLength.h)
          }
          if (fs === null) { return null }
          return [attr[0], fs]
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'showBackground', 'whenActive', ['region'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'textAlign', 'start', ['p'], true, true, function (str) {
          return str
        }, function (doc, parent, element, attr, context) {
          /* Section 7.16.9 of XSL */
          if (attr === 'left') {
            return 'start'
          } else if (attr === 'right') {
            return 'end'
          } else {
            return attr
          }
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'textCombine', 'none', ['span'], true, true, function (str) {
          var s = str.split(' ')
          if (s.length === 1) {
            if (s[0] === 'none' || s[0] === 'all') {
              return [s[0]]
            }
          }
          return null
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'textDecoration', 'none', ['span'], true, true, function (str) {
          return str.split(' ')
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'textEmphasis', 'none', ['span'], true, true, function (str) {
          var e = str.split(' ')
          var rslt = { style: null, symbol: null, color: null, position: null }
          for (var i in e) {
            if (e[i] === 'none' || e[i] === 'auto') {
              rslt.style = e[i]
            } else if (e[i] === 'filled' ||
                            e[i] === 'open') {
              rslt.style = e[i]
            } else if (e[i] === 'circle' ||
                            e[i] === 'dot' ||
                            e[i] === 'sesame') {
              rslt.symbol = e[i]
            } else if (e[i] === 'current') {
              rslt.color = e[i]
            } else if (e[i] === 'outside' || e[i] === 'before' || e[i] === 'after') {
              rslt.position = e[i]
            } else {
              rslt.color = imscUtils.parseColor(e[i])
              if (rslt.color === null) { return null }
            }
          }
          if (rslt.style == null && rslt.symbol == null) {
            rslt.style = 'auto'
          } else {
            rslt.symbol = rslt.symbol || 'circle'
            rslt.style = rslt.style || 'filled'
          }
          rslt.position = rslt.position || 'outside'
          rslt.color = rslt.color || 'current'
          return rslt
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'textOutline', 'none', ['span'], true, true, function (str) {
          /*
                     * returns {c: <color>?, thichness: <length>} | "none"
                     *
                     */
          if (str === 'none') {
            return str
          } else {
            var r = {}
            var s = str.split(' ')
            if (s.length === 0 || s.length > 2) { return null }
            var c = imscUtils.parseColor(s[0])
            r.color = c
            if (c !== null) { s.shift() }
            if (s.length !== 1) { return null }
            var l = imscUtils.parseLength(s[0])
            if (!l) { return null }
            r.thickness = l
            return r
          }
        }, function (doc, parent, element, attr, context) {
          /*
                     * returns {color: <color>, thickness: <norm length>}
                     *
                     */
          if (attr === 'none') { return attr }
          var rslt = {}
          if (attr.color === null) {
            rslt.color = element.styleAttrs[imscStyles.byName.color.qname]
          } else {
            rslt.color = attr.color
          }
          rslt.thickness = imscUtils.toComputedLength(attr.thickness.value, attr.thickness.unit, element.styleAttrs[imscStyles.byName.fontSize.qname], element.styleAttrs[imscStyles.byName.fontSize.qname], doc.cellLength.h, doc.pxLength.h)
          if (rslt.thickness === null) { return null }
          return rslt
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'textShadow', 'none', ['span'], true, true, imscUtils.parseTextShadow, function (doc, parent, element, attr) {
          /*
                     * returns [{x_off: <length>, y_off: <length>, b_radius: <length>, color: <color>}*] or "none"
                     *
                     */
          if (attr === 'none') { return attr }
          var r = []
          for (var i in attr) {
            var shadow = {}
            shadow.x_off = imscUtils.toComputedLength(attr[i][0].value, attr[i][0].unit, null, element.styleAttrs[imscStyles.byName.fontSize.qname], null, doc.pxLength.w)
            if (shadow.x_off === null) { return null }
            shadow.y_off = imscUtils.toComputedLength(attr[i][1].value, attr[i][1].unit, null, element.styleAttrs[imscStyles.byName.fontSize.qname], null, doc.pxLength.h)
            if (shadow.y_off === null) { return null }
            if (attr[i][2] === null) {
              shadow.b_radius = 0
            } else {
              shadow.b_radius = imscUtils.toComputedLength(attr[i][2].value, attr[i][2].unit, null, element.styleAttrs[imscStyles.byName.fontSize.qname], null, doc.pxLength.h)
              if (shadow.b_radius === null) { return null }
            }
            if (attr[i][3] === null) {
              shadow.color = element.styleAttrs[imscStyles.byName.color.qname]
            } else {
              shadow.color = attr[i][3]
            }
            r.push(shadow)
          }
          return r
        }),
        new StylingAttributeDefinition(imscNames.ns_tts, 'unicodeBidi', 'normal', ['span', 'p'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'visibility', 'visible', ['body', 'div', 'p', 'region', 'span'], true, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'wrapOption', 'wrap', ['span'], true, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'writingMode', 'lrtb', ['region'], false, true, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_tts, 'zIndex', 'auto', ['region'], false, true, function (str) {
          var rslt
          if (str === 'auto') {
            rslt = str
          } else {
            rslt = parseInt(str)
            if (isNaN(rslt)) {
              rslt = null
            }
          }
          return rslt
        }, null),
        new StylingAttributeDefinition(imscNames.ns_ebutts, 'linePadding', '0c', ['p'], true, false, imscUtils.parseLength, function (doc, parent, element, attr, context) {
          return imscUtils.toComputedLength(attr.value, attr.unit, null, null, doc.cellLength.w, null)
        }),
        new StylingAttributeDefinition(imscNames.ns_ebutts, 'multiRowAlign', 'auto', ['p'], true, false, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_smpte, 'backgroundImage', null, ['div'], false, false, function (str) {
          return str
        }, null),
        new StylingAttributeDefinition(imscNames.ns_itts, 'forcedDisplay', 'false', ['body', 'div', 'p', 'region', 'span'], true, true, function (str) {
          return str === 'true'
        }, null),
        new StylingAttributeDefinition(imscNames.ns_itts, 'fillLineGap', 'true', ['p'], true, true, function (str) {
          return str === 'true'
        }, null)
      ]
      /* TODO: allow null parse function */
      imscStyles.byQName = {}
      for (var i in imscStyles.all) {
        imscStyles.byQName[imscStyles.all[i].qname] = imscStyles.all[i]
      }
      imscStyles.byName = {}
      for (var j in imscStyles.all) {
        imscStyles.byName[imscStyles.all[j].name] = imscStyles.all[j]
      }
    })(exports, typeof imscNames === 'undefined' ? names : imscNames, typeof imscUtils === 'undefined' ? utils : imscUtils)
  })
  /*
     * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * * Redistributions of source code must retain the above copyright notice, this
     *   list of conditions and the following disclaimer.
     * * Redistributions in binary form must reproduce the above copyright notice,
     *   this list of conditions and the following disclaimer in the documentation
     *   and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
     * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
     * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
     * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
     * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
     * POSSIBILITY OF SUCH DAMAGE.
     */
  isd = createCommonjsModule(function (module, exports) {
    (function (imscISD, imscNames, imscStyles, imscUtils) {
      /**
             * Creates a canonical representation of an IMSC1 document returned by <pre>imscDoc.fromXML()</pre>
             * at a given absolute offset in seconds. This offset does not have to be one of the values returned
             * by <pre>getMediaTimeEvents()</pre>.
             *
             * @param {Object} tt IMSC1 document
             * @param {number} offset Absolute offset (in seconds)
             * @param {?module:imscUtils.ErrorHandler} errorHandler Error callback
             * @returns {Object} Opaque in-memory representation of an ISD
             */
      imscISD.generateISD = function (tt, offset, errorHandler) {
        /* TODO check for tt and offset validity */
        /* create the ISD object from the IMSC1 doc */
        var isd = new ISD(tt)
        /* context */
        var context = {
          /* rubyfs: []*/ /* font size of the nearest textContainer or container */
        }
        /* Filter body contents - Only process what we need within the offset and discard regions not applicable to the content */
        var body = {}
        var activeRegions = new Set()
        function filter (offset, element) {
          function offsetFilter (element) {
            return !(offset < element.begin || offset >= element.end)
          }
          if (element.contents) {
            var clone = {}
            for (var prop in element) {
              clone[prop] = element[prop]
            }
            clone.contents = []
            element.contents.filter(offsetFilter).forEach(function (el) {
              var filteredElement = filter(offset, el)
              if (filteredElement.regionID) {
                activeRegions.add(filteredElement.regionID)
              }
              if (filteredElement !== null) {
                clone.contents.push(filteredElement)
              }
            })
            return clone
          } else {
            return element
          }
        }
        body = filter(offset, tt.body)
        /* rewritten TTML will always have a default - this covers it. because the region is defaulted to "" */
        if (activeRegions.size === 0 && tt.head.layout.regions.hasOwnProperty('')) {
          activeRegions.add('')
        }
        /* process regions */
        activeRegions.forEach(function (regionID) {
          /* post-order traversal of the body tree per [construct intermediate document] */
          var c = isdProcessContentElement(tt, offset, tt.head.layout.regions[regionID], body, null, '', tt.head.layout.regions[regionID], errorHandler, context)
          if (c !== null) {
            /* add the region to the ISD */
            isd.contents.push(c.element)
          }
        })
        return isd
      }
      /* set of styles not applicable to ruby container spans */
      var _rcs_na_styles = [
        imscStyles.byName.color.qname,
        imscStyles.byName.textCombine.qname,
        imscStyles.byName.textDecoration.qname,
        imscStyles.byName.textEmphasis.qname,
        imscStyles.byName.textOutline.qname,
        imscStyles.byName.textShadow.qname
      ]
      function isdProcessContentElement (doc, offset, region, body, parent, inherited_region_id, elem, errorHandler, context) {
        /* prune if temporally inactive */
        if (offset < elem.begin || offset >= elem.end) {
          return null
        }
        /*
                 * set the associated region as specified by the regionID attribute, or the
                 * inherited associated region otherwise
                 */
        var associated_region_id = 'regionID' in elem && elem.regionID !== '' ? elem.regionID : inherited_region_id
        /* prune the element if either:
                 * - the element is not terminal and the associated region is neither the default
                 *   region nor the parent region (this allows children to be associated with a
                 *   region later on)
                 * - the element is terminal and the associated region is not the parent region
                 */
        /* TODO: improve detection of terminal elements since <region> has no contents */
        if (parent !== null /* are we in the region element */ &&
                    associated_region_id !== region.id &&
                    ((!('contents' in elem)) ||
                        ('contents' in elem && elem.contents.length === 0) ||
                        associated_region_id !== '')) { return null }
        /* create an ISD element, including applying specified styles */
        var isd_element = new ISDContentElement(elem)
        /* apply set (animation) styling */
        for (var i in elem.sets) {
          if (offset < elem.sets[i].begin || offset >= elem.sets[i].end) { continue }
          isd_element.styleAttrs[elem.sets[i].qname] = elem.sets[i].value
        }
        /*
                 * keep track of specified styling attributes so that we
                 * can compute them later
                 */
        var spec_attr = {}
        for (var qname in isd_element.styleAttrs) {
          spec_attr[qname] = true
          /* special rule for tts:writingMode (section 7.29.1 of XSL)
                     * direction is set consistently with writingMode only
                     * if writingMode sets inline-direction to LTR or RTL
                     */
          if (isd_element.kind === 'region' &&
                        qname === imscStyles.byName.writingMode.qname &&
                        !(imscStyles.byName.direction.qname in isd_element.styleAttrs)) {
            var wm = isd_element.styleAttrs[qname]
            if (wm === 'lrtb' || wm === 'lr') {
              isd_element.styleAttrs[imscStyles.byName.direction.qname] = 'ltr'
            } else if (wm === 'rltb' || wm === 'rl') {
              isd_element.styleAttrs[imscStyles.byName.direction.qname] = 'rtl'
            }
          }
        }
        /* inherited styling */
        if (parent !== null) {
          for (var j in imscStyles.all) {
            var sa = imscStyles.all[j]
            /* textDecoration has special inheritance rules */
            if (sa.qname === imscStyles.byName.textDecoration.qname) {
              /* handle both textDecoration inheritance and specification */
              var ps = parent.styleAttrs[sa.qname]
              var es = isd_element.styleAttrs[sa.qname]
              var outs = []
              if (es === undefined) {
                outs = ps
              } else if (es.indexOf('none') === -1) {
                if ((es.indexOf('noUnderline') === -1 &&
                                    ps.indexOf('underline') !== -1) ||
                                    es.indexOf('underline') !== -1) {
                  outs.push('underline')
                }
                if ((es.indexOf('noLineThrough') === -1 &&
                                    ps.indexOf('lineThrough') !== -1) ||
                                    es.indexOf('lineThrough') !== -1) {
                  outs.push('lineThrough')
                }
                if ((es.indexOf('noOverline') === -1 &&
                                    ps.indexOf('overline') !== -1) ||
                                    es.indexOf('overline') !== -1) {
                  outs.push('overline')
                }
              } else {
                outs.push('none')
              }
              isd_element.styleAttrs[sa.qname] = outs
            } else if (sa.qname === imscStyles.byName.fontSize.qname &&
                            !(sa.qname in isd_element.styleAttrs) &&
                            isd_element.kind === 'span' &&
                            isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'textContainer') {
              /* special inheritance rule for ruby text container font size */
              var ruby_fs = parent.styleAttrs[imscStyles.byName.fontSize.qname]
              isd_element.styleAttrs[sa.qname] = new imscUtils.ComputedLength(0.5 * ruby_fs.rw, 0.5 * ruby_fs.rh)
            } else if (sa.qname === imscStyles.byName.fontSize.qname &&
                            !(sa.qname in isd_element.styleAttrs) &&
                            isd_element.kind === 'span' &&
                            isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'text') {
              /* special inheritance rule for ruby text font size */
              var parent_fs = parent.styleAttrs[imscStyles.byName.fontSize.qname]
              if (parent.styleAttrs[imscStyles.byName.ruby.qname] === 'textContainer') {
                isd_element.styleAttrs[sa.qname] = parent_fs
              } else {
                isd_element.styleAttrs[sa.qname] = new imscUtils.ComputedLength(0.5 * parent_fs.rw, 0.5 * parent_fs.rh)
              }
            } else if (sa.inherit &&
                            (sa.qname in parent.styleAttrs) &&
                            !(sa.qname in isd_element.styleAttrs)) {
              isd_element.styleAttrs[sa.qname] = parent.styleAttrs[sa.qname]
            }
          }
        }
        /* initial value styling */
        for (var k in imscStyles.all) {
          var ivs = imscStyles.all[k]
          /* skip if value is already specified */
          if (ivs.qname in isd_element.styleAttrs) { continue }
          /* skip tts:position if tts:origin is specified */
          if (ivs.qname === imscStyles.byName.position.qname &&
                        imscStyles.byName.origin.qname in isd_element.styleAttrs) { continue }
          /* skip tts:origin if tts:position is specified */
          if (ivs.qname === imscStyles.byName.origin.qname &&
                        imscStyles.byName.position.qname in isd_element.styleAttrs) { continue }
          /* determine initial value */
          var iv = doc.head.styling.initials[ivs.qname] || ivs.initial
          if (iv === null) {
            /* skip processing if no initial value defined */
            continue
          }
          /* apply initial value to elements other than region only if non-inherited */
          if (isd_element.kind === 'region' || (ivs.inherit === false && iv !== null)) {
            var piv = ivs.parse(iv)
            if (piv !== null) {
              isd_element.styleAttrs[ivs.qname] = piv
              /* keep track of the style as specified */
              spec_attr[ivs.qname] = true
            } else {
              reportError(errorHandler, "Invalid initial value for '" + ivs.qname + "' on element '" + isd_element.kind)
            }
          }
        }
        /* compute styles (only for non-inherited styles) */
        /* TODO: get rid of spec_attr */
        for (var z in imscStyles.all) {
          var cs = imscStyles.all[z]
          if (!(cs.qname in spec_attr)) { continue }
          if (cs.compute !== null) {
            var cstyle = cs.compute(
              /* doc, parent, element, attr, context*/
              doc, parent, isd_element, isd_element.styleAttrs[cs.qname], context)
            if (cstyle !== null) {
              isd_element.styleAttrs[cs.qname] = cstyle
            } else {
              /* if the style cannot be computed, replace it by its initial value */
              isd_element.styleAttrs[cs.qname] = cs.compute(
                /* doc, parent, element, attr, context*/
                doc, parent, isd_element, cs.parse(cs.initial), context)
              reportError(errorHandler, "Style '" + cs.qname + "' on element '" + isd_element.kind + "' cannot be computed")
            }
          }
        }
        /* prune if tts:display is none */
        if (isd_element.styleAttrs[imscStyles.byName.display.qname] === 'none') { return null }
        /* process contents of the element */
        var contents
        if (parent === null) {
          /* we are processing the region */
          if (body === null) {
            /* if there is no body, still process the region but with empty content */
            contents = []
          } else {
            /* use the body element as contents */
            contents = [body]
          }
        } else if ('contents' in elem) {
          contents = elem.contents
        }
        for (var x in contents) {
          var c = isdProcessContentElement(doc, offset, region, body, isd_element, associated_region_id, contents[x], errorHandler, context)
          /*
                     * keep child element only if they are non-null and their region match
                     * the region of this element
                     */
          if (c !== null) {
            isd_element.contents.push(c.element)
          }
        }
        /* remove styles that are not applicable */
        for (var qnameb in isd_element.styleAttrs) {
          /* true if not applicable */
          var na = false
          /* special applicability of certain style properties to ruby container spans */
          /* TODO: in the future ruby elements should be translated to elements instead of kept as spans */
          if (isd_element.kind === 'span') {
            var rsp = isd_element.styleAttrs[imscStyles.byName.ruby.qname]
            na = (rsp === 'container' || rsp === 'textContainer' || rsp === 'baseContainer') &&
                            _rcs_na_styles.indexOf(qnameb) !== -1
            if (!na) {
              na = rsp !== 'container' &&
                                qnameb === imscStyles.byName.rubyAlign.qname
            }
            if (!na) {
              na = (!(rsp === 'textContainer' || rsp === 'text')) &&
                                qnameb === imscStyles.byName.rubyPosition.qname
            }
          }
          /* normal applicability */
          if (!na) {
            var da = imscStyles.byQName[qnameb]
            na = da.applies.indexOf(isd_element.kind) === -1
          }
          if (na) {
            delete isd_element.styleAttrs[qnameb]
          }
        }
        /* trim whitespace around explicit line breaks */
        var ruby = isd_element.styleAttrs[imscStyles.byName.ruby.qname]
        if (isd_element.kind === 'p' ||
                    (isd_element.kind === 'span' && (ruby === 'textContainer' || ruby === 'text'))) {
          var elist = []
          constructSpanList(isd_element, elist)
          collapseLWSP(elist)
          pruneEmptySpans(isd_element)
        }
        /* keep element if:
                 * * contains a background image
                 * * <br/>
                 * * if there are children
                 * * if it is an image
                 * * if <span> and has text
                 * * if region and showBackground = always
                 */
        if ((isd_element.kind === 'div' && imscStyles.byName.backgroundImage.qname in isd_element.styleAttrs) ||
                    isd_element.kind === 'br' ||
                    isd_element.kind === 'image' ||
                    ('contents' in isd_element && isd_element.contents.length > 0) ||
                    (isd_element.kind === 'span' && isd_element.text !== null) ||
                    (isd_element.kind === 'region' &&
                        isd_element.styleAttrs[imscStyles.byName.showBackground.qname] === 'always')) {
          return {
            region_id: associated_region_id,
            element: isd_element
          }
        }
        return null
      }
      function collapseLWSP (elist) {
        function isPrevCharLWSP (prev_element) {
          return prev_element.kind === 'br' || /[\r\n\t ]$/.test(prev_element.text)
        }
        function isNextCharLWSP (next_element) {
          return next_element.kind === 'br' || (next_element.space === 'preserve' && /^[\r\n]/.test(next_element.text))
        }
        /* collapse spaces and remove leading LWSPs */
        var element
        for (var i = 0; i < elist.length;) {
          element = elist[i]
          if (element.kind === 'br' || element.space === 'preserve') {
            i++
            continue
          }
          var trimmed_text = element.text.replace(/[\t\r\n ]+/g, ' ')
          if (/^[ ]/.test(trimmed_text)) {
            if (i === 0 || isPrevCharLWSP(elist[i - 1])) {
              trimmed_text = trimmed_text.substring(1)
            }
          }
          element.text = trimmed_text
          if (trimmed_text.length === 0) {
            elist.splice(i, 1)
          } else {
            i++
          }
        }
        /* remove trailing LWSPs */
        for (i = 0; i < elist.length; i++) {
          element = elist[i]
          if (element.kind === 'br' || element.space === 'preserve') {
            i++
            continue
          }
          if (/[ ]$/.test(element.text)) {
            if (i === (elist.length - 1) || isNextCharLWSP(elist[i + 1])) {
              element.text = element.text.slice(0, -1)
            }
          }
        }
      }
      function constructSpanList (element, elist) {
        for (var i in element.contents) {
          var child = element.contents[i]
          var ruby = child.styleAttrs[imscStyles.byName.ruby.qname]
          if (child.kind === 'span' && (ruby === 'textContainer' || ruby === 'text')) {
            /* skip ruby text and text containers, which are handled on their own */
            continue
          } else if ('contents' in child) {
            constructSpanList(child, elist)
          } else if ((child.kind === 'span' && child.text.length !== 0) || child.kind === 'br') {
            /* skip empty spans */
            elist.push(child)
          }
        }
      }
      function pruneEmptySpans (element) {
        if (element.kind === 'br') {
          return false
        } else if ('text' in element) {
          return element.text.length === 0
        } else if ('contents' in element) {
          var i = element.contents.length
          while (i--) {
            if (pruneEmptySpans(element.contents[i])) {
              element.contents.splice(i, 1)
            }
          }
          return element.contents.length === 0
        }
      }
      function ISD (tt) {
        this.contents = []
        this.aspectRatio = tt.aspectRatio
      }
      function ISDContentElement (ttelem) {
        /* assume the element is a region if it does not have a kind */
        this.kind = ttelem.kind || 'region'
        /* copy id */
        if (ttelem.id) {
          this.id = ttelem.id
        }
        /* deep copy of style attributes */
        this.styleAttrs = {}
        for (var sname in ttelem.styleAttrs) {
          this.styleAttrs[sname] =
                        ttelem.styleAttrs[sname]
        }
        /* copy src and type if image */
        if ('src' in ttelem) {
          this.src = ttelem.src
        }
        if ('type' in ttelem) {
          this.type = ttelem.type
        }
        /* TODO: clean this!
                 * TODO: ISDElement and document element should be better tied together */
        if ('text' in ttelem) {
          this.text = ttelem.text
        } else if (this.kind === 'region' || 'contents' in ttelem) {
          this.contents = []
        }
        if ('space' in ttelem) {
          this.space = ttelem.space
        }
      }
      function reportError (errorHandler, msg) {
        if (errorHandler && errorHandler.error && errorHandler.error(msg)) { throw msg }
      }
    })(exports, typeof imscNames === 'undefined' ? names : imscNames, typeof imscStyles === 'undefined' ? styles : imscStyles, typeof imscUtils === 'undefined' ? utils : imscUtils)
  })
  var sax$1 = createCommonjsModule(function (module, exports) {
    (function (sax) {
      sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
      sax.SAXParser = SAXParser
      sax.SAXStream = SAXStream
      sax.createStream = createStream
      // When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
      // When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
      // since that's the earliest that a buffer overrun could occur.  This way, checks are
      // as rare as required, but as often as necessary to ensure never crossing this bound.
      // Furthermore, buffers are only tested at most once per write(), so passing a very
      // large string into write() might have undesirable effects, but this is manageable by
      // the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
      // edge case, result in creating at most one complete copy of the string passed in.
      // Set to Infinity to have unlimited buffers.
      sax.MAX_BUFFER_LENGTH = 64 * 1024
      var buffers = [
        'comment', 'sgmlDecl', 'textNode', 'tagName', 'doctype',
        'procInstName', 'procInstBody', 'entity', 'attribName',
        'attribValue', 'cdata', 'script'
      ]
      sax.EVENTS = [
        'text',
        'processinginstruction',
        'sgmldeclaration',
        'doctype',
        'comment',
        'opentagstart',
        'attribute',
        'opentag',
        'closetag',
        'opencdata',
        'cdata',
        'closecdata',
        'error',
        'end',
        'ready',
        'script',
        'opennamespace',
        'closenamespace'
      ]
      function SAXParser (strict, opt) {
        if (!(this instanceof SAXParser)) {
          return new SAXParser(strict, opt)
        }
        var parser = this
        clearBuffers(parser)
        parser.q = parser.c = ''
        parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
        parser.opt = opt || {}
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags
        parser.looseCase = parser.opt.lowercase ? 'toLowerCase' : 'toUpperCase'
        parser.tags = []
        parser.closed = parser.closedRoot = parser.sawRoot = false
        parser.tag = parser.error = null
        parser.strict = !!strict
        parser.noscript = !!(strict || parser.opt.noscript)
        parser.state = S.BEGIN
        parser.strictEntities = parser.opt.strictEntities
        parser.ENTITIES = parser.strictEntities ? Object.create(sax.XML_ENTITIES) : Object.create(sax.ENTITIES)
        parser.attribList = []
        // namespaces form a prototype chain.
        // it always points at the current tag,
        // which protos to its parent tag.
        if (parser.opt.xmlns) {
          parser.ns = Object.create(rootNS)
        }
        // mostly just for error reporting
        parser.trackPosition = parser.opt.position !== false
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0
        }
        emit(parser, 'onready')
      }
      if (!Object.create) {
        Object.create = function (o) {
          function F () { }
          F.prototype = o
          var newf = new F()
          return newf
        }
      }
      if (!Object.keys) {
        Object.keys = function (o) {
          var a = []
          for (var i in o) {
            if (o.hasOwnProperty(i)) { a.push(i) }
          }
          return a
        }
      }
      function checkBufferLength (parser) {
        var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
        var maxActual = 0
        for (var i = 0, l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length
          if (len > maxAllowed) {
            // Text/cdata nodes can get big, and since they're buffered,
            // we can get here under normal conditions.
            // Avoid issues by emitting the text node now,
            // so at least it won't get any bigger.
            switch (buffers[i]) {
              case 'textNode':
                closeText(parser)
                break
              case 'cdata':
                emitNode(parser, 'oncdata', parser.cdata)
                parser.cdata = ''
                break
              case 'script':
                emitNode(parser, 'onscript', parser.script)
                parser.script = ''
                break
              default:
                error(parser, 'Max buffer length exceeded: ' + buffers[i])
            }
          }
          maxActual = Math.max(maxActual, len)
        }
        // schedule the next check for the earliest possible buffer overrun.
        var m = sax.MAX_BUFFER_LENGTH - maxActual
        parser.bufferCheckPosition = m + parser.position
      }
      function clearBuffers (parser) {
        for (var i = 0, l = buffers.length; i < l; i++) {
          parser[buffers[i]] = ''
        }
      }
      function flushBuffers (parser) {
        closeText(parser)
        if (parser.cdata !== '') {
          emitNode(parser, 'oncdata', parser.cdata)
          parser.cdata = ''
        }
        if (parser.script !== '') {
          emitNode(parser, 'onscript', parser.script)
          parser.script = ''
        }
      }
      SAXParser.prototype = {
        end: function () { end(this) },
        write: write,
        resume: function () { this.error = null; return this },
        close: function () { return this.write(null) },
        flush: function () { flushBuffers(this) }
      }
      var Stream
      try {
        Stream = require('stream').Stream
      } catch (ex) {
        Stream = function () { }
      }
      var streamWraps = sax.EVENTS.filter(function (ev) {
        return ev !== 'error' && ev !== 'end'
      })
      function createStream (strict, opt) {
        return new SAXStream(strict, opt)
      }
      function SAXStream (strict, opt) {
        if (!(this instanceof SAXStream)) {
          return new SAXStream(strict, opt)
        }
        Stream.apply(this)
        this._parser = new SAXParser(strict, opt)
        this.writable = true
        this.readable = true
        var me = this
        this._parser.onend = function () {
          me.emit('end')
        }
        this._parser.onerror = function (er) {
          me.emit('error', er)
          // if didn't throw, then means error was handled.
          // go ahead and clear error, so we can write again.
          me._parser.error = null
        }
        this._decoder = null
        streamWraps.forEach(function (ev) {
          Object.defineProperty(me, 'on' + ev, {
            get: function () {
              return me._parser['on' + ev]
            },
            set: function (h) {
              if (!h) {
                me.removeAllListeners(ev)
                me._parser['on' + ev] = h
                return h
              }
              me.on(ev, h)
            },
            enumerable: true,
            configurable: false
          })
        })
      }
      SAXStream.prototype = Object.create(Stream.prototype, {
        constructor: {
          value: SAXStream
        }
      })
      SAXStream.prototype.write = function (data) {
        if (typeof Buffer === 'function' &&
                    typeof Buffer.isBuffer === 'function' &&
                    Buffer.isBuffer(data)) {
          if (!this._decoder) {
            var SD = require('string_decoder').StringDecoder
            this._decoder = new SD('utf8')
          }
          data = this._decoder.write(data)
        }
        this._parser.write(data.toString())
        this.emit('data', data)
        return true
      }
      SAXStream.prototype.end = function (chunk) {
        if (chunk && chunk.length) {
          this.write(chunk)
        }
        this._parser.end()
        return true
      }
      SAXStream.prototype.on = function (ev, handler) {
        var me = this
        if (!me._parser['on' + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser['on' + ev] = function () {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)
            args.splice(0, 0, ev)
            me.emit.apply(me, args)
          }
        }
        return Stream.prototype.on.call(me, ev, handler)
      }
      // this really needs to be replaced with character classes.
      // XML allows all manner of ridiculous numbers and digits.
      var CDATA = '[CDATA['
      var DOCTYPE = 'DOCTYPE'
      var XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace'
      var XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/'
      var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }
      // http://www.w3.org/TR/REC-xml/#NT-NameStartChar
      // This implementation works on strings, a single character at a time
      // as such, it cannot ever support astral-plane characters (10000-EFFFF)
      // without a significant breaking change to either this  parser, or the
      // JavaScript language.  Implementation of an emoji-capable xml parser
      // is left as an exercise for the reader.
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/
      var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/
      var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/
      function isWhitespace (c) {
        return c === ' ' || c === '\n' || c === '\r' || c === '\t'
      }
      function isQuote (c) {
        return c === '"' || c === '\''
      }
      function isAttribEnd (c) {
        return c === '>' || isWhitespace(c)
      }
      function isMatch (regex, c) {
        return regex.test(c)
      }
      function notMatch (regex, c) {
        return !isMatch(regex, c)
      }
      var S = 0
      sax.STATE = {
        BEGIN: S++,
        BEGIN_WHITESPACE: S++,
        TEXT: S++,
        TEXT_ENTITY: S++,
        OPEN_WAKA: S++,
        SGML_DECL: S++,
        SGML_DECL_QUOTED: S++,
        DOCTYPE: S++,
        DOCTYPE_QUOTED: S++,
        DOCTYPE_DTD: S++,
        DOCTYPE_DTD_QUOTED: S++,
        COMMENT_STARTING: S++,
        COMMENT: S++,
        COMMENT_ENDING: S++,
        COMMENT_ENDED: S++,
        CDATA: S++,
        CDATA_ENDING: S++,
        CDATA_ENDING_2: S++,
        PROC_INST: S++,
        PROC_INST_BODY: S++,
        PROC_INST_ENDING: S++,
        OPEN_TAG: S++,
        OPEN_TAG_SLASH: S++,
        ATTRIB: S++,
        ATTRIB_NAME: S++,
        ATTRIB_NAME_SAW_WHITE: S++,
        ATTRIB_VALUE: S++,
        ATTRIB_VALUE_QUOTED: S++,
        ATTRIB_VALUE_CLOSED: S++,
        ATTRIB_VALUE_UNQUOTED: S++,
        ATTRIB_VALUE_ENTITY_Q: S++,
        ATTRIB_VALUE_ENTITY_U: S++,
        CLOSE_TAG: S++,
        CLOSE_TAG_SAW_WHITE: S++,
        SCRIPT: S++,
        SCRIPT_ENDING: S++ // <script> ... <
      }
      sax.XML_ENTITIES = {
        'amp': '&',
        'gt': '>',
        'lt': '<',
        'quot': '"',
        'apos': "'"
      }
      sax.ENTITIES = {
        'amp': '&',
        'gt': '>',
        'lt': '<',
        'quot': '"',
        'apos': "'",
        'AElig': 198,
        'Aacute': 193,
        'Acirc': 194,
        'Agrave': 192,
        'Aring': 197,
        'Atilde': 195,
        'Auml': 196,
        'Ccedil': 199,
        'ETH': 208,
        'Eacute': 201,
        'Ecirc': 202,
        'Egrave': 200,
        'Euml': 203,
        'Iacute': 205,
        'Icirc': 206,
        'Igrave': 204,
        'Iuml': 207,
        'Ntilde': 209,
        'Oacute': 211,
        'Ocirc': 212,
        'Ograve': 210,
        'Oslash': 216,
        'Otilde': 213,
        'Ouml': 214,
        'THORN': 222,
        'Uacute': 218,
        'Ucirc': 219,
        'Ugrave': 217,
        'Uuml': 220,
        'Yacute': 221,
        'aacute': 225,
        'acirc': 226,
        'aelig': 230,
        'agrave': 224,
        'aring': 229,
        'atilde': 227,
        'auml': 228,
        'ccedil': 231,
        'eacute': 233,
        'ecirc': 234,
        'egrave': 232,
        'eth': 240,
        'euml': 235,
        'iacute': 237,
        'icirc': 238,
        'igrave': 236,
        'iuml': 239,
        'ntilde': 241,
        'oacute': 243,
        'ocirc': 244,
        'ograve': 242,
        'oslash': 248,
        'otilde': 245,
        'ouml': 246,
        'szlig': 223,
        'thorn': 254,
        'uacute': 250,
        'ucirc': 251,
        'ugrave': 249,
        'uuml': 252,
        'yacute': 253,
        'yuml': 255,
        'copy': 169,
        'reg': 174,
        'nbsp': 160,
        'iexcl': 161,
        'cent': 162,
        'pound': 163,
        'curren': 164,
        'yen': 165,
        'brvbar': 166,
        'sect': 167,
        'uml': 168,
        'ordf': 170,
        'laquo': 171,
        'not': 172,
        'shy': 173,
        'macr': 175,
        'deg': 176,
        'plusmn': 177,
        'sup1': 185,
        'sup2': 178,
        'sup3': 179,
        'acute': 180,
        'micro': 181,
        'para': 182,
        'middot': 183,
        'cedil': 184,
        'ordm': 186,
        'raquo': 187,
        'frac14': 188,
        'frac12': 189,
        'frac34': 190,
        'iquest': 191,
        'times': 215,
        'divide': 247,
        'OElig': 338,
        'oelig': 339,
        'Scaron': 352,
        'scaron': 353,
        'Yuml': 376,
        'fnof': 402,
        'circ': 710,
        'tilde': 732,
        'Alpha': 913,
        'Beta': 914,
        'Gamma': 915,
        'Delta': 916,
        'Epsilon': 917,
        'Zeta': 918,
        'Eta': 919,
        'Theta': 920,
        'Iota': 921,
        'Kappa': 922,
        'Lambda': 923,
        'Mu': 924,
        'Nu': 925,
        'Xi': 926,
        'Omicron': 927,
        'Pi': 928,
        'Rho': 929,
        'Sigma': 931,
        'Tau': 932,
        'Upsilon': 933,
        'Phi': 934,
        'Chi': 935,
        'Psi': 936,
        'Omega': 937,
        'alpha': 945,
        'beta': 946,
        'gamma': 947,
        'delta': 948,
        'epsilon': 949,
        'zeta': 950,
        'eta': 951,
        'theta': 952,
        'iota': 953,
        'kappa': 954,
        'lambda': 955,
        'mu': 956,
        'nu': 957,
        'xi': 958,
        'omicron': 959,
        'pi': 960,
        'rho': 961,
        'sigmaf': 962,
        'sigma': 963,
        'tau': 964,
        'upsilon': 965,
        'phi': 966,
        'chi': 967,
        'psi': 968,
        'omega': 969,
        'thetasym': 977,
        'upsih': 978,
        'piv': 982,
        'ensp': 8194,
        'emsp': 8195,
        'thinsp': 8201,
        'zwnj': 8204,
        'zwj': 8205,
        'lrm': 8206,
        'rlm': 8207,
        'ndash': 8211,
        'mdash': 8212,
        'lsquo': 8216,
        'rsquo': 8217,
        'sbquo': 8218,
        'ldquo': 8220,
        'rdquo': 8221,
        'bdquo': 8222,
        'dagger': 8224,
        'Dagger': 8225,
        'bull': 8226,
        'hellip': 8230,
        'permil': 8240,
        'prime': 8242,
        'Prime': 8243,
        'lsaquo': 8249,
        'rsaquo': 8250,
        'oline': 8254,
        'frasl': 8260,
        'euro': 8364,
        'image': 8465,
        'weierp': 8472,
        'real': 8476,
        'trade': 8482,
        'alefsym': 8501,
        'larr': 8592,
        'uarr': 8593,
        'rarr': 8594,
        'darr': 8595,
        'harr': 8596,
        'crarr': 8629,
        'lArr': 8656,
        'uArr': 8657,
        'rArr': 8658,
        'dArr': 8659,
        'hArr': 8660,
        'forall': 8704,
        'part': 8706,
        'exist': 8707,
        'empty': 8709,
        'nabla': 8711,
        'isin': 8712,
        'notin': 8713,
        'ni': 8715,
        'prod': 8719,
        'sum': 8721,
        'minus': 8722,
        'lowast': 8727,
        'radic': 8730,
        'prop': 8733,
        'infin': 8734,
        'ang': 8736,
        'and': 8743,
        'or': 8744,
        'cap': 8745,
        'cup': 8746,
        'int': 8747,
        'there4': 8756,
        'sim': 8764,
        'cong': 8773,
        'asymp': 8776,
        'ne': 8800,
        'equiv': 8801,
        'le': 8804,
        'ge': 8805,
        'sub': 8834,
        'sup': 8835,
        'nsub': 8836,
        'sube': 8838,
        'supe': 8839,
        'oplus': 8853,
        'otimes': 8855,
        'perp': 8869,
        'sdot': 8901,
        'lceil': 8968,
        'rceil': 8969,
        'lfloor': 8970,
        'rfloor': 8971,
        'lang': 9001,
        'rang': 9002,
        'loz': 9674,
        'spades': 9824,
        'clubs': 9827,
        'hearts': 9829,
        'diams': 9830
      }
      Object.keys(sax.ENTITIES).forEach(function (key) {
        var e = sax.ENTITIES[key]
        var s = typeof e === 'number' ? String.fromCharCode(e) : e
        sax.ENTITIES[key] = s
      })
      for (var s in sax.STATE) {
        sax.STATE[sax.STATE[s]] = s
      }
      // shorthand
      S = sax.STATE
      function emit (parser, event, data) {
        parser[event] && parser[event](data)
      }
      function emitNode (parser, nodeType, data) {
        if (parser.textNode) { closeText(parser) }
        emit(parser, nodeType, data)
      }
      function closeText (parser) {
        parser.textNode = textopts(parser.opt, parser.textNode)
        if (parser.textNode) { emit(parser, 'ontext', parser.textNode) }
        parser.textNode = ''
      }
      function textopts (opt, text) {
        if (opt.trim) { text = text.trim() }
        if (opt.normalize) { text = text.replace(/\s+/g, ' ') }
        return text
      }
      function error (parser, er) {
        closeText(parser)
        if (parser.trackPosition) {
          er += '\nLine: ' + parser.line +
                        '\nColumn: ' + parser.column +
                        '\nChar: ' + parser.c
        }
        er = new Error(er)
        parser.error = er
        emit(parser, 'onerror', er)
        return parser
      }
      function end (parser) {
        if (parser.sawRoot && !parser.closedRoot) { strictFail(parser, 'Unclosed root tag') }
        if ((parser.state !== S.BEGIN) &&
                    (parser.state !== S.BEGIN_WHITESPACE) &&
                    (parser.state !== S.TEXT)) {
          error(parser, 'Unexpected end')
        }
        closeText(parser)
        parser.c = ''
        parser.closed = true
        emit(parser, 'onend')
        SAXParser.call(parser, parser.strict, parser.opt)
        return parser
      }
      function strictFail (parser, message) {
        if (typeof parser !== 'object' || !(parser instanceof SAXParser)) {
          throw new Error('bad call to strictFail')
        }
        if (parser.strict) {
          error(parser, message)
        }
      }
      function newTag (parser) {
        if (!parser.strict) { parser.tagName = parser.tagName[parser.looseCase]() }
        var parent = parser.tags[parser.tags.length - 1] || parser
        var tag = parser.tag = { name: parser.tagName, attributes: {} }
        // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
        if (parser.opt.xmlns) {
          tag.ns = parent.ns
        }
        parser.attribList.length = 0
        emitNode(parser, 'onopentagstart', tag)
      }
      function qname (name, attribute) {
        var i = name.indexOf(':')
        var qualName = i < 0 ? ['', name] : name.split(':')
        var prefix = qualName[0]
        var local = qualName[1]
        // <x "xmlns"="http://foo">
        if (attribute && name === 'xmlns') {
          prefix = 'xmlns'
          local = ''
        }
        return { prefix: prefix, local: local }
      }
      function attrib (parser) {
        if (!parser.strict) {
          parser.attribName = parser.attribName[parser.looseCase]()
        }
        if (parser.attribList.indexOf(parser.attribName) !== -1 ||
                    parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          parser.attribName = parser.attribValue = ''
          return
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true)
          var prefix = qn.prefix
          var local = qn.local
          if (prefix === 'xmlns') {
            // namespace binding attribute. push the binding into scope
            if (local === 'xml' && parser.attribValue !== XML_NAMESPACE) {
              strictFail(parser, 'xml: prefix must be bound to ' + XML_NAMESPACE + '\n' +
                                'Actual: ' + parser.attribValue)
            } else if (local === 'xmlns' && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(parser, 'xmlns: prefix must be bound to ' + XMLNS_NAMESPACE + '\n' +
                                'Actual: ' + parser.attribValue)
            } else {
              var tag = parser.tag
              var parent = parser.tags[parser.tags.length - 1] || parser
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns)
              }
              tag.ns[local] = parser.attribValue
            }
          }
          // defer onattribute events until all attributes have been seen
          // so any new bindings can take effect. preserve attribute order
          // so deferred events can be emitted in document order
          parser.attribList.push([parser.attribName, parser.attribValue])
        } else {
          // in non-xmlns mode, we can emit the event right away
          parser.tag.attributes[parser.attribName] = parser.attribValue
          emitNode(parser, 'onattribute', {
            name: parser.attribName,
            value: parser.attribValue
          })
        }
        parser.attribName = parser.attribValue = ''
      }
      function openTag (parser, selfClosing) {
        if (parser.opt.xmlns) {
          // emit namespace binding events
          var tag = parser.tag
          // add namespace info to tag
          var qn = qname(parser.tagName)
          tag.prefix = qn.prefix
          tag.local = qn.local
          tag.uri = tag.ns[qn.prefix] || ''
          if (tag.prefix && !tag.uri) {
            strictFail(parser, 'Unbound namespace prefix: ' +
                            JSON.stringify(parser.tagName))
            tag.uri = qn.prefix
          }
          var parent = parser.tags[parser.tags.length - 1] || parser
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function (p) {
              emitNode(parser, 'onopennamespace', {
                prefix: p,
                uri: tag.ns[p]
              })
            })
          }
          // handle deferred onattribute events
          // Note: do not apply default ns to attributes:
          //   http://www.w3.org/TR/REC-xml-names/#defaulting
          for (var i = 0, l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i]
            var name = nv[0]
            var value = nv[1]
            var qualName = qname(name, true)
            var prefix = qualName.prefix
            var local = qualName.local
            var uri = prefix === '' ? '' : (tag.ns[prefix] || '')
            var a = {
              name: name,
              value: value,
              prefix: prefix,
              local: local,
              uri: uri
            }
            // if there's any attributes with an undefined namespace,
            // then fail on them now.
            if (prefix && prefix !== 'xmlns' && !uri) {
              strictFail(parser, 'Unbound namespace prefix: ' +
                                JSON.stringify(prefix))
              a.uri = prefix
            }
            parser.tag.attributes[name] = a
            emitNode(parser, 'onattribute', a)
          }
          parser.attribList.length = 0
        }
        parser.tag.isSelfClosing = !!selfClosing
        // process the tag
        parser.sawRoot = true
        parser.tags.push(parser.tag)
        emitNode(parser, 'onopentag', parser.tag)
        if (!selfClosing) {
          // special case for <script> in non-strict mode.
          if (!parser.noscript && parser.tagName.toLowerCase() === 'script') {
            parser.state = S.SCRIPT
          } else {
            parser.state = S.TEXT
          }
          parser.tag = null
          parser.tagName = ''
        }
        parser.attribName = parser.attribValue = ''
        parser.attribList.length = 0
      }
      function closeTag (parser) {
        if (!parser.tagName) {
          strictFail(parser, 'Weird empty close tag.')
          parser.textNode += '</>'
          parser.state = S.TEXT
          return
        }
        if (parser.script) {
          if (parser.tagName !== 'script') {
            parser.script += '</' + parser.tagName + '>'
            parser.tagName = ''
            parser.state = S.SCRIPT
            return
          }
          emitNode(parser, 'onscript', parser.script)
          parser.script = ''
        }
        // first make sure that the closing tag actually exists.
        // <a><b></c></b></a> will close everything, otherwise.
        var t = parser.tags.length
        var tagName = parser.tagName
        if (!parser.strict) {
          tagName = tagName[parser.looseCase]()
        }
        var closeTo = tagName
        while (t--) {
          var close = parser.tags[t]
          if (close.name !== closeTo) {
            // fail the first time in strict mode
            strictFail(parser, 'Unexpected close tag')
          } else {
            break
          }
        }
        // didn't find it.  we already failed for strict, so just abort.
        if (t < 0) {
          strictFail(parser, 'Unmatched closing tag: ' + parser.tagName)
          parser.textNode += '</' + parser.tagName + '>'
          parser.state = S.TEXT
          return
        }
        parser.tagName = tagName
        var s = parser.tags.length
        while (s-- > t) {
          var tag = parser.tag = parser.tags.pop()
          parser.tagName = parser.tag.name
          emitNode(parser, 'onclosetag', parser.tagName)
          var x = {}
          for (var i in tag.ns) {
            x[i] = tag.ns[i]
          }
          var parent = parser.tags[parser.tags.length - 1] || parser
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            // remove namespace bindings introduced by tag
            Object.keys(tag.ns).forEach(function (p) {
              var n = tag.ns[p]
              emitNode(parser, 'onclosenamespace', { prefix: p, uri: n })
            })
          }
        }
        if (t === 0) { parser.closedRoot = true }
        parser.tagName = parser.attribValue = parser.attribName = ''
        parser.attribList.length = 0
        parser.state = S.TEXT
      }
      function parseEntity (parser) {
        var entity = parser.entity
        var entityLC = entity.toLowerCase()
        var num
        var numStr = ''
        if (parser.ENTITIES[entity]) {
          return parser.ENTITIES[entity]
        }
        if (parser.ENTITIES[entityLC]) {
          return parser.ENTITIES[entityLC]
        }
        entity = entityLC
        if (entity.charAt(0) === '#') {
          if (entity.charAt(1) === 'x') {
            entity = entity.slice(2)
            num = parseInt(entity, 16)
            numStr = num.toString(16)
          } else {
            entity = entity.slice(1)
            num = parseInt(entity, 10)
            numStr = num.toString(10)
          }
        }
        entity = entity.replace(/^0+/, '')
        if (isNaN(num) || numStr.toLowerCase() !== entity) {
          strictFail(parser, 'Invalid character entity')
          return '&' + parser.entity + ';'
        }
        return String.fromCodePoint(num)
      }
      function beginWhiteSpace (parser, c) {
        if (c === '<') {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else if (!isWhitespace(c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, 'Non-whitespace before first tag.')
          parser.textNode = c
          parser.state = S.TEXT
        }
      }
      function charAt (chunk, i) {
        var result = ''
        if (i < chunk.length) {
          result = chunk.charAt(i)
        }
        return result
      }
      function write (chunk) {
        var parser = this
        if (this.error) {
          throw this.error
        }
        if (parser.closed) {
          return error(parser, 'Cannot write after close. Assign an onready handler.')
        }
        if (chunk === null) {
          return end(parser)
        }
        if (typeof chunk === 'object') {
          chunk = chunk.toString()
        }
        var i = 0
        var c = ''
        while (true) {
          c = charAt(chunk, i++)
          parser.c = c
          if (!c) {
            break
          }
          if (parser.trackPosition) {
            parser.position++
            if (c === '\n') {
              parser.line++
              parser.column = 0
            } else {
              parser.column++
            }
          }
          switch (parser.state) {
            case S.BEGIN:
              parser.state = S.BEGIN_WHITESPACE
              if (c === '\uFEFF') {
                continue
              }
              beginWhiteSpace(parser, c)
              continue
            case S.BEGIN_WHITESPACE:
              beginWhiteSpace(parser, c)
              continue
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1
                while (c && c !== '<' && c !== '&') {
                  c = charAt(chunk, i++)
                  if (c && parser.trackPosition) {
                    parser.position++
                    if (c === '\n') {
                      parser.line++
                      parser.column = 0
                    } else {
                      parser.column++
                    }
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1)
              }
              if (c === '<' && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
                parser.state = S.OPEN_WAKA
                parser.startTagPosition = parser.position
              } else {
                if (!isWhitespace(c) && (!parser.sawRoot || parser.closedRoot)) {
                  strictFail(parser, 'Text data outside of root node.')
                }
                if (c === '&') {
                  parser.state = S.TEXT_ENTITY
                } else {
                  parser.textNode += c
                }
              }
              continue
            case S.SCRIPT:
              // only non-strict
              if (c === '<') {
                parser.state = S.SCRIPT_ENDING
              } else {
                parser.script += c
              }
              continue
            case S.SCRIPT_ENDING:
              if (c === '/') {
                parser.state = S.CLOSE_TAG
              } else {
                parser.script += '<' + c
                parser.state = S.SCRIPT
              }
              continue
            case S.OPEN_WAKA:
              // either a /, ?, !, or text is coming next.
              if (c === '!') {
                parser.state = S.SGML_DECL
                parser.sgmlDecl = ''
              } else if (isWhitespace(c))
                ;
              else if (isMatch(nameStart, c)) {
                parser.state = S.OPEN_TAG
                parser.tagName = c
              } else if (c === '/') {
                parser.state = S.CLOSE_TAG
                parser.tagName = ''
              } else if (c === '?') {
                parser.state = S.PROC_INST
                parser.procInstName = parser.procInstBody = ''
              } else {
                strictFail(parser, 'Unencoded <')
                // if there was some whitespace, then add that in.
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition
                  c = new Array(pad).join(' ') + c
                }
                parser.textNode += '<' + c
                parser.state = S.TEXT
              }
              continue
            case S.SGML_DECL:
              if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
                emitNode(parser, 'onopencdata')
                parser.state = S.CDATA
                parser.sgmlDecl = ''
                parser.cdata = ''
              } else if (parser.sgmlDecl + c === '--') {
                parser.state = S.COMMENT
                parser.comment = ''
                parser.sgmlDecl = ''
              } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
                parser.state = S.DOCTYPE
                if (parser.doctype || parser.sawRoot) {
                  strictFail(parser, 'Inappropriately located doctype declaration')
                }
                parser.doctype = ''
                parser.sgmlDecl = ''
              } else if (c === '>') {
                emitNode(parser, 'onsgmldeclaration', parser.sgmlDecl)
                parser.sgmlDecl = ''
                parser.state = S.TEXT
              } else if (isQuote(c)) {
                parser.state = S.SGML_DECL_QUOTED
                parser.sgmlDecl += c
              } else {
                parser.sgmlDecl += c
              }
              continue
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL
                parser.q = ''
              }
              parser.sgmlDecl += c
              continue
            case S.DOCTYPE:
              if (c === '>') {
                parser.state = S.TEXT
                emitNode(parser, 'ondoctype', parser.doctype)
                parser.doctype = true // just remember that we saw it.
              } else {
                parser.doctype += c
                if (c === '[') {
                  parser.state = S.DOCTYPE_DTD
                } else if (isQuote(c)) {
                  parser.state = S.DOCTYPE_QUOTED
                  parser.q = c
                }
              }
              continue
            case S.DOCTYPE_QUOTED:
              parser.doctype += c
              if (c === parser.q) {
                parser.q = ''
                parser.state = S.DOCTYPE
              }
              continue
            case S.DOCTYPE_DTD:
              parser.doctype += c
              if (c === ']') {
                parser.state = S.DOCTYPE
              } else if (isQuote(c)) {
                parser.state = S.DOCTYPE_DTD_QUOTED
                parser.q = c
              }
              continue
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD
                parser.q = ''
              }
              continue
            case S.COMMENT:
              if (c === '-') {
                parser.state = S.COMMENT_ENDING
              } else {
                parser.comment += c
              }
              continue
            case S.COMMENT_ENDING:
              if (c === '-') {
                parser.state = S.COMMENT_ENDED
                parser.comment = textopts(parser.opt, parser.comment)
                if (parser.comment) {
                  emitNode(parser, 'oncomment', parser.comment)
                }
                parser.comment = ''
              } else {
                parser.comment += '-' + c
                parser.state = S.COMMENT
              }
              continue
            case S.COMMENT_ENDED:
              if (c !== '>') {
                strictFail(parser, 'Malformed comment')
                // allow <!-- blah -- bloo --> in non-strict mode,
                // which is a comment of " blah -- bloo "
                parser.comment += '--' + c
                parser.state = S.COMMENT
              } else {
                parser.state = S.TEXT
              }
              continue
            case S.CDATA:
              if (c === ']') {
                parser.state = S.CDATA_ENDING
              } else {
                parser.cdata += c
              }
              continue
            case S.CDATA_ENDING:
              if (c === ']') {
                parser.state = S.CDATA_ENDING_2
              } else {
                parser.cdata += ']' + c
                parser.state = S.CDATA
              }
              continue
            case S.CDATA_ENDING_2:
              if (c === '>') {
                if (parser.cdata) {
                  emitNode(parser, 'oncdata', parser.cdata)
                }
                emitNode(parser, 'onclosecdata')
                parser.cdata = ''
                parser.state = S.TEXT
              } else if (c === ']') {
                parser.cdata += ']'
              } else {
                parser.cdata += ']]' + c
                parser.state = S.CDATA
              }
              continue
            case S.PROC_INST:
              if (c === '?') {
                parser.state = S.PROC_INST_ENDING
              } else if (isWhitespace(c)) {
                parser.state = S.PROC_INST_BODY
              } else {
                parser.procInstName += c
              }
              continue
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && isWhitespace(c)) {
                continue
              } else if (c === '?') {
                parser.state = S.PROC_INST_ENDING
              } else {
                parser.procInstBody += c
              }
              continue
            case S.PROC_INST_ENDING:
              if (c === '>') {
                emitNode(parser, 'onprocessinginstruction', {
                  name: parser.procInstName,
                  body: parser.procInstBody
                })
                parser.procInstName = parser.procInstBody = ''
                parser.state = S.TEXT
              } else {
                parser.procInstBody += '?' + c
                parser.state = S.PROC_INST_BODY
              }
              continue
            case S.OPEN_TAG:
              if (isMatch(nameBody, c)) {
                parser.tagName += c
              } else {
                newTag(parser)
                if (c === '>') {
                  openTag(parser)
                } else if (c === '/') {
                  parser.state = S.OPEN_TAG_SLASH
                } else {
                  if (!isWhitespace(c)) {
                    strictFail(parser, 'Invalid character in tag name')
                  }
                  parser.state = S.ATTRIB
                }
              }
              continue
            case S.OPEN_TAG_SLASH:
              if (c === '>') {
                openTag(parser, true)
                closeTag(parser)
              } else {
                strictFail(parser, 'Forward-slash in opening tag not followed by >')
                parser.state = S.ATTRIB
              }
              continue
            case S.ATTRIB:
              // haven't read the attribute name yet.
              if (isWhitespace(c)) {
                continue
              } else if (c === '>') {
                openTag(parser)
              } else if (c === '/') {
                parser.state = S.OPEN_TAG_SLASH
              } else if (isMatch(nameStart, c)) {
                parser.attribName = c
                parser.attribValue = ''
                parser.state = S.ATTRIB_NAME
              } else {
                strictFail(parser, 'Invalid attribute name')
              }
              continue
            case S.ATTRIB_NAME:
              if (c === '=') {
                parser.state = S.ATTRIB_VALUE
              } else if (c === '>') {
                strictFail(parser, 'Attribute without value')
                parser.attribValue = parser.attribName
                attrib(parser)
                openTag(parser)
              } else if (isWhitespace(c)) {
                parser.state = S.ATTRIB_NAME_SAW_WHITE
              } else if (isMatch(nameBody, c)) {
                parser.attribName += c
              } else {
                strictFail(parser, 'Invalid attribute name')
              }
              continue
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === '=') {
                parser.state = S.ATTRIB_VALUE
              } else if (isWhitespace(c)) {
                continue
              } else {
                strictFail(parser, 'Attribute without value')
                parser.tag.attributes[parser.attribName] = ''
                parser.attribValue = ''
                emitNode(parser, 'onattribute', {
                  name: parser.attribName,
                  value: ''
                })
                parser.attribName = ''
                if (c === '>') {
                  openTag(parser)
                } else if (isMatch(nameStart, c)) {
                  parser.attribName = c
                  parser.state = S.ATTRIB_NAME
                } else {
                  strictFail(parser, 'Invalid attribute name')
                  parser.state = S.ATTRIB
                }
              }
              continue
            case S.ATTRIB_VALUE:
              if (isWhitespace(c)) {
                continue
              } else if (isQuote(c)) {
                parser.q = c
                parser.state = S.ATTRIB_VALUE_QUOTED
              } else {
                strictFail(parser, 'Unquoted attribute value')
                parser.state = S.ATTRIB_VALUE_UNQUOTED
                parser.attribValue = c
              }
              continue
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === '&') {
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q
                } else {
                  parser.attribValue += c
                }
                continue
              }
              attrib(parser)
              parser.q = ''
              parser.state = S.ATTRIB_VALUE_CLOSED
              continue
            case S.ATTRIB_VALUE_CLOSED:
              if (isWhitespace(c)) {
                parser.state = S.ATTRIB
              } else if (c === '>') {
                openTag(parser)
              } else if (c === '/') {
                parser.state = S.OPEN_TAG_SLASH
              } else if (isMatch(nameStart, c)) {
                strictFail(parser, 'No whitespace between attributes')
                parser.attribName = c
                parser.attribValue = ''
                parser.state = S.ATTRIB_NAME
              } else {
                strictFail(parser, 'Invalid attribute name')
              }
              continue
            case S.ATTRIB_VALUE_UNQUOTED:
              if (!isAttribEnd(c)) {
                if (c === '&') {
                  parser.state = S.ATTRIB_VALUE_ENTITY_U
                } else {
                  parser.attribValue += c
                }
                continue
              }
              attrib(parser)
              if (c === '>') {
                openTag(parser)
              } else {
                parser.state = S.ATTRIB
              }
              continue
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (isWhitespace(c)) {
                  continue
                } else if (notMatch(nameStart, c)) {
                  if (parser.script) {
                    parser.script += '</' + c
                    parser.state = S.SCRIPT
                  } else {
                    strictFail(parser, 'Invalid tagname in closing tag.')
                  }
                } else {
                  parser.tagName = c
                }
              } else if (c === '>') {
                closeTag(parser)
              } else if (isMatch(nameBody, c)) {
                parser.tagName += c
              } else if (parser.script) {
                parser.script += '</' + parser.tagName
                parser.tagName = ''
                parser.state = S.SCRIPT
              } else {
                if (!isWhitespace(c)) {
                  strictFail(parser, 'Invalid tagname in closing tag')
                }
                parser.state = S.CLOSE_TAG_SAW_WHITE
              }
              continue
            case S.CLOSE_TAG_SAW_WHITE:
              if (isWhitespace(c)) {
                continue
              }
              if (c === '>') {
                closeTag(parser)
              } else {
                strictFail(parser, 'Invalid characters in closing tag')
              }
              continue
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              var returnState
              var buffer
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  returnState = S.TEXT
                  buffer = 'textNode'
                  break
                case S.ATTRIB_VALUE_ENTITY_Q:
                  returnState = S.ATTRIB_VALUE_QUOTED
                  buffer = 'attribValue'
                  break
                case S.ATTRIB_VALUE_ENTITY_U:
                  returnState = S.ATTRIB_VALUE_UNQUOTED
                  buffer = 'attribValue'
                  break
              }
              if (c === ';') {
                parser[buffer] += parseEntity(parser)
                parser.entity = ''
                parser.state = returnState
              } else if (isMatch(parser.entity.length ? entityBody : entityStart, c)) {
                parser.entity += c
              } else {
                strictFail(parser, 'Invalid character in entity name')
                parser[buffer] += '&' + parser.entity + c
                parser.entity = ''
                parser.state = returnState
              }
              continue
            default:
              throw new Error(parser, 'Unknown state: ' + parser.state)
          }
        } // while
        if (parser.position >= parser.bufferCheckPosition) {
          checkBufferLength(parser)
        }
        return parser
      }
      /*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
      /* istanbul ignore next */
      if (!String.fromCodePoint) {
        (function () {
          var stringFromCharCode = String.fromCharCode
          var floor = Math.floor
          var fromCodePoint = function () {
            var MAX_SIZE = 0x4000
            var codeUnits = []
            var highSurrogate
            var lowSurrogate
            var index = -1
            var length = arguments.length
            if (!length) {
              return ''
            }
            var result = ''
            while (++index < length) {
              var codePoint = Number(arguments[index])
              if (!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                                codePoint < 0 || // not a valid Unicode code point
                                codePoint > 0x10FFFF || // not a valid Unicode code point
                                floor(codePoint) !== codePoint // not an integer
              ) {
                throw RangeError('Invalid code point: ' + codePoint)
              }
              if (codePoint <= 0xFFFF) { // BMP code point
                codeUnits.push(codePoint)
              } else { // Astral code point; split in surrogate halves
                // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                codePoint -= 0x10000
                highSurrogate = (codePoint >> 10) + 0xD800
                lowSurrogate = (codePoint % 0x400) + 0xDC00
                codeUnits.push(highSurrogate, lowSurrogate)
              }
              if (index + 1 === length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits)
                codeUnits.length = 0
              }
            }
            return result
          }
          /* istanbul ignore next */
          if (Object.defineProperty) {
            Object.defineProperty(String, 'fromCodePoint', {
              value: fromCodePoint,
              configurable: true,
              writable: true
            })
          } else {
            String.fromCodePoint = fromCodePoint
          }
        }())
      }
    })(exports)
  })
  /*
     * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * * Redistributions of source code must retain the above copyright notice, this
     *   list of conditions and the following disclaimer.
     * * Redistributions in binary form must reproduce the above copyright notice,
     *   this list of conditions and the following disclaimer in the documentation
     *   and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
     * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
     * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
     * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
     * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
     * POSSIBILITY OF SUCH DAMAGE.
     */
  doc = createCommonjsModule(function (module, exports) {
    (function (imscDoc, sax, imscNames, imscStyles, imscUtils) {
      /**
             * Allows a client to provide callbacks to handle children of the <metadata> element
             * @typedef {Object} MetadataHandler
             * @property {?OpenTagCallBack} onOpenTag
             * @property {?CloseTagCallBack} onCloseTag
             * @property {?TextCallBack} onText
             */
      /**
             * Called when the opening tag of an element node is encountered.
             * @callback OpenTagCallBack
             * @param {string} ns Namespace URI of the element
             * @param {string} name Local name of the element
             * @param {Object[]} attributes List of attributes, each consisting of a
             *                              `uri`, `name` and `value`
             */
      /**
             * Called when the closing tag of an element node is encountered.
             * @callback CloseTagCallBack
             */
      /**
             * Called when a text node is encountered.
             * @callback TextCallBack
             * @param {string} contents Contents of the text node
             */
      /**
             * Parses an IMSC1 document into an opaque in-memory representation that exposes
             * a single method <pre>getMediaTimeEvents()</pre> that returns a list of time
             * offsets (in seconds) of the ISD, i.e. the points in time where the visual
             * representation of the document change. `metadataHandler` allows the caller to
             * be called back when nodes are present in <metadata> elements.
             *
             * @param {string} xmlstring XML document
             * @param {?module:imscUtils.ErrorHandler} errorHandler Error callback
             * @param {?MetadataHandler} metadataHandler Callback for <Metadata> elements
             * @returns {Object} Opaque in-memory representation of an IMSC1 document
             */
      imscDoc.fromXML = function (xmlstring, errorHandler, metadataHandler) {
        var p = sax.parser(true, { xmlns: true })
        var estack = []
        var xmllangstack = []
        var xmlspacestack = []
        var metadata_depth = 0
        var doc = null
        p.onclosetag = function (node) {
          if (estack[0] instanceof Region) {
            /* merge referenced styles */
            if (doc.head !== null && doc.head.styling !== null) {
              mergeReferencedStyles(doc.head.styling, estack[0].styleRefs, estack[0].styleAttrs, errorHandler)
            }
            delete estack[0].styleRefs
          } else if (estack[0] instanceof Styling) {
            /* flatten chained referential styling */
            for (var sid in estack[0].styles) {
              mergeChainedStyles(estack[0], estack[0].styles[sid], errorHandler)
            }
          } else if (estack[0] instanceof P || estack[0] instanceof Span) {
            /* merge anonymous spans */
            if (estack[0].contents.length > 1) {
              var cs = [estack[0].contents[0]]
              var c
              for (c = 1; c < estack[0].contents.length; c++) {
                if (estack[0].contents[c] instanceof AnonymousSpan &&
                                    cs[cs.length - 1] instanceof AnonymousSpan) {
                  cs[cs.length - 1].text += estack[0].contents[c].text
                } else {
                  cs.push(estack[0].contents[c])
                }
              }
              estack[0].contents = cs
            }
            // remove redundant nested anonymous spans (9.3.3(1)(c))
            if (estack[0] instanceof Span &&
                            estack[0].contents.length === 1 &&
                            estack[0].contents[0] instanceof AnonymousSpan) {
              estack[0].text = estack[0].contents[0].text
              delete estack[0].contents
            }
          } else if (estack[0] instanceof ForeignElement) {
            if (estack[0].node.uri === imscNames.ns_tt &&
                            estack[0].node.local === 'metadata') {
              /* leave the metadata element */
              metadata_depth--
            } else if (metadata_depth > 0 &&
                            metadataHandler &&
                            'onCloseTag' in metadataHandler) {
              /* end of child of metadata element */
              metadataHandler.onCloseTag()
            }
          }
          // TODO: delete stylerefs?
          // maintain the xml:space stack
          xmlspacestack.shift()
          // maintain the xml:lang stack
          xmllangstack.shift()
          // prepare for the next element
          estack.shift()
        }
        p.ontext = function (str) {
          if (estack[0] === undefined)
            ;
          else if (estack[0] instanceof Span || estack[0] instanceof P) {
            /* ignore children text nodes in ruby container spans */
            if (estack[0] instanceof Span) {
              var ruby = estack[0].styleAttrs[imscStyles.byName.ruby.qname]
              if (ruby === 'container' || ruby === 'textContainer' || ruby === 'baseContainer') {
                return
              }
            }
            /* create an anonymous span */
            var s = new AnonymousSpan()
            s.initFromText(doc, estack[0], str, xmlspacestack[0], errorHandler)
            estack[0].contents.push(s)
          } else if (estack[0] instanceof ForeignElement &&
                        metadata_depth > 0 &&
                        metadataHandler &&
                        'onText' in metadataHandler) {
            /* text node within a child of metadata element */
            metadataHandler.onText(str)
          }
        }
        p.onopentag = function (node) {
          // maintain the xml:space stack
          var xmlspace = node.attributes['xml:space']
          if (xmlspace) {
            xmlspacestack.unshift(xmlspace.value)
          } else {
            if (xmlspacestack.length === 0) {
              xmlspacestack.unshift('default')
            } else {
              xmlspacestack.unshift(xmlspacestack[0])
            }
          }
          /* maintain the xml:lang stack */
          var xmllang = node.attributes['xml:lang']
          if (xmllang) {
            xmllangstack.unshift(xmllang.value)
          } else {
            if (xmllangstack.length === 0) {
              xmllangstack.unshift('')
            } else {
              xmllangstack.unshift(xmllangstack[0])
            }
          }
          function rewriteNamespace (obj) {
            if (imscNames.ttaf_map[obj.uri]) {
              obj.uri = imscNames.ttaf_map[obj.uri]
            }
          }
          // Make ttaf1 namespaces ttml ones.
          rewriteNamespace(node)
          if (node.attributes) {
            for (var attr in node.attributes) {
              if (node.attributes.hasOwnProperty(attr)) {
                rewriteNamespace(node.attributes[attr])
              }
            }
          }
          /* process the element */
          if (node.uri === imscNames.ns_tt) {
            if (node.local === 'tt') {
              if (doc !== null) {
                reportFatal(errorHandler, 'Two <tt> elements at (' + this.line + ',' + this.column + ')')
              }
              doc = new TT()
              doc.initFromNode(node, errorHandler)
              estack.unshift(doc)
            } else if (node.local === 'head') {
              if (!(estack[0] instanceof TT)) {
                reportFatal(errorHandler, 'Parent of <head> element is not <tt> at (' + this.line + ',' + this.column + ')')
              }
              estack.unshift(doc.head)
            } else if (node.local === 'styling') {
              if (!(estack[0] instanceof Head)) {
                reportFatal(errorHandler, 'Parent of <styling> element is not <head> at (' + this.line + ',' + this.column + ')')
              }
              estack.unshift(doc.head.styling)
            } else if (node.local === 'style') {
              var s
              if (estack[0] instanceof Styling) {
                s = new Style()
                s.initFromNode(node, errorHandler)
                /* ignore <style> element missing @id */
                if (!s.id) {
                  reportError(errorHandler, '<style> element missing @id attribute')
                } else {
                  doc.head.styling.styles[s.id] = s
                }
                estack.unshift(s)
              } else if (estack[0] instanceof Region) {
                /* nested styles can be merged with specified styles
                                 * immediately, with lower priority
                                 * (see 8.4.4.2(3) at TTML1 )
                                 */
                s = new Style()
                s.initFromNode(node, errorHandler)
                mergeStylesIfNotPresent(s.styleAttrs, estack[0].styleAttrs)
                estack.unshift(s)
              } else {
                reportFatal(errorHandler, 'Parent of <style> element is not <styling> or <region> at (' + this.line + ',' + this.column + ')')
              }
            } else if (node.local === 'initial') {
              var ini
              if (estack[0] instanceof Styling) {
                ini = new Initial()
                ini.initFromNode(node, errorHandler)
                for (var qn in ini.styleAttrs) {
                  doc.head.styling.initials[qn] = ini.styleAttrs[qn]
                }
                estack.unshift(ini)
              } else {
                reportFatal(errorHandler, 'Parent of <initial> element is not <styling> at (' + this.line + ',' + this.column + ')')
              }
            } else if (node.local === 'layout') {
              if (!(estack[0] instanceof Head)) {
                reportFatal(errorHandler, 'Parent of <layout> element is not <head> at ' + this.line + ',' + this.column + ')')
              }
              estack.unshift(doc.head.layout)
            } else if (node.local === 'region') {
              if (!(estack[0] instanceof Layout)) {
                reportFatal(errorHandler, 'Parent of <region> element is not <layout> at ' + this.line + ',' + this.column + ')')
              }
              var r = new Region()
              r.initFromNode(doc, node, errorHandler)
              if (!r.id || r.id in doc.head.layout.regions) {
                reportError(errorHandler, 'Ignoring <region> with duplicate or missing @id at ' + this.line + ',' + this.column + ')')
              } else {
                doc.head.layout.regions[r.id] = r
              }
              estack.unshift(r)
            } else if (node.local === 'body') {
              if (!(estack[0] instanceof TT)) {
                reportFatal(errorHandler, 'Parent of <body> element is not <tt> at ' + this.line + ',' + this.column + ')')
              }
              if (doc.body !== null) {
                reportFatal(errorHandler, 'Second <body> element at ' + this.line + ',' + this.column + ')')
              }
              var b = new Body()
              b.initFromNode(doc, node, errorHandler)
              doc.body = b
              estack.unshift(b)
            } else if (node.local === 'div') {
              if (!(estack[0] instanceof Div || estack[0] instanceof Body)) {
                reportFatal(errorHandler, 'Parent of <div> element is not <body> or <div> at ' + this.line + ',' + this.column + ')')
              }
              var d = new Div()
              d.initFromNode(doc, estack[0], node, errorHandler)
              /* transform smpte:backgroundImage to TTML2 image element */
              var bi = d.styleAttrs[imscStyles.byName.backgroundImage.qname]
              if (bi) {
                d.contents.push(new Image(bi))
                delete d.styleAttrs[imscStyles.byName.backgroundImage.qname]
              }
              estack[0].contents.push(d)
              estack.unshift(d)
            } else if (node.local === 'image') {
              if (!(estack[0] instanceof Div)) {
                reportFatal(errorHandler, 'Parent of <image> element is not <div> at ' + this.line + ',' + this.column + ')')
              }
              var img = new Image()
              img.initFromNode(doc, estack[0], node, errorHandler)
              estack[0].contents.push(img)
              estack.unshift(img)
            } else if (node.local === 'p') {
              if (!(estack[0] instanceof Div)) {
                reportFatal(errorHandler, 'Parent of <p> element is not <div> at ' + this.line + ',' + this.column + ')')
              }
              var p = new P()
              p.initFromNode(doc, estack[0], node, errorHandler)
              estack[0].contents.push(p)
              estack.unshift(p)
            } else if (node.local === 'span') {
              if (!(estack[0] instanceof Span || estack[0] instanceof P)) {
                reportFatal(errorHandler, 'Parent of <span> element is not <span> or <p> at ' + this.line + ',' + this.column + ')')
              }
              var ns = new Span()
              ns.initFromNode(doc, estack[0], node, xmlspacestack[0], errorHandler)
              estack[0].contents.push(ns)
              estack.unshift(ns)
            } else if (node.local === 'br') {
              if (!(estack[0] instanceof Span || estack[0] instanceof P)) {
                reportFatal(errorHandler, 'Parent of <br> element is not <span> or <p> at ' + this.line + ',' + this.column + ')')
              }
              var nb = new Br()
              nb.initFromNode(doc, estack[0], node, errorHandler)
              estack[0].contents.push(nb)
              estack.unshift(nb)
            } else if (node.local === 'set') {
              if (!(estack[0] instanceof Span ||
                                estack[0] instanceof P ||
                                estack[0] instanceof Div ||
                                estack[0] instanceof Body ||
                                estack[0] instanceof Region ||
                                estack[0] instanceof Br)) {
                reportFatal(errorHandler, 'Parent of <set> element is not a content element or a region at ' + this.line + ',' + this.column + ')')
              }
              var st = new Set()
              st.initFromNode(doc, estack[0], node, errorHandler)
              estack[0].sets.push(st)
              estack.unshift(st)
            } else {
              /* element in the TT namespace, but not a content element */
              estack.unshift(new ForeignElement(node))
            }
          } else {
            /* ignore elements not in the TTML namespace unless in metadata element */
            estack.unshift(new ForeignElement(node))
          }
          /* handle metadata callbacks */
          if (estack[0] instanceof ForeignElement) {
            if (node.uri === imscNames.ns_tt &&
                            node.local === 'metadata') {
              /* enter the metadata element */
              metadata_depth++
            } else if (metadata_depth > 0 &&
                            metadataHandler &&
                            'onOpenTag' in metadataHandler) {
              /* start of child of metadata element */
              var attrs = []
              for (var a in node.attributes) {
                attrs[node.attributes[a].uri + ' ' + node.attributes[a].local] =
                                    {
                                      uri: node.attributes[a].uri,
                                      local: node.attributes[a].local,
                                      value: node.attributes[a].value
                                    }
              }
              metadataHandler.onOpenTag(node.uri, node.local, attrs)
            }
          }
        }
        // parse the document
        p.write(xmlstring).close()
        // all referential styling has been flatten, so delete styles
        delete doc.head.styling.styles
        // create default region if no regions specified
        var hasRegions = false
        /* AFAIK the only way to determine whether an object has members */
        for (var i in doc.head.layout.regions) {
          hasRegions = true
          break
        }
        if (!hasRegions) {
          /* create default region */
          var dr = Region.prototype.createDefaultRegion(doc, errorHandler)
          doc.head.layout.regions[dr.id] = dr
        }
        /* resolve desired timing for regions */
        for (var region_i in doc.head.layout.regions) {
          resolveTiming(doc, doc.head.layout.regions[region_i], null, null)
        }
        /* resolve desired timing for content elements */
        if (doc.body) {
          resolveTiming(doc, doc.body, null, null)
        }
        /* remove undefined spans in ruby containers */
        if (doc.body) {
          cleanRubyContainers(doc.body)
        }
        if (doc.body) {
          pushBackgroundColorDown(doc.body)
        }
        return doc
      }
      // Background colours on body or div look bad. As a post-parse step, move them to spans below (when undefined in the P)
      function pushBackgroundColorDown (node, lastBG) {
        var currentBG = node.styleAttrs && node.styleAttrs['http://www.w3.org/ns/ttml#styling backgroundColor']
        if (node.kind === 'span') {
          if (!currentBG && lastBG) {
            if (!node.styleAttrs) {
              node.styleAttrs = {}
            }
            node.styleAttrs['http://www.w3.org/ns/ttml#styling backgroundColor'] = lastBG
          }
        } else {
          if (currentBG) {
            delete node.styleAttrs['http://www.w3.org/ns/ttml#styling backgroundColor']
          }
          if (node.contents) {
            for (var i = 0; i < node.contents.length; i++) {
              pushBackgroundColorDown(node.contents[i], currentBG || lastBG)
            }
          }
        }
      }
      function cleanRubyContainers (element) {
        if (!('contents' in element)) { return }
        var rubyval = 'styleAttrs' in element ? element.styleAttrs[imscStyles.byName.ruby.qname] : null
        var isrubycontainer = (element.kind === 'span' && (rubyval === 'container' || rubyval === 'textContainer' || rubyval === 'baseContainer'))
        for (var i = element.contents.length - 1; i >= 0; i--) {
          if (isrubycontainer && !('styleAttrs' in element.contents[i] && imscStyles.byName.ruby.qname in element.contents[i].styleAttrs)) {
            /* prune undefined <span> in ruby containers */
            delete element.contents[i]
          } else {
            cleanRubyContainers(element.contents[i])
          }
        }
      }
      function resolveTiming (doc, element, prev_sibling, parent) {
        /* are we in a seq container? */
        var isinseq = parent && parent.timeContainer === 'seq'
        /* determine implicit begin */
        var implicit_begin = 0 /* default */
        if (parent) {
          if (isinseq && prev_sibling) {
            /*
                         * if seq time container, offset from the previous sibling end
                         */
            implicit_begin = prev_sibling.end
          } else {
            implicit_begin = parent.begin
          }
        }
        /* compute desired begin */
        element.begin = element.explicit_begin ? element.explicit_begin + implicit_begin : implicit_begin
        /* determine implicit end */
        var implicit_end = element.begin
        var s = null
        for (var set_i in element.sets) {
          resolveTiming(doc, element.sets[set_i], s, element)
          if (element.timeContainer === 'seq') {
            implicit_end = element.sets[set_i].end
          } else {
            implicit_end = Math.max(implicit_end, element.sets[set_i].end)
          }
          s = element.sets[set_i]
        }
        if (!('contents' in element)) {
          /* anonymous spans and regions and <set> and <br>s and spans with only children text nodes */
          if (isinseq) {
            /* in seq container, implicit duration is zero */
            implicit_end = element.begin
          } else {
            /* in par container, implicit duration is indefinite */
            implicit_end = Number.POSITIVE_INFINITY
          }
        } else {
          for (var content_i in element.contents) {
            resolveTiming(doc, element.contents[content_i], s, element)
            if (element.timeContainer === 'seq') {
              implicit_end = element.contents[content_i].end
            } else {
              implicit_end = Math.max(implicit_end, element.contents[content_i].end)
            }
            s = element.contents[content_i]
          }
        }
        /* determine desired end */
        /* it is never made really clear in SMIL that the explicit end is offset by the implicit begin */
        if (element.explicit_end !== null && element.explicit_dur !== null) {
          element.end = Math.min(element.begin + element.explicit_dur, implicit_begin + element.explicit_end)
        } else if (element.explicit_end === null && element.explicit_dur !== null) {
          element.end = element.begin + element.explicit_dur
        } else if (element.explicit_end !== null && element.explicit_dur === null) {
          element.end = implicit_begin + element.explicit_end
        } else {
          element.end = implicit_end
        }
        delete element.explicit_begin
        delete element.explicit_dur
        delete element.explicit_end
        doc._registerEvent(element)
      }
      function ForeignElement (node) {
        this.node = node
      }
      function TT () {
        this.events = []
        this.head = new Head()
        this.body = null
      }
      TT.prototype.initFromNode = function (node, errorHandler) {
        /* compute cell resolution */
        var cr = extractCellResolution(node, errorHandler)
        this.cellLength = {
          'h': new imscUtils.ComputedLength(0, 1 / cr.h),
          'w': new imscUtils.ComputedLength(1 / cr.w, 0)
        }
        /* extract frame rate and tick rate */
        var frtr = extractFrameAndTickRate(node, errorHandler)
        this.effectiveFrameRate = frtr.effectiveFrameRate
        this.tickRate = frtr.tickRate
        /* extract aspect ratio */
        this.aspectRatio = extractAspectRatio(node, errorHandler)
        /* check timebase */
        var attr = findAttribute(node, imscNames.ns_ttp, 'timeBase')
        if (attr !== null && attr !== 'media') {
          reportFatal(errorHandler, 'Unsupported time base')
        }
        /* retrieve extent */
        var e = extractExtent(node, errorHandler)
        if (e === null) {
          this.pxLength = {
            'h': null,
            'w': null
          }
        } else {
          if (e.h.unit !== 'px' || e.w.unit !== 'px') {
            reportFatal(errorHandler, 'Extent on TT must be in px or absent')
          }
          this.pxLength = {
            'h': new imscUtils.ComputedLength(0, 1 / e.h.value),
            'w': new imscUtils.ComputedLength(1 / e.w.value, 0)
          }
        }
        /** set root container dimensions to (1, 1) arbitrarily
                  * the root container is mapped to actual dimensions at rendering
                **/
        this.dimensions = {
          'h': new imscUtils.ComputedLength(0, 1),
          'w': new imscUtils.ComputedLength(1, 0)
        }
      }
      /* register a temporal events */
      TT.prototype._registerEvent = function (elem) {
        /* skip if begin is not < then end */
        if (elem.end <= elem.begin) { return }
        /* index the begin time of the event */
        var b_i = indexOf(this.events, elem.begin)
        if (!b_i.found) {
          this.events.splice(b_i.index, 0, elem.begin)
        }
        /* index the end time of the event */
        if (elem.end !== Number.POSITIVE_INFINITY) {
          var e_i = indexOf(this.events, elem.end)
          if (!e_i.found) {
            this.events.splice(e_i.index, 0, elem.end)
          }
        }
      }
      /*
             * Retrieves the range of ISD times covered by the document
             *
             * @returns {Array} Array of two elements: min_begin_time and max_begin_time
             *
             */
      TT.prototype.getMediaTimeRange = function () {
        return [this.events[0], this.events[this.events.length - 1]]
      }
      /*
             * Returns list of ISD begin times
             *
             * @returns {Array}
             */
      TT.prototype.getMediaTimeEvents = function () {
        return this.events
      }
      /*
             * Represents a TTML Head element
             */
      function Head () {
        this.styling = new Styling()
        this.layout = new Layout()
      }
      /*
             * Represents a TTML Styling element
             */
      function Styling () {
        this.styles = {}
        this.initials = {}
      }
      /*
             * Represents a TTML Style element
             */
      function Style () {
        this.id = null
        this.styleAttrs = null
        this.styleRefs = null
      }
      Style.prototype.initFromNode = function (node, errorHandler) {
        this.id = elementGetXMLID(node)
        this.styleAttrs = elementGetStyles(node, errorHandler)
        this.styleRefs = elementGetStyleRefs(node)
      }
      /*
             * Represents a TTML initial element
             */
      function Initial () {
        this.styleAttrs = null
      }
      Initial.prototype.initFromNode = function (node, errorHandler) {
        this.styleAttrs = {}
        for (var i in node.attributes) {
          if (node.attributes[i].uri === imscNames.ns_itts ||
                        node.attributes[i].uri === imscNames.ns_ebutts ||
                        node.attributes[i].uri === imscNames.ns_tts) {
            var qname = node.attributes[i].uri + ' ' + node.attributes[i].local
            this.styleAttrs[qname] = node.attributes[i].value
          }
        }
      }
      /*
             * Represents a TTML Layout element
             *
             */
      function Layout () {
        this.regions = {}
      }
      /*
             * Represents a TTML image element
             */
      function Image (src, type) {
        ContentElement.call(this, 'image')
        this.src = src
        this.type = type
      }
      Image.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        this.src = 'src' in node.attributes ? node.attributes.src.value : null
        if (!this.src) {
          reportError(errorHandler, 'Invalid image@src attribute')
        }
        this.type = 'type' in node.attributes ? node.attributes.type.value : null
        if (!this.type) {
          reportError(errorHandler, 'Invalid image@type attribute')
        }
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
      }
      /*
             * TTML element utility functions
             *
             */
      function ContentElement (kind) {
        this.kind = kind
      }
      function IdentifiedElement (id) {
        this.id = id
      }
      IdentifiedElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        this.id = elementGetXMLID(node)
      }
      function LayoutElement (id) {
        this.regionID = id
      }
      LayoutElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        this.regionID = elementGetRegionID(node)
      }
      function StyledElement (styleAttrs) {
        this.styleAttrs = styleAttrs
      }
      StyledElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        this.styleAttrs = elementGetStyles(node, errorHandler)
        if (doc.head !== null && doc.head.styling !== null) {
          mergeReferencedStyles(doc.head.styling, elementGetStyleRefs(node), this.styleAttrs, errorHandler)
        }
      }
      function AnimatedElement (sets) {
        this.sets = sets
      }
      AnimatedElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        this.sets = []
      }
      function ContainerElement (contents) {
        this.contents = contents
      }
      ContainerElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        this.contents = []
      }
      function TimedElement (explicit_begin, explicit_end, explicit_dur) {
        this.explicit_begin = explicit_begin
        this.explicit_end = explicit_end
        this.explicit_dur = explicit_dur
      }
      TimedElement.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        var t = processTiming(doc, parent, node, errorHandler)
        this.explicit_begin = t.explicit_begin
        this.explicit_end = t.explicit_end
        this.explicit_dur = t.explicit_dur
        this.timeContainer = elementGetTimeContainer(node, errorHandler)
      }
      /*
             * Represents a TTML body element
             */
      function Body () {
        ContentElement.call(this, 'body')
      }
      Body.prototype.initFromNode = function (doc, node, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        AnimatedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        LayoutElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        ContainerElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
      }
      /*
             * Represents a TTML div element
             */
      function Div () {
        ContentElement.call(this, 'div')
      }
      Div.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
      }
      /*
             * Represents a TTML p element
             */
      function P () {
        ContentElement.call(this, 'p')
      }
      P.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
      }
      /*
             * Represents a TTML span element
             */
      function Span () {
        ContentElement.call(this, 'span')
      }
      Span.prototype.initFromNode = function (doc, parent, node, xmlspace, errorHandler) {
        StyledElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        AnimatedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        ContainerElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        this.space = xmlspace
      }
      /*
             * Represents a TTML anonymous span element
             */
      function AnonymousSpan () {
        ContentElement.call(this, 'span')
      }
      AnonymousSpan.prototype.initFromText = function (doc, parent, text, xmlspace, errorHandler) {
        TimedElement.prototype.initFromNode.call(this, doc, parent, null, errorHandler)
        this.text = text
        this.space = xmlspace
      }
      /*
             * Represents a TTML br element
             */
      function Br () {
        ContentElement.call(this, 'br')
      }
      Br.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        LayoutElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
      }
      /*
             * Represents a TTML Region element
             *
             */
      function Region () {
      }
      Region.prototype.createDefaultRegion = function (doc, errorHandler) {
        var r = new Region()
        var defaultRegionAttr = {
          'tts:displayAlign': {
            'name': 'tts:displayAlign',
            'value': 'after',
            'prefix': 'tts',
            'local': 'displayAlign',
            'uri': 'http://www.w3.org/ns/ttml#styling'
          },
          'tts:extent': {
            'name': 'tts:extent',
            'value': '80% 20%',
            'prefix': 'tts',
            'local': 'extent',
            'uri': 'http://www.w3.org/ns/ttml#styling'
          },
          'tts:origin': {
            'name': 'tts:origin',
            'value': '10% 70%',
            'prefix': 'tts',
            'local': 'origin',
            'uri': 'http://www.w3.org/ns/ttml#styling'
          },
          'tts:overflow': {
            'name': 'tts:overflow',
            'value': 'visible',
            'prefix': 'tts',
            'local': 'overflow',
            'uri': 'http://www.w3.org/ns/ttml#styling'
          }
        }
        var defaultRegionNode = {
          'name': 'region',
          'attributes': defaultRegionAttr,
          'ns': {
            '': 'http://www.w3.org/ns/ttml',
            'ebuttm': 'urn:ebu:tt:metadata',
            'ebutts': 'urn:ebu:tt:style',
            'ittp': 'http://www.w3.org/ns/ttml/profile/imsc1#parameter',
            'itts': 'http://www.w3.org/ns/ttml/profile/imsc1#styling',
            'ttm': 'http://www.w3.org/ns/ttml#metadata',
            'ttp': 'http://www.w3.org/ns/ttml#parameter',
            'tts': 'http://www.w3.org/ns/ttml#styling',
            'xml': 'http://www.w3.org/XML/1998/namespace'
          },
          'prefix': '',
          'local': 'region',
          'uri': 'http://www.w3.org/ns/ttml',
          'isSelfClosing': true
        }
        IdentifiedElement.call(r, '')
        StyledElement.prototype.initFromNode.call(r, doc, null, defaultRegionNode, errorHandler)
        AnimatedElement.call(r, [])
        TimedElement.call(r, 0, Number.POSITIVE_INFINITY, null)
        return r
      }
      Region.prototype.initFromNode = function (doc, node, errorHandler) {
        IdentifiedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        TimedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        AnimatedElement.prototype.initFromNode.call(this, doc, null, node, errorHandler)
        /* add specified styles */
        this.styleAttrs = elementGetStyles(node, errorHandler)
        /* remember referential styles for merging after nested styling is processed*/
        this.styleRefs = elementGetStyleRefs(node)
      }
      /*
             * Represents a TTML Set element
             *
             */
      function Set () {
      }
      Set.prototype.initFromNode = function (doc, parent, node, errorHandler) {
        TimedElement.prototype.initFromNode.call(this, doc, parent, node, errorHandler)
        var styles = elementGetStyles(node, errorHandler)
        this.qname = null
        this.value = null
        for (var qname in styles) {
          if (this.qname) {
            reportError(errorHandler, 'More than one style specified on set')
            break
          }
          this.qname = qname
          this.value = styles[qname]
        }
      }
      /*
             * Utility functions
             *
             */
      function elementGetXMLID (node) {
        var ret = null
        if (node) {
          var idAttribute = node.attributes['xml:id'] || node.attributes.id
          if (idAttribute) {
            ret = idAttribute.value || null
          }
        }
        return ret
      }
      function elementGetRegionID (node) {
        return node && 'region' in node.attributes ? node.attributes.region.value : ''
      }
      function elementGetTimeContainer (node, errorHandler) {
        var tc = node && 'timeContainer' in node.attributes ? node.attributes.timeContainer.value : null
        if ((!tc) || tc === 'par') {
          return 'par'
        } else if (tc === 'seq') {
          return 'seq'
        } else {
          reportError(errorHandler, "Illegal value of timeContainer (assuming 'par')")
          return 'par'
        }
      }
      function elementGetStyleRefs (node) {
        return node && 'style' in node.attributes ? node.attributes.style.value.split(' ') : []
      }
      function elementGetStyles (node, errorHandler) {
        var s = {}
        if (node !== null) {
          for (var i in node.attributes) {
            var qname = node.attributes[i].uri + ' ' + node.attributes[i].local
            var sa = imscStyles.byQName[qname]
            if (sa !== undefined) {
              var val = sa.parse(node.attributes[i].value)
              if (val !== null) {
                s[qname] = val
                /* TODO: consider refactoring errorHandler into parse and compute routines */
                if (sa === imscStyles.byName.zIndex) {
                  reportWarning(errorHandler, 'zIndex attribute present but not used by IMSC1 since regions do not overlap')
                }
              } else {
                reportError(errorHandler, 'Cannot parse styling attribute ' + qname + ' --> ' + node.attributes[i].value)
              }
            }
          }
        }
        return s
      }
      function findAttribute (node, ns, name) {
        for (var i in node.attributes) {
          if (node.attributes[i].uri === ns &&
                        node.attributes[i].local === name) {
            return node.attributes[i].value
          }
        }
        return null
      }
      function extractAspectRatio (node, errorHandler) {
        var ar = findAttribute(node, imscNames.ns_ittp, 'aspectRatio')
        if (ar === null) {
          ar = findAttribute(node, imscNames.ns_ttp, 'displayAspectRatio')
        }
        var rslt = null
        if (ar !== null) {
          var ASPECT_RATIO_RE = /(\d+)\s+(\d+)/
          var m = ASPECT_RATIO_RE.exec(ar)
          if (m !== null) {
            var w = parseInt(m[1])
            var h = parseInt(m[2])
            if (w !== 0 && h !== 0) {
              rslt = w / h
            } else {
              reportError(errorHandler, 'Illegal aspectRatio values (ignoring)')
            }
          } else {
            reportError(errorHandler, 'Malformed aspectRatio attribute (ignoring)')
          }
        }
        return rslt
      }
      /*
             * Returns the cellResolution attribute from a node
             *
             */
      function extractCellResolution (node, errorHandler) {
        var cr = findAttribute(node, imscNames.ns_ttp, 'cellResolution')
        // initial value
        var h = 15
        var w = 32
        if (cr !== null) {
          var CELL_RESOLUTION_RE = /(\d+) (\d+)/
          var m = CELL_RESOLUTION_RE.exec(cr)
          if (m !== null) {
            w = parseInt(m[1])
            h = parseInt(m[2])
          } else {
            reportWarning(errorHandler, 'Malformed cellResolution value (using initial value instead)')
          }
        }
        return { 'w': w, 'h': h }
      }
      function extractFrameAndTickRate (node, errorHandler) {
        // subFrameRate is ignored per IMSC1 specification
        // extract frame rate
        var fps_attr = findAttribute(node, imscNames.ns_ttp, 'frameRate')
        // initial value
        var fps = 30
        // match variable
        var m
        if (fps_attr !== null) {
          var FRAME_RATE_RE = /(\d+)/
          m = FRAME_RATE_RE.exec(fps_attr)
          if (m !== null) {
            fps = parseInt(m[1])
          } else {
            reportWarning(errorHandler, 'Malformed frame rate attribute (using initial value instead)')
          }
        }
        // extract frame rate multiplier
        var frm_attr = findAttribute(node, imscNames.ns_ttp, 'frameRateMultiplier')
        // initial value
        var frm = 1
        if (frm_attr !== null) {
          var FRAME_RATE_MULT_RE = /(\d+) (\d+)/
          m = FRAME_RATE_MULT_RE.exec(frm_attr)
          if (m !== null) {
            frm = parseInt(m[1]) / parseInt(m[2])
          } else {
            reportWarning(errorHandler, 'Malformed frame rate multiplier attribute (using initial value instead)')
          }
        }
        var efps = frm * fps
        // extract tick rate
        var tr = 1
        var trattr = findAttribute(node, imscNames.ns_ttp, 'tickRate')
        if (trattr === null) {
          if (fps_attr !== null) { tr = efps }
        } else {
          var TICK_RATE_RE = /(\d+)/
          m = TICK_RATE_RE.exec(trattr)
          if (m !== null) {
            tr = parseInt(m[1])
          } else {
            reportWarning(errorHandler, 'Malformed tick rate attribute (using initial value instead)')
          }
        }
        return { effectiveFrameRate: efps, tickRate: tr }
      }
      function extractExtent (node, errorHandler) {
        var attr = findAttribute(node, imscNames.ns_tts, 'extent')
        if (attr === null) { return null }
        var s = attr.split(' ')
        if (s.length !== 2) {
          reportWarning(errorHandler, 'Malformed extent (ignoring)')
          return null
        }
        var w = imscUtils.parseLength(s[0])
        var h = imscUtils.parseLength(s[1])
        if (!h || !w) {
          reportWarning(errorHandler, 'Malformed extent values (ignoring)')
          return null
        }
        return { 'h': h, 'w': w }
      }
      function parseTimeExpression (tickRate, effectiveFrameRate, str) {
        var CLOCK_TIME_FRACTION_RE = /^(\d{2,}):(\d\d):(\d\d(?:\.\d+)?)$/
        var CLOCK_TIME_FRAMES_RE = /^(\d{2,}):(\d\d):(\d\d)\:(\d{2,})$/
        var OFFSET_FRAME_RE = /^(\d+(?:\.\d+)?)f$/
        var OFFSET_TICK_RE = /^(\d+(?:\.\d+)?)t$/
        var OFFSET_MS_RE = /^(\d+(?:\.\d+)?)ms$/
        var OFFSET_S_RE = /^(\d+(?:\.\d+)?)s$/
        var OFFSET_H_RE = /^(\d+(?:\.\d+)?)h$/
        var OFFSET_M_RE = /^(\d+(?:\.\d+)?)m$/
        var m
        var r = null
        if ((m = OFFSET_FRAME_RE.exec(str)) !== null) {
          if (effectiveFrameRate !== null) {
            r = parseFloat(m[1]) / effectiveFrameRate
          }
        } else if ((m = OFFSET_TICK_RE.exec(str)) !== null) {
          if (tickRate !== null) {
            r = parseFloat(m[1]) / tickRate
          }
        } else if ((m = OFFSET_MS_RE.exec(str)) !== null) {
          r = parseFloat(m[1]) / 1000.0
        } else if ((m = OFFSET_S_RE.exec(str)) !== null) {
          r = parseFloat(m[1])
        } else if ((m = OFFSET_H_RE.exec(str)) !== null) {
          r = parseFloat(m[1]) * 3600.0
        } else if ((m = OFFSET_M_RE.exec(str)) !== null) {
          r = parseFloat(m[1]) * 60.0
        } else if ((m = CLOCK_TIME_FRACTION_RE.exec(str)) !== null) {
          r = parseInt(m[1]) * 3600 +
                        parseInt(m[2]) * 60 +
                        parseFloat(m[3])
        } else if ((m = CLOCK_TIME_FRAMES_RE.exec(str)) !== null) {
          /* this assumes that HH:MM:SS is a clock-time-with-fraction */
          if (effectiveFrameRate !== null) {
            r = parseInt(m[1]) * 3600 +
                            parseInt(m[2]) * 60 +
                            parseInt(m[3]) +
                            (m[4] === null ? 0 : parseInt(m[4]) / effectiveFrameRate)
          }
        }
        return r
      }
      function processTiming (doc, parent, node, errorHandler) {
        /* determine explicit begin */
        var explicit_begin = null
        if (node && 'begin' in node.attributes) {
          explicit_begin = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.begin.value)
          if (explicit_begin === null) {
            reportWarning(errorHandler, 'Malformed begin value ' + node.attributes.begin.value + ' (using 0)')
          }
        }
        /* determine explicit duration */
        var explicit_dur = null
        if (node && 'dur' in node.attributes) {
          explicit_dur = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.dur.value)
          if (explicit_dur === null) {
            reportWarning(errorHandler, 'Malformed dur value ' + node.attributes.dur.value + ' (ignoring)')
          }
        }
        /* determine explicit end */
        var explicit_end = null
        if (node && 'end' in node.attributes) {
          explicit_end = parseTimeExpression(doc.tickRate, doc.effectiveFrameRate, node.attributes.end.value)
          if (explicit_end === null) {
            reportWarning(errorHandler, 'Malformed end value (ignoring)')
          }
        }
        return { explicit_begin: explicit_begin,
          explicit_end: explicit_end,
          explicit_dur: explicit_dur }
      }
      function mergeChainedStyles (styling, style, errorHandler) {
        while (style.styleRefs.length > 0) {
          var sref = style.styleRefs.pop()
          if (!(sref in styling.styles)) {
            reportError(errorHandler, 'Non-existant style id referenced')
            continue
          }
          mergeChainedStyles(styling, styling.styles[sref], errorHandler)
          mergeStylesIfNotPresent(styling.styles[sref].styleAttrs, style.styleAttrs)
        }
      }
      function mergeReferencedStyles (styling, stylerefs, styleattrs, errorHandler) {
        for (var i = stylerefs.length - 1; i >= 0; i--) {
          var sref = stylerefs[i]
          if (!(sref in styling.styles)) {
            reportError(errorHandler, 'Non-existant style id referenced')
            continue
          }
          mergeStylesIfNotPresent(styling.styles[sref].styleAttrs, styleattrs)
        }
      }
      function mergeStylesIfNotPresent (from_styles, into_styles) {
        for (var sname in from_styles) {
          if (sname in into_styles) { continue }
          into_styles[sname] = from_styles[sname]
        }
      }
      function reportWarning (errorHandler, msg) {
        if (errorHandler && errorHandler.warn && errorHandler.warn(msg)) { throw msg }
      }
      function reportError (errorHandler, msg) {
        if (errorHandler && errorHandler.error && errorHandler.error(msg)) { throw msg }
      }
      function reportFatal (errorHandler, msg) {
        if (errorHandler && errorHandler.fatal) { errorHandler.fatal(msg) }
        throw msg
      }
      /*
             * Binary search utility function
             *
             * @typedef {Object} BinarySearchResult
             * @property {boolean} found Was an exact match found?
             * @property {number} index Position of the exact match or insert position
             *
             * @returns {BinarySearchResult}
             */
      function indexOf (arr, searchval) {
        var min = 0
        var max = arr.length - 1
        var cur
        while (min <= max) {
          cur = Math.floor((min + max) / 2)
          var curval = arr[cur]
          if (curval < searchval) {
            min = cur + 1
          } else if (curval > searchval) {
            max = cur - 1
          } else {
            return { found: true, index: cur }
          }
        }
        return { found: false, index: min }
      }
    })(exports, typeof sax === 'undefined' ? sax$1 : sax, typeof imscNames === 'undefined' ? names : imscNames, typeof imscStyles === 'undefined' ? styles : imscStyles, typeof imscUtils === 'undefined' ? utils : imscUtils)
  })
  /*
     * Copyright (c) 2016, Pierre-Anthony Lemieux <pal@sandflow.com>
     * All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are met:
     *
     * * Redistributions of source code must retain the above copyright notice, this
     *   list of conditions and the following disclaimer.
     * * Redistributions in binary form must reproduce the above copyright notice,
     *   this list of conditions and the following disclaimer in the documentation
     *   and/or other materials provided with the distribution.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
     * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
     * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
     * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
     * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
     * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
     * POSSIBILITY OF SUCH DAMAGE.
     */
  html = createCommonjsModule(function (module, exports) {
    /**
         * @module imscHTML
         */
    var backgroundColorAdjustSuffix = 'BackgroundColorAdjust';
    (function (imscHTML, imscNames, imscStyles, imscUtils) {
      /**
             * Function that maps <pre>smpte:background</pre> URIs to URLs resolving to image resource
             * @callback IMGResolver
             * @param {string} <pre>smpte:background</pre> URI
             * @return {string} PNG resource URL
             */
      /**
             * Renders an ISD object (returned by <pre>generateISD()</pre>) into a
             * parent element, that must be attached to the DOM. The ISD will be rendered
             * into a child <pre>div</pre>
             * with heigh and width equal to the clientHeight and clientWidth of the element,
             * unless explicitly specified otherwise by the caller. Images URIs specified
             * by <pre>smpte:background</pre> attributes are mapped to image resource URLs
             * by an <pre>imgResolver</pre> function. The latter takes the value of <code>smpte:background</code>
             * attribute and an <code>img</code> DOM element as input, and is expected to
             * set the <code>src</code> attribute of the <code>img</code> to the absolute URI of the image.
             * <pre>displayForcedOnlyMode</pre> sets the (boolean)
             * value of the IMSC1 displayForcedOnlyMode parameter. The function returns
             * an opaque object that should passed in <code>previousISDState</code> when this function
             * is called for the next ISD, otherwise <code>previousISDState</code> should be set to
             * <code>null</code>.
             *
             * The <pre>options</pre> parameter can be used to configure adjustments
             * that change the presentation away from the document defaults:
             * <pre>sizeAdjust: {number}</pre> scales the text size and line padding
             * <pre>lineHeightAdjust: {number}</pre> scales the line height
             * <pre>backgroundOpacityScale: {number}</pre> scales the backgroundColor opacity
             * <pre>fontFamily: {string}</pre> comma-separated list of font family values to use, if present.
             * <pre>colorAdjust: {documentColor: replaceColor*}</pre> map of document colors and the value with which to replace them
             * <pre>colorOpacityScale: {number}</pre> opacity override on text color (ignored if zero)
             * <pre>regionOpacityScale: {number}</pre> scales the region opacity
             * <pre>textOutline: {string}</pre> textOutline value to use, if present
             * <pre>[span|p|div|body|region]BackgroundColorAdjust: {documentColor: replaceColor*}</pre> map of backgroundColors and the value with which to replace them for each element type
             *
             * @param {Object} isd ISD to be rendered
             * @param {Object} element Element into which the ISD is rendered
             * @param {?IMGResolver} imgResolver Resolve <pre>smpte:background</pre> URIs into URLs.
             * @param {?number} eheight Height (in pixel) of the child <div>div</div> or null
             *                  to use clientHeight of the parent element
             * @param {?number} ewidth Width (in pixel) of the child <div>div</div> or null
             *                  to use clientWidth of the parent element
             * @param {?boolean} displayForcedOnlyMode Value of the IMSC1 displayForcedOnlyMode parameter,
             *                   or false if null
             * @param {?module:imscUtils.ErrorHandler} errorHandler Error callback
             * @param {Object} previousISDState State saved during processing of the previous ISD, or null if initial call
             * @param {?boolean} enableRollUp Enables roll-up animations (see CEA 708)
             * @param {?Object} options Configuration options
             * @return {Object} ISD state to be provided when this funtion is called for the next ISD
             */
      imscHTML.render = function (isd, element, imgResolver, eheight, ewidth, displayForcedOnlyMode, errorHandler, previousISDState, enableRollUp, options) {
        /* maintain aspect ratio if specified */
        var height = eheight || element.clientHeight
        var width = ewidth || element.clientWidth
        if (isd.aspectRatio !== null) {
          var twidth = height * isd.aspectRatio
          if (twidth > width) {
            height = Math.round(width / isd.aspectRatio)
          } else {
            width = twidth
          }
        }
        var rootcontainer = document.createElement('div')
        rootcontainer.style.position = 'relative'
        rootcontainer.style.width = width + 'px'
        rootcontainer.style.height = height + 'px'
        rootcontainer.style.margin = 'auto'
        rootcontainer.style.top = 0
        rootcontainer.style.bottom = 0
        rootcontainer.style.left = 0
        rootcontainer.style.right = 0
        rootcontainer.style.zIndex = 0
        var context = {
          h: height,
          w: width,
          regionH: null,
          regionW: null,
          imgResolver: imgResolver,
          displayForcedOnlyMode: displayForcedOnlyMode || false,
          isd: isd,
          errorHandler: errorHandler,
          previousISDState: previousISDState,
          enableRollUp: enableRollUp || false,
          currentISDState: {},
          flg: null,
          lp: null,
          mra: null,
          ipd: null,
          bpd: null,
          ruby: null,
          textEmphasis: null,
          rubyReserve: null,
          options: Object.assign({}, options) || {}
        }
        /* canonicalise and copy colour adjustment maps */
        if (context.options.colorAdjust) { context.options.colorAdjust = preprocessColorMapOptions(context.options.colorAdjust) }
        var bgcColorElements = ['region', 'body', 'div', 'p', 'span']
        var propName
        for (var bgcei in bgcColorElements) {
          propName = bgcColorElements[bgcei] + backgroundColorAdjustSuffix
          if (context.options[propName]) { context.options[propName] = preprocessColorMapOptions(context.options[propName]) }
        }
        element.appendChild(rootcontainer)
        for (var i in isd.contents) {
          processElement(context, rootcontainer, isd.contents[i])
        }
        return context.currentISDState
      }
      function preprocessColorMapOptions (colorAdjustMap) {
        var canonicalColorMap = {}
        var colorAdjustMapEntries = Object.entries(colorAdjustMap)
        for (var i in colorAdjustMapEntries) {
          var fromColor = imscUtils.parseColor(colorAdjustMapEntries[i][0])
          var toColor = imscUtils.parseColor(colorAdjustMapEntries[i][1])
          if (fromColor && toColor) {
            canonicalColorMap[fromColor.toString()] = toColor
          }
        }
        return canonicalColorMap
      }
      function processElement (context, dom_parent, isd_element) {
        var e
        if (isd_element.kind === 'region') {
          e = document.createElement('div')
          e.style.position = 'absolute'
        } else if (isd_element.kind === 'body') {
          e = document.createElement('div')
        } else if (isd_element.kind === 'div') {
          e = document.createElement('div')
        } else if (isd_element.kind === 'image') {
          e = document.createElement('img')
          if (context.imgResolver !== null && isd_element.src !== null) {
            var uri = context.imgResolver(isd_element.src, e)
            if (uri) { e.src = uri }
            e.height = context.regionH
            e.width = context.regionW
          }
        } else if (isd_element.kind === 'p') {
          e = document.createElement('p')
        } else if (isd_element.kind === 'span') {
          if (isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'container') {
            e = document.createElement('ruby')
            context.ruby = true
          } else if (isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'base') {
            e = document.createElement('rb')
          } else if (isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'text') {
            e = document.createElement('rt')
          } else if (isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'baseContainer') {
            e = document.createElement('rbc')
          } else if (isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'textContainer') {
            e = document.createElement('rtc')
          } else if (isd_element.styleAttrs[imscStyles.byName.ruby.qname] === 'delimiter') {
            /* ignore rp */
            return
          } else {
            e = document.createElement('span')
          }
          // e.textContent = isd_element.text;
        } else if (isd_element.kind === 'br') {
          e = document.createElement('br')
        }
        if (!e) {
          reportError(context.errorHandler, 'Error processing ISD element kind: ' + isd_element.kind)
          return
        }
        /* add to parent */
        dom_parent.appendChild(e)
        /* override UA default margin */
        /* TODO: should apply to <p> only */
        e.style.margin = '0'
        /* determine ipd and bpd */
        if (isd_element.kind === 'region') {
          var wdir = isd_element.styleAttrs[imscStyles.byName.writingMode.qname]
          if (wdir === 'lrtb' || wdir === 'lr') {
            context.ipd = 'lr'
            context.bpd = 'tb'
          } else if (wdir === 'rltb' || wdir === 'rl') {
            context.ipd = 'rl'
            context.bpd = 'tb'
          } else if (wdir === 'tblr') {
            context.ipd = 'tb'
            context.bpd = 'lr'
          } else if (wdir === 'tbrl' || wdir === 'tb') {
            context.ipd = 'tb'
            context.bpd = 'rl'
          }
        } else if (isd_element.kind === 'p' && context.bpd === 'tb') {
          var pdir = isd_element.styleAttrs[imscStyles.byName.direction.qname]
          context.ipd = pdir === 'ltr' ? 'lr' : 'rl'
        }
        /* tranform TTML styles to CSS styles */
        for (var i in STYLING_MAP_DEFS) {
          var sm = STYLING_MAP_DEFS[i]
          var attr = isd_element.styleAttrs[sm.qname]
          if (attr !== undefined && sm.map !== null) {
            sm.map(context, e, isd_element, attr)
          }
        }
        var proc_e = e
        /* do we have linePadding ? */
        var lp = isd_element.styleAttrs[imscStyles.byName.linePadding.qname]
        if (lp && (!lp.isZero())) {
          var plength = lp.multiply(lp.toUsedLength(context.w, context.h), context.options.sizeAdjust)
          if (plength > 0) {
            /* apply padding to the <p> so that line padding does not cause line wraps */
            var padmeasure = Math.ceil(plength) + 'px'
            if (context.bpd === 'tb') {
              proc_e.style.paddingLeft = padmeasure
              proc_e.style.paddingRight = padmeasure
            } else {
              proc_e.style.paddingTop = padmeasure
              proc_e.style.paddingBottom = padmeasure
            }
            context.lp = lp
          }
        }
        // do we have multiRowAlign?
        var mra = isd_element.styleAttrs[imscStyles.byName.multiRowAlign.qname]
        if (mra && mra !== 'auto') {
          /* create inline block to handle multirowAlign */
          var s = document.createElement('span')
          s.style.display = 'inline-block'
          s.style.textAlign = mra
          e.appendChild(s)
          proc_e = s
          context.mra = mra
        }
        /* do we have rubyReserve? */
        var rr = isd_element.styleAttrs[imscStyles.byName.rubyReserve.qname]
        if (rr && rr[0] !== 'none') {
          context.rubyReserve = rr
        }
        /* remember we are filling line gaps */
        if (isd_element.styleAttrs[imscStyles.byName.fillLineGap.qname]) {
          context.flg = true
        }
        if (isd_element.kind === 'span' && isd_element.text) {
          var te = isd_element.styleAttrs[imscStyles.byName.textEmphasis.qname]
          if (te && te.style !== 'none') {
            context.textEmphasis = true
          }
          if (imscStyles.byName.textCombine.qname in isd_element.styleAttrs &&
                        isd_element.styleAttrs[imscStyles.byName.textCombine.qname][0] === 'all') {
            /* ignore tate-chu-yoku since line break cannot happen within */
            e.textContent = isd_element.text
            if (te) {
              applyTextEmphasis(context, e, isd_element, te)
            }
          } else {
            // wrap characters in spans to find the line wrap locations
            var cbuf = ''
            for (var j = 0; j < isd_element.text.length; j++) {
              cbuf += isd_element.text.charAt(j)
              var cc = isd_element.text.charCodeAt(j)
              if (cc < 0xD800 || cc > 0xDBFF || j === isd_element.text.length) {
                /* wrap the character(s) in a span unless it is a high surrogate */
                var span = document.createElement('span')
                span.textContent = cbuf
                /* apply textEmphasis */
                if (te) {
                  applyTextEmphasis(context, span, isd_element, te)
                }
                e.appendChild(span)
                cbuf = ''
              }
            }
          }
        }
        /* process the children of the ISD element */
        for (var k in isd_element.contents) {
          processElement(context, proc_e, isd_element.contents[k])
        }
        /* list of lines */
        var linelist = []
        /* paragraph processing */
        /* TODO: linePadding only supported for horizontal scripts */
        if ((context.lp || context.mra || context.flg || context.ruby || context.textEmphasis || context.rubyReserve) &&
                    isd_element.kind === 'p') {
          constructLineList(context, proc_e, linelist, null)
          /* apply rubyReserve */
          if (context.rubyReserve) {
            applyRubyReserve(linelist, context)
            context.rubyReserve = null
          }
          /* apply tts:rubyPosition="outside" */
          if (context.ruby || context.rubyReserve) {
            applyRubyPosition(linelist, context)
            context.ruby = null
          }
          /* apply text emphasis "outside" position */
          if (context.textEmphasis) {
            applyTextEmphasisOutside(linelist, context)
            context.textEmphasis = null
          }
          /* insert line breaks for multirowalign */
          if (context.mra) {
            applyMultiRowAlign(linelist)
            context.mra = null
          }
          /* add linepadding */
          if (context.lp) {
            applyLinePadding(linelist, context.lp.multiply(context.lp.toUsedLength(context.w, context.h), context.options.sizeAdjust), context)
            context.lp = null
          }
          /* fill line gaps linepadding */
          if (context.flg) {
            var par_edges = rect2edges(proc_e.getBoundingClientRect(), context)
            applyFillLineGap(linelist, par_edges.before, par_edges.after, context)
            context.flg = null
          }
        }
        /* region processing */
        if (isd_element.kind === 'region') {
          /* build line list */
          constructLineList(context, proc_e, linelist)
          /* perform roll up if needed */
          if ((context.bpd === 'tb') &&
                        context.enableRollUp &&
                        isd_element.contents.length > 0 &&
                        isd_element.styleAttrs[imscStyles.byName.displayAlign.qname] === 'after') {
            /* horrible hack, perhaps default region id should be underscore everywhere? */
            var rid = isd_element.id === '' ? '_' : isd_element.id
            var rb = new RegionPBuffer(rid, linelist)
            context.currentISDState[rb.id] = rb
            if (context.previousISDState &&
                            rb.id in context.previousISDState &&
                            context.previousISDState[rb.id].plist.length > 0 &&
                            rb.plist.length > 1 &&
                            rb.plist[rb.plist.length - 2].text ===
                                context.previousISDState[rb.id].plist[context.previousISDState[rb.id].plist.length - 1].text) {
              var body_elem = e.firstElementChild
              var h = rb.plist[rb.plist.length - 1].after - rb.plist[rb.plist.length - 1].before
              body_elem.style.bottom = '-' + h + 'px'
              body_elem.style.transition = 'transform 0.4s'
              body_elem.style.position = 'relative'
              body_elem.style.transform = 'translateY(-' + h + 'px)'
            }
          }
          /* TODO: clean-up the spans ? */
        }
      }
      function applyLinePadding (lineList, lp, context) {
        for (var i in lineList) {
          var l = lineList[i].elements.length
          var se = lineList[i].elements[lineList[i].start_elem]
          var ee = lineList[i].elements[lineList[i].end_elem]
          var pospadpxlen = Math.ceil(lp) + 'px'
          var negpadpxlen = '-' + Math.ceil(lp) + 'px'
          if (l !== 0) {
            if (context.ipd === 'lr') {
              se.node.style.borderLeftColor = se.bgcolor || '#00000000'
              se.node.style.borderLeftStyle = 'solid'
              se.node.style.borderLeftWidth = pospadpxlen
              se.node.style.marginLeft = negpadpxlen
            } else if (context.ipd === 'rl') {
              se.node.style.borderRightColor = se.bgcolor || '#00000000'
              se.node.style.borderRightStyle = 'solid'
              se.node.style.borderRightWidth = pospadpxlen
              se.node.style.marginRight = negpadpxlen
            } else if (context.ipd === 'tb') {
              se.node.style.borderTopColor = se.bgcolor || '#00000000'
              se.node.style.borderTopStyle = 'solid'
              se.node.style.borderTopWidth = pospadpxlen
              se.node.style.marginTop = negpadpxlen
            }
            if (context.ipd === 'lr') {
              ee.node.style.borderRightColor = ee.bgcolor || '#00000000'
              ee.node.style.borderRightStyle = 'solid'
              ee.node.style.borderRightWidth = pospadpxlen
              ee.node.style.marginRight = negpadpxlen
            } else if (context.ipd === 'rl') {
              ee.node.style.borderLeftColor = ee.bgcolor || '#00000000'
              ee.node.style.borderLeftStyle = 'solid'
              ee.node.style.borderLeftWidth = pospadpxlen
              ee.node.style.marginLeft = negpadpxlen
            } else if (context.ipd === 'tb') {
              ee.node.style.borderBottomColor = ee.bgcolor || '#00000000'
              ee.node.style.borderBottomStyle = 'solid'
              ee.node.style.borderBottomWidth = pospadpxlen
              ee.node.style.marginBottom = negpadpxlen
            }
          }
        }
      }
      function applyMultiRowAlign (lineList) {
        /* apply an explicit br to all but the last line */
        for (var i = 0; i < lineList.length - 1; i++) {
          var l = lineList[i].elements.length
          if (l !== 0 && lineList[i].br === false) {
            var br = document.createElement('br')
            var lastnode = lineList[i].elements[l - 1].node
            lastnode.parentElement.insertBefore(br, lastnode.nextSibling)
          }
        }
      }
      function applyTextEmphasisOutside (lineList, context) {
        /* supports "outside" only */
        for (var i = 0; i < lineList.length; i++) {
          for (var j = 0; j < lineList[i].te.length; j++) {
            /* skip if position already set */
            if (lineList[i].te[j].style[TEXTEMPHASISPOSITION_PROP] &&
                            lineList[i].te[j].style[TEXTEMPHASISPOSITION_PROP] !== 'none') { continue }
            var pos
            if (context.bpd === 'tb') {
              pos = (i === 0) ? 'left over' : 'left under'
            } else {
              if (context.bpd === 'rl') {
                pos = (i === 0) ? 'right under' : 'left under'
              } else {
                pos = (i === 0) ? 'left under' : 'right under'
              }
            }
            lineList[i].te[j].style[TEXTEMPHASISPOSITION_PROP] = pos
          }
        }
      }
      function applyRubyPosition (lineList, context) {
        for (var i = 0; i < lineList.length; i++) {
          for (var j = 0; j < lineList[i].rbc.length; j++) {
            /* skip if ruby-position already set */
            if (lineList[i].rbc[j].style[RUBYPOSITION_PROP]) { continue }
            var pos
            if (RUBYPOSITION_ISWK) {
              /* WebKit exception */
              pos = (i === 0) ? 'before' : 'after'
            } else if (context.bpd === 'tb') {
              pos = (i === 0) ? 'over' : 'under'
            } else {
              if (context.bpd === 'rl') {
                pos = (i === 0) ? 'over' : 'under'
              } else {
                pos = (i === 0) ? 'under' : 'over'
              }
            }
            lineList[i].rbc[j].style[RUBYPOSITION_PROP] = pos
          }
        }
      }
      function applyRubyReserve (lineList, context) {
        for (var i = 0; i < lineList.length; i++) {
          var ruby = document.createElement('ruby')
          var rb = document.createElement('rb')
          rb.textContent = '\u200B'
          ruby.appendChild(rb)
          var rt1
          var rt2
          var fs = context.rubyReserve[1].toUsedLength(context.w, context.h) + 'px'
          if (context.rubyReserve[0] === 'both' || (context.rubyReserve[0] === 'outside' && lineList.length == 1)) {
            rt1 = document.createElement('rtc')
            rt1.style[RUBYPOSITION_PROP] = RUBYPOSITION_ISWK ? 'after' : 'under'
            rt1.textContent = '\u200B'
            rt1.style.fontSize = fs
            rt2 = document.createElement('rtc')
            rt2.style[RUBYPOSITION_PROP] = RUBYPOSITION_ISWK ? 'before' : 'over'
            rt2.textContent = '\u200B'
            rt2.style.fontSize = fs
            ruby.appendChild(rt1)
            ruby.appendChild(rt2)
          } else {
            rt1 = document.createElement('rtc')
            rt1.textContent = '\u200B'
            rt1.style.fontSize = fs
            var pos
            if (context.rubyReserve[0] === 'after' || (context.rubyReserve[0] === 'outside' && i > 0)) {
              pos = RUBYPOSITION_ISWK ? 'after' : ((context.bpd === 'tb' || context.bpd === 'rl') ? 'under' : 'over')
            } else {
              pos = RUBYPOSITION_ISWK ? 'before' : ((context.bpd === 'tb' || context.bpd === 'rl') ? 'over' : 'under')
            }
            rt1.style[RUBYPOSITION_PROP] = pos
            ruby.appendChild(rt1)
          }
          /* add in front of the first ruby element of the line, if it exists */
          var sib = null
          for (var j = 0; j < lineList[i].rbc.length; j++) {
            if (lineList[i].rbc[j].localName === 'ruby') {
              sib = lineList[i].rbc[j]
              /* copy specified style properties from the sibling ruby container */
              for (var k = 0; k < sib.style.length; k++) {
                ruby.style.setProperty(sib.style.item(k), sib.style.getPropertyValue(sib.style.item(k)))
              }
              break
            }
          }
          /* otherwise add before first span */
          sib = sib || lineList[i].elements[0].node
          sib.parentElement.insertBefore(ruby, sib)
        }
      }
      function applyFillLineGap (lineList, par_before, par_after, context) {
        /* positive for BPD = lr and tb, negative for BPD = rl */
        var s = Math.sign(par_after - par_before)
        for (var i = 0; i <= lineList.length; i++) {
          /* compute frontier between lines */
          var frontier
          if (i === 0) {
            frontier = par_before
          } else if (i === lineList.length) {
            frontier = par_after
          } else {
            frontier = (lineList[i].before + lineList[i - 1].after) / 2
          }
          /* padding amount */
          var pad
          /* current element */
          var e
          /* before line */
          if (i > 0) {
            for (var j = 0; j < lineList[i - 1].elements.length; j++) {
              if (lineList[i - 1].elements[j].bgcolor === null) { continue }
              e = lineList[i - 1].elements[j]
              if (s * (e.after - frontier) < 0) {
                pad = Math.ceil(Math.abs(frontier - e.after)) + 'px'
                e.node.style.backgroundColor = e.bgcolor
                if (context.bpd === 'lr') {
                  e.node.style.paddingRight = pad
                } else if (context.bpd === 'rl') {
                  e.node.style.paddingLeft = pad
                } else if (context.bpd === 'tb') {
                  e.node.style.paddingBottom = pad
                }
              }
            }
          }
          /* after line */
          if (i < lineList.length) {
            for (var k = 0; k < lineList[i].elements.length; k++) {
              e = lineList[i].elements[k]
              if (e.bgcolor === null) { continue }
              if (s * (e.before - frontier) > 0) {
                pad = Math.ceil(Math.abs(e.before - frontier)) + 'px'
                e.node.style.backgroundColor = e.bgcolor
                if (context.bpd === 'lr') {
                  e.node.style.paddingLeft = pad
                } else if (context.bpd === 'rl') {
                  e.node.style.paddingRight = pad
                } else if (context.bpd === 'tb') {
                  e.node.style.paddingTop = pad
                }
              }
            }
          }
        }
      }
      function RegionPBuffer (id, lineList) {
        this.id = id
        this.plist = lineList
      }
      function rect2edges (rect, context) {
        var edges = { before: null, after: null, start: null, end: null }
        if (context.bpd === 'tb') {
          edges.before = rect.top
          edges.after = rect.bottom
          if (context.ipd === 'lr') {
            edges.start = rect.left
            edges.end = rect.right
          } else {
            edges.start = rect.right
            edges.end = rect.left
          }
        } else if (context.bpd === 'lr') {
          edges.before = rect.left
          edges.after = rect.right
          edges.start = rect.top
          edges.end = rect.bottom
        } else if (context.bpd === 'rl') {
          edges.before = rect.right
          edges.after = rect.left
          edges.start = rect.top
          edges.end = rect.bottom
        }
        return edges
      }
      function constructLineList (context, element, llist, bgcolor) {
        if (element.localName === 'rt' || element.localName === 'rtc') {
          /* skip ruby annotations */
          return
        }
        var curbgcolor = element.style.backgroundColor || bgcolor
        if (element.childElementCount === 0) {
          if (element.localName === 'span' || element.localName === 'rb') {
            var r = element.getBoundingClientRect()
            /* skip if span is not displayed */
            if (r.height === 0 || r.width === 0) { return }
            var edges = rect2edges(r, context)
            if (llist.length === 0 ||
                            (!isSameLine(edges.before, edges.after, llist[llist.length - 1].before, llist[llist.length - 1].after))) {
              llist.push({
                before: edges.before,
                after: edges.after,
                start: edges.start,
                end: edges.end,
                start_elem: 0,
                end_elem: 0,
                elements: [],
                rbc: [],
                te: [],
                text: '',
                br: false
              })
            } else {
              /* positive for BPD = lr and tb, negative for BPD = rl */
              var bpd_dir = Math.sign(edges.after - edges.before)
              /* positive for IPD = lr and tb, negative for IPD = rl */
              var ipd_dir = Math.sign(edges.end - edges.start)
              /* check if the line height has increased */
              if (bpd_dir * (edges.before - llist[llist.length - 1].before) < 0) {
                llist[llist.length - 1].before = edges.before
              }
              if (bpd_dir * (edges.after - llist[llist.length - 1].after) > 0) {
                llist[llist.length - 1].after = edges.after
              }
              if (ipd_dir * (edges.start - llist[llist.length - 1].start) < 0) {
                llist[llist.length - 1].start = edges.start
                llist[llist.length - 1].start_elem = llist[llist.length - 1].elements.length
              }
              if (ipd_dir * (edges.end - llist[llist.length - 1].end) > 0) {
                llist[llist.length - 1].end = edges.end
                llist[llist.length - 1].end_elem = llist[llist.length - 1].elements.length
              }
            }
            llist[llist.length - 1].text += element.textContent
            llist[llist.length - 1].elements.push({
              node: element,
              bgcolor: curbgcolor,
              before: edges.before,
              after: edges.after
            })
          } else if (element.localName === 'br' && llist.length !== 0) {
            llist[llist.length - 1].br = true
          }
        } else {
          var child = element.firstChild
          while (child) {
            if (child.nodeType === Node.ELEMENT_NODE) {
              constructLineList(context, child, llist, curbgcolor)
              if (child.localName === 'ruby' || child.localName === 'rtc') {
                /* remember non-empty ruby and rtc elements so that tts:rubyPosition can be applied */
                if (llist.length > 0) {
                  llist[llist.length - 1].rbc.push(child)
                }
              } else if (child.localName === 'span' &&
                                child.style[TEXTEMPHASISSTYLE_PROP] &&
                                child.style[TEXTEMPHASISSTYLE_PROP] !== 'none') {
                /* remember non-empty span elements with textEmphasis */
                if (llist.length > 0) {
                  llist[llist.length - 1].te.push(child)
                }
              }
            }
            child = child.nextSibling
          }
        }
      }
      function isSameLine (before1, after1, before2, after2) {
        return ((after1 < after2) && (before1 > before2)) || ((after2 <= after1) && (before2 >= before1))
      }
      function applyTextEmphasis (context, dom_element, isd_element, attr) {
        /* ignore color (not used in IMSC 1.1) */
        if (attr.style === 'none') {
          dom_element.style[TEXTEMPHASISSTYLE_PROP] = 'none'
          /* no need to set position, so return */
          return
        } else if (attr.style === 'auto') {
          dom_element.style[TEXTEMPHASISSTYLE_PROP] = 'filled'
        } else {
          dom_element.style[TEXTEMPHASISSTYLE_PROP] = attr.style + ' ' + attr.symbol
        }
        /* ignore "outside" position (set in postprocessing) */
        if (attr.position === 'before' || attr.position === 'after') {
          var pos
          if (context.bpd === 'tb') {
            pos = (attr.position === 'before') ? 'left over' : 'left under'
          } else {
            if (context.bpd === 'rl') {
              pos = (attr.position === 'before') ? 'right under' : 'left under'
            } else {
              pos = (attr.position === 'before') ? 'left under' : 'right under'
            }
          }
          dom_element.style[TEXTEMPHASISPOSITION_PROP] = pos
        }
      }
      function HTMLStylingMapDefintion (qName, mapFunc) {
        this.qname = qName
        this.map = mapFunc
      }
      var STYLING_MAP_DEFS = [
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling backgroundColor', function (context, dom_element, isd_element, attr) {
          var backgroundColorAdjustMap = context.options[isd_element.kind + backgroundColorAdjustSuffix]
          var map_attr = backgroundColorAdjustMap && backgroundColorAdjustMap[attr.toString()]
          if (map_attr) { attr = map_attr }
          var opacity = attr[3]
          /* skip if transparent */
          if (opacity === 0) { return }
          /* make sure that we allow a multiplier of 0 here*/
          if (context.options.backgroundOpacityScale != undefined) { opacity = opacity * context.options.backgroundOpacityScale }
          opacity = opacity / 255
          dom_element.style.backgroundColor = 'rgba(' +
                        attr[0].toString() + ',' +
                        attr[1].toString() + ',' +
                        attr[2].toString() + ',' +
                        opacity.toString() +
                        ')'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling color', function (context, dom_element, isd_element, attr) {
          /*
                     * <pre>colorAdjust: {documentColor: replaceColor*}</pre> map of document colors and the value with which to replace them
                     * <pre>colorOpacityScale: {number}</pre> opacity multiplier on text color (ignored if zero)
                     */
          var opacityMultiplier = context.options.colorOpacityScale || 1
          var colorAdjustMap = context.options.colorAdjust
          if (colorAdjustMap != undefined) {
            var map_attr = colorAdjustMap[attr.toString()]
            if (map_attr) { attr = map_attr }
          }
          dom_element.style.color = 'rgba(' +
                        attr[0].toString() + ',' +
                        attr[1].toString() + ',' +
                        attr[2].toString() + ',' +
                        (opacityMultiplier * attr[3] / 255).toString() +
                        ')'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling direction', function (context, dom_element, isd_element, attr) {
          dom_element.style.direction = attr
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling display', function (context, dom_element, isd_element, attr) { }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling displayAlign', function (context, dom_element, isd_element, attr) {
          /* see https://css-tricks.com/snippets/css/a-guide-to-flexbox/ */
          /* TODO: is this affected by writing direction? */
          dom_element.style.display = 'flex'
          dom_element.style.flexDirection = 'column'
          if (attr === 'before') {
            dom_element.style.justifyContent = 'flex-start'
          } else if (attr === 'center') {
            dom_element.style.justifyContent = 'center'
          } else if (attr === 'after') {
            dom_element.style.justifyContent = 'flex-end'
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling extent', function (context, dom_element, isd_element, attr) {
          /* TODO: this is super ugly */
          context.regionH = attr.h.toUsedLength(context.w, context.h)
          context.regionW = attr.w.toUsedLength(context.w, context.h)
          /*
                     * CSS height/width are measured against the content rectangle,
                     * whereas TTML height/width include padding
                     */
          var hdelta = 0
          var wdelta = 0
          var p = isd_element.styleAttrs['http://www.w3.org/ns/ttml#styling padding']
          if (!p)
            ;
          else {
            hdelta = p[0].toUsedLength(context.w, context.h) + p[2].toUsedLength(context.w, context.h)
            wdelta = p[1].toUsedLength(context.w, context.h) + p[3].toUsedLength(context.w, context.h)
          }
          dom_element.style.height = (context.regionH - hdelta) + 'px'
          dom_element.style.width = (context.regionW - wdelta) + 'px'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling fontFamily', function (context, dom_element, isd_element, attr) {
          var rslt = []
          /* per IMSC1 */
          if (context.options.fontFamily) {
            attr = context.options.fontFamily.split(',')
          }
          for (var i in attr) {
            attr[i] = attr[i].trim()
            if (attr[i] === 'monospaceSerif') {
              rslt.push('Courier New')
              rslt.push('"Liberation Mono"')
              rslt.push('Courier')
              rslt.push('monospace')
            } else if (attr[i] === 'proportionalSansSerif' || attr[i] === 'default') {
              rslt.push('Arial')
              rslt.push('Helvetica')
              rslt.push('"Liberation Sans"')
              rslt.push('sans-serif')
            } else if (attr[i] === 'monospace') {
              rslt.push('monospace')
            } else if (attr[i] === 'sansSerif') {
              rslt.push('sans-serif')
            } else if (attr[i] === 'serif') {
              rslt.push('serif')
            } else if (attr[i] === 'monospaceSansSerif') {
              rslt.push('Consolas')
              rslt.push('monospace')
            } else if (attr[i] === 'proportionalSerif') {
              rslt.push('serif')
            } else {
              rslt.push(attr[i])
            }
          }
          dom_element.style.fontFamily = rslt.join(',')
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling shear', function (context, dom_element, isd_element, attr) {
          /* return immediately if tts:shear is 0% since CSS transforms are not inherited*/
          if (attr === 0) { return }
          var angle = attr * -0.9
          /* context.bpd is needed since writing mode is not inherited and sets the inline progression */
          if (context.bpd === 'tb') {
            dom_element.style.transform = 'skewX(' + angle + 'deg)'
          } else {
            dom_element.style.transform = 'skewY(' + angle + 'deg)'
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling fontSize', function (context, dom_element, isd_element, attr) {
          dom_element.style.fontSize = attr.multiply(attr.toUsedLength(context.w, context.h), context.options.sizeAdjust) + 'px'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling fontStyle', function (context, dom_element, isd_element, attr) {
          dom_element.style.fontStyle = attr
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling fontWeight', function (context, dom_element, isd_element, attr) {
          dom_element.style.fontWeight = attr
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling lineHeight', function (context, dom_element, isd_element, attr) {
          if (attr === 'normal') {
            dom_element.style.lineHeight = 'normal'
          } else {
            dom_element.style.lineHeight =
                            attr.multiply(attr.multiply(attr.toUsedLength(context.w, context.h), context.options.sizeAdjust), context.options.lineHeightAdjust) + 'px'
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling opacity', function (context, dom_element, isd_element, attr) {
          /*
                     * Customisable using <pre>regionOpacityScale: {number}</pre>
                     * which acts as a multiplier.
                     */
          var opacity = attr
          if (context.options.regionOpacityScale != undefined) {
            opacity = opacity * context.options.regionOpacityScale
          }
          dom_element.style.opacity = opacity
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling origin', function (context, dom_element, isd_element, attr) {
          dom_element.style.top = attr.h.toUsedLength(context.w, context.h) + 'px'
          dom_element.style.left = attr.w.toUsedLength(context.w, context.h) + 'px'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling overflow', function (context, dom_element, isd_element, attr) {
          dom_element.style.overflow = attr
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling padding', function (context, dom_element, isd_element, attr) {
          /* attr: top,left,bottom,right*/
          /* style: top right bottom left*/
          var rslt = []
          rslt[0] = attr[0].toUsedLength(context.w, context.h) + 'px'
          rslt[1] = attr[3].toUsedLength(context.w, context.h) + 'px'
          rslt[2] = attr[2].toUsedLength(context.w, context.h) + 'px'
          rslt[3] = attr[1].toUsedLength(context.w, context.h) + 'px'
          dom_element.style.padding = rslt.join(' ')
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling position', function (context, dom_element, isd_element, attr) {
          dom_element.style.top = attr.h.toUsedLength(context.w, context.h) + 'px'
          dom_element.style.left = attr.w.toUsedLength(context.w, context.h) + 'px'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling rubyAlign', function (context, dom_element, isd_element, attr) {
          dom_element.style.rubyAlign = attr === 'spaceAround' ? 'space-around' : 'center'
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling rubyPosition', function (context, dom_element, isd_element, attr) {
          /* skip if "outside", which is handled by applyRubyPosition() */
          if (attr === 'before' || attr === 'after') {
            var pos
            if (RUBYPOSITION_ISWK) {
              /* WebKit exception */
              pos = attr
            } else if (context.bpd === 'tb') {
              pos = (attr === 'before') ? 'over' : 'under'
            } else {
              if (context.bpd === 'rl') {
                pos = (attr === 'before') ? 'over' : 'under'
              } else {
                pos = (attr === 'before') ? 'under' : 'over'
              }
            }
            /* apply position to the parent dom_element, i.e. ruby or rtc */
            dom_element.parentElement.style[RUBYPOSITION_PROP] = pos
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling showBackground', null),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling textAlign', function (context, dom_element, isd_element, attr) {
          var ta
          /* handle UAs that do not understand start or end */
          if (attr === 'start') {
            ta = (context.ipd === 'rl') ? 'right' : 'left'
          } else if (attr === 'end') {
            ta = (context.ipd === 'rl') ? 'left' : 'right'
          } else {
            ta = attr
          }
          dom_element.style.textAlign = ta
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling textDecoration', function (context, dom_element, isd_element, attr) {
          dom_element.style.textDecoration = attr.join(' ').replace('lineThrough', 'line-through')
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling textOutline', function (context, dom_element, isd_element, attr) {
          /* defer to tts:textShadow */
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling textShadow', function (context, dom_element, isd_element, attr) {
          var txto = isd_element.styleAttrs[imscStyles.byName.textOutline.qname]
          var otxto = context.options.textOutline
          if (otxto) {
            if (otxto === 'none') {
              txto = otxto
            } else {
              var r = {}
              var os = otxto.split(' ')
              if (os.length !== 0 && os.length <= 2) {
                var c = imscUtils.parseColor(os[0])
                r.color = c
                if (c !== null) { os.shift() }
                if (os.length === 1) {
                  var l = imscUtils.parseLength(os[0])
                  if (l) {
                    r.thickness = l
                    txto = r
                  }
                }
              }
            }
          }
          if (attr === 'none' && txto === 'none') {
            dom_element.style.textShadow = ''
          } else {
            var s = []
            if (txto !== 'none') {
              /* emulate text outline */
              var to_color = 'rgba(' +
                                txto.color[0].toString() + ',' +
                                txto.color[1].toString() + ',' +
                                txto.color[2].toString() + ',' +
                                (txto.color[3] / 255).toString() +
                                ')'
              s.push('1px 1px 1px ' + to_color)
              s.push('-1px 1px 1px ' + to_color)
              s.push('1px -1px 1px ' + to_color)
              s.push('-1px -1px 1px ' + to_color)
            }
            /* add text shadow */
            if (attr !== 'none') {
              for (var i in attr) {
                s.push(attr[i].x_off.toUsedLength(context.w, context.h) + 'px ' +
                                    attr[i].y_off.toUsedLength(context.w, context.h) + 'px ' +
                                    attr[i].b_radius.toUsedLength(context.w, context.h) + 'px ' +
                                    'rgba(' +
                                    attr[i].color[0].toString() + ',' +
                                    attr[i].color[1].toString() + ',' +
                                    attr[i].color[2].toString() + ',' +
                                    (attr[i].color[3] / 255).toString() +
                                    ')')
              }
            }
            dom_element.style.textShadow = s.join(',')
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling textCombine', function (context, dom_element, isd_element, attr) {
          dom_element.style.textCombineUpright = attr.join(' ')
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling textEmphasis', function (context, dom_element, isd_element, attr) {
          /* applied as part of HTML document construction */
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling unicodeBidi', function (context, dom_element, isd_element, attr) {
          var ub
          if (attr === 'bidiOverride') {
            ub = 'bidi-override'
          } else {
            ub = attr
          }
          dom_element.style.unicodeBidi = ub
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling visibility', function (context, dom_element, isd_element, attr) {
          dom_element.style.visibility = attr
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling wrapOption', function (context, dom_element, isd_element, attr) {
          if (attr === 'wrap') {
            if (isd_element.space === 'preserve') {
              dom_element.style.whiteSpace = 'pre-wrap'
            } else {
              dom_element.style.whiteSpace = 'normal'
            }
          } else {
            if (isd_element.space === 'preserve') {
              dom_element.style.whiteSpace = 'pre'
            } else {
              dom_element.style.whiteSpace = 'noWrap'
            }
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling writingMode', function (context, dom_element, isd_element, attr) {
          if (attr === 'lrtb' || attr === 'lr') {
            dom_element.style.writingMode = 'horizontal-tb'
          } else if (attr === 'rltb' || attr === 'rl') {
            dom_element.style.writingMode = 'horizontal-tb'
          } else if (attr === 'tblr') {
            dom_element.style.writingMode = 'vertical-lr'
          } else if (attr === 'tbrl' || attr === 'tb') {
            dom_element.style.writingMode = 'vertical-rl'
          }
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml#styling zIndex', function (context, dom_element, isd_element, attr) {
          dom_element.style.zIndex = attr
        }),
        new HTMLStylingMapDefintion('http://www.w3.org/ns/ttml/profile/imsc1#styling forcedDisplay', function (context, dom_element, isd_element, attr) {
          if (context.displayForcedOnlyMode && attr === false) {
            dom_element.style.visibility = 'hidden'
          }
        })
      ]
      var STYLMAP_BY_QNAME = {}
      for (var i in STYLING_MAP_DEFS) {
        STYLMAP_BY_QNAME[STYLING_MAP_DEFS[i].qname] = STYLING_MAP_DEFS[i]
      }
      /* CSS property names */
      var RUBYPOSITION_ISWK = 'webkitRubyPosition' in window.getComputedStyle(document.documentElement)
      var RUBYPOSITION_PROP = RUBYPOSITION_ISWK ? 'webkitRubyPosition' : 'rubyPosition'
      var TEXTEMPHASISSTYLE_PROP = 'webkitTextEmphasisStyle' in window.getComputedStyle(document.documentElement) ? 'webkitTextEmphasisStyle' : 'textEmphasisStyle'
      var TEXTEMPHASISPOSITION_PROP = 'webkitTextEmphasisPosition' in window.getComputedStyle(document.documentElement) ? 'webkitTextEmphasisPosition' : 'textEmphasisPosition'
      /* error utilities */
      function reportError (errorHandler, msg) {
        if (errorHandler && errorHandler.error && errorHandler.error(msg)) { throw msg }
      }
    })(exports, typeof imscNames === 'undefined' ? names : imscNames, typeof imscStyles === 'undefined' ? styles : imscStyles, typeof imscUtils === 'undefined' ? utils : imscUtils)
  })
  DebugTool.info('try block in IMSC')
} catch (smpError) {
  DebugTool.info('Catch block in IMSC')
  DebugTool.info(JSON.stringify(smpError))
  var overlayElement = document.createElement('div')
  overlayElement.id = 'overlayElement'
  overlayElement.style.position = 'absolute'
  overlayElement.style.bottom = '200px'
  overlayElement.style.right = '300px'
  overlayElement.style.height = '50%'
  overlayElement.style.width = '50%'
  overlayElement.style.backgroundColor = 'white'
  overlayElement.style.zIndex = '1000'

  document.body.appendChild(overlayElement)

  overlayElement.innerText = smpError
  throw smpError
}

var fromXML = doc.fromXML
var generateISD = isd.generateISD
var render = html.render
export { fromXML, generateISD, render as renderHTML }
