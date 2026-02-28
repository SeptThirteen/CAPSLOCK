// KeyRecorder — manages key recording widget state and UI
// Usage: attach to a button, get a callback when a key (or combo) is recorded

let _recording = false
let _onDone = null
let _recordBtn = null

export function attachRecorder (btn, onDone) {
  _recordBtn = btn
  _onDone = onDone
  btn.addEventListener('click', () => {
    if (_recording) {
      stopRecording()
    } else {
      startRecording()
    }
  })
}

export function startRecording () {
  _recording = true
  if (_recordBtn) {
    _recordBtn.classList.add('recording')
    _recordBtn.textContent = '⏺ Listening…'
  }
  window.capslock.startKeyRecord()
}

export function stopRecording () {
  _recording = false
  if (_recordBtn) {
    _recordBtn.classList.remove('recording')
    _recordBtn.textContent = 'Record Keys'
  }
  window.capslock.stopKeyRecord()
}

export function isRecording () { return _recording }

// Called from renderer when IPC key:recorded fires
export function receiveRecorded (data) {
  _recording = false
  if (_recordBtn) {
    _recordBtn.classList.remove('recording')
    _recordBtn.textContent = 'Record Keys'
  }
  if (_onDone) _onDone(data)
  _onDone = null
  _recordBtn = null
}
