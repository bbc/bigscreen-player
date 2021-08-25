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

describe('Renderer', () => {
  it('should initialise with a id, xml object, media player', () => {
    const mockMediaPlayer = jest.fn()
    const renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer)

    expect(renderer).toEqual(expect.objectContaining({
      render: expect.any(Function),
      start: expect.any(Function),
      stop: expect.any(Function)
    }))
  })

  it('should set the output elements display style on initialisation', () => {
    const mockMediaPlayer = jest.fn()
    const renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer)
    const outputElement = renderer.render()

    expect(outputElement.style.display).toBe('block')
  })
})
