export default function () {
  var spinnerContainer = document.createElement('div')
  spinnerContainer.id = 'loadingSpinner'
  spinnerContainer.className = 'loadingSpinner loadingSpinner--large '

  var spinner = document.createElement('div')
  spinner.className = 'loadingSpinner__spinner'

  spinnerContainer.appendChild(spinner)

  return spinnerContainer
}
