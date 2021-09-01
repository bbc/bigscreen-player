function PlaybackSpinner () {
  const spinnerContainer = document.createElement('div')
  spinnerContainer.id = 'loadingSpinner'
  spinnerContainer.className = 'loadingSpinner loadingSpinner--large '

  const spinner = document.createElement('div')
  spinner.className = 'loadingSpinner__spinner'

  spinnerContainer.appendChild(spinner)

  return spinnerContainer
}

export default PlaybackSpinner
