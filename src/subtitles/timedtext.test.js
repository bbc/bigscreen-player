import TimedText from './timedtext'

describe('TimedText', () => {
  it('Should initialise with an Element and style callback function', () => {
    const mockElement = document.createElement('span')
    mockElement.setAttribute('begin', '00:00:10')
    mockElement.setAttribute('end', '00:00:13')
    const mockFunction = jest.fn()
    const timedText = TimedText(mockElement, mockFunction)

    expect(timedText).toEqual(expect.objectContaining({ start: 10, end: 13, addToDom: expect.any(Function), removeFromDomIfExpired: expect.any(Function) }))
  })

  it('Should add itself to a supplied DOM element', () => {
    const domElement = document.createElement('div')
    const mockElement = document.createElement('span')
    mockElement.setAttribute('begin', '00:00:10')
    mockElement.setAttribute('end', '00:00:13')
    const mockParentElement = document.createElement('p')
    mockParentElement.appendChild(mockElement)

    const mockFunction = jest.fn()
    const timedText = TimedText(mockElement, mockFunction)

    timedText.addToDom(domElement)

    expect(domElement.hasChildNodes()).toBe(true)
  })

  it('Should remove itself from a parent DOM element', () => {
    const domElement = document.createElement('div')
    const mockElement = document.createElement('span')
    mockElement.setAttribute('begin', '00:00:10')
    mockElement.setAttribute('end', '00:00:13')
    const mockParentElement = document.createElement('p')
    mockParentElement.appendChild(mockElement)

    const mockFunction = jest.fn()
    const timedText = TimedText(mockElement, mockFunction)

    timedText.addToDom(domElement)
    timedText.removeFromDomIfExpired(14)

    expect(domElement.hasChildNodes()).toBe(false)
  })
})
