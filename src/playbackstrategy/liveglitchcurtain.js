import DOMHelpers from "../domhelpers"

function LiveGlitchCurtain(parentElement) {
  let curtain = document.createElement("div")

  curtain.id = "liveGlitchCurtain"
  curtain.style.display = "none"
  curtain.style.position = "absolute"
  curtain.style.top = 0
  curtain.style.left = 0
  curtain.style.right = 0
  curtain.style.bottom = 0
  curtain.style.backgroundColor = "#3c3c3c"

  return {
    showCurtain: () => {
      curtain.style.display = "block"
      parentElement.appendChild(curtain)
    },

    hideCurtain: () => {
      curtain.style.display = "none"
    },

    tearDown: () => {
      DOMHelpers.safeRemoveElement(curtain)
    },
  }
}

export default LiveGlitchCurtain
