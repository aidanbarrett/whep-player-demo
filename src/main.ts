import './style.css'
import WHEPClient from './WHEPClient.ts'

const query = new URLSearchParams(window.location.search)
const url = query.get('url')
const disableVideo = query.get('disableVideo') === 'true'
const disableAudio = query.get('disableAudio') === 'true'
const disableControls = query.get('disableControls') === 'true'

if (disableControls) {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
        <video id="local-video" autoplay playsinline controls style="width: 100%; height: 100%"></video>
    `
    const localVideo = document.querySelector<HTMLVideoElement>('#local-video')!
    const client = new WHEPClient({endpoint: url!, config: {disableVideo, disableAudio}})
    client.onStreamReady((stream: MediaStream) => {
        localVideo.srcObject = stream
    })
} else {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
        <div>
            <h1>WHEP Test Page</h1>
            <div>Connection State: <span id="connection-state"></span></div>
            <div class="card">
                <div>
                <input id="disable-video" type="checkbox" />
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
    if (url) {
        input.value = url
    }

    const disableVideoCheckbox = document.querySelector<HTMLInputElement>('#disable-video')!
    if (disableVideo) {
        disableVideoCheckbox.checked = true
    }

    const disableAudioCheckbox = document.querySelector<HTMLInputElement>('#disable-audio')!
    if (disableAudio) {
        disableAudioCheckbox.checked = true
    }

    const submitButton = document.querySelector<HTMLButtonElement>('#submit')!
    const disconnectButton = document.querySelector<HTMLButtonElement>('#disconnect')!
    const localVideo = document.querySelector<HTMLVideoElement>('#local-video')!
    submitButton.onclick = () => {
        const whepUrl = input.value
        if (!whepUrl) {
            return
        }

        // config: { disableVideo: true, disableAudio: true, maxRetries: 3 }
        const client = new WHEPClient({endpoint: whepUrl, config: {disableVideo: disableVideoCheckbox.checked, disableAudio: disableAudioCheckbox.checked}})
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
}
