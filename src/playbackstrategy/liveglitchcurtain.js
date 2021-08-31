import PlaybackSpinner from '../playbackspinner'
import DOMHelpers from '../domhelpers'

function LiveGlitchCurtain (parentElement) {
  let spinner = new PlaybackSpinner()
  let curtain = document.createElement('div')

  curtain.id = 'liveGlitchCurtain'
  curtain.style.display = 'none'
  curtain.style.position = 'absolute'
  curtain.style.top = 0
  curtain.style.left = 0
  curtain.style.right = 0
  curtain.style.bottom = 0
  curtain.style.backgroundColor = '#3c3c3c'

  curtain.appendChild(spinner)

  return {
    showCurtain: () => {
      curtain.style.display = 'block'
      parentElement.appendChild(curtain)
    },

    hideCurtain: () => {
      curtain.style.display = 'none'
      DOMHelpers.safeRemoveElement(spinner)
    },

    tearDown: () => {
      DOMHelpers.safeRemoveElement(curtain)

      if (spinner) {
        spinner = undefined
      }
    }
  }
}

export default LiveGlitchCurtain
