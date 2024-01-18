import './style.css'
import WHEPClient from './WHEPClient.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>WHEP Test Page</h1>
    <div>Connetion State: <span id="connection-state"></span></div>
    <div class="card">
        <div>
        <input id="disable-video" type="checkbox" checked />
        <label for="disable-video">Disable Video</label><br>
        <input id="disable-audio" type="checkbox" />
        <label for="disable-audio">Disable Audio</label><br>
    </div>
    <input id="whep-input-text" type="text" placeholder="Enter WHEP url" />
      <button id="submit" type="button">Connect</button>
      <button id="disconnect" type="button" disabled>Disconnect</button>
    </div>

    <video id="local-video" autoplay playsinline controls></video>
  </div>
`

const input = document.querySelector<HTMLInputElement>('#whep-input-text')!
const submitButton = document.querySelector<HTMLButtonElement>('#submit')!
const disconnectButton = document.querySelector<HTMLButtonElement>('#disconnect')!
const localVideo = document.querySelector<HTMLVideoElement>('#local-video')!
submitButton.onclick = () => {
    const url = input.value
    if (!url) {
        return
    }

    const disableVideo = document.querySelector<HTMLInputElement>('#disable-video')!.checked
    const disableAudio = document.querySelector<HTMLInputElement>('#disable-audio')!.checked

    // config: { disableVideo: true, disableAudio: true, maxRetries: 3 }
    const client = new WHEPClient({ endpoint: url, config: { disableVideo: disableVideo, disableAudio } })
    client.onStreamReady((stream: MediaStream) => {
        localVideo.srcObject = stream
    })
    client.onConnectionStateChange((state: RTCPeerConnectionState) => {
        const connectionState = document.querySelector<HTMLDivElement>('#connection-state')!
        connectionState.innerText = state
        if (state === 'connected') {
            submitButton.disabled = true
            disconnectButton.disabled = false
            disconnectButton.onclick = () => {
                client.close()
                submitButton.disabled = false
                disconnectButton.disabled = true
                localVideo.srcObject = null

            }
        }
    })

}


