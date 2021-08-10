import Renderer from './renderer'

jest.mock('./transformer', () => {
  return () => {
    return {
      transformXML: () => {
        return {
          baseStyle: '',
          subtitlesForTime: () => {}
        }
      }
    }
  }
})

describe('Renderer', function () {
  it('should initialise with a id, xml object, media player', function () {
    var mockMediaPlayer = jest.fn()
    var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer)

    expect(renderer).toEqual(expect.objectContaining({
      render: expect.any(Function),
      start: expect.any(Function),
      stop: expect.any(Function)
    }))
  })

  it('should set the output elements display style on initialisation', function () {
    var mockMediaPlayer = jest.fn()
    var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer)
    var outputElement = renderer.render()

    expect(outputElement.style.display).toBe('block')
  })
})
