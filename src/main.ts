// import './style.css'
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
    <div class="relative isolate px-6 pt-14 lg:px-8">
    <div
      class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-40"
      aria-hidden="true"
    >
      <div
        class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        style="
          clip-path: polygon(
            74.1% 44.1%,
            100% 61.6%,
            97.5% 26.9%,
            85.5% 0.1%,
            80.7% 2%,
            72.5% 32.5%,
            60.2% 62.4%,
            52.4% 68.1%,
            47.5% 58.3%,
            45.2% 34.5%,
            27.5% 76.7%,
            0.1% 64.9%,
            17.9% 100%,
            27.6% 76.8%,
            76.1% 97.7%,
            74.1% 44.1%
          );
        "
      ></div>
    </div>
    <div class="mx-auto max-w-2xl py-12 xl:py-48">
      <div class="text-center">
        <h1 class="text-4xl font-bold tracking-tight text-gray-700 sm:text-6xl">
          Low Latency Test Player
        </h1>
        <div class="hidden sm:mb-8 sm:flex sm:justify-center">
          <div
            class="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 mt-5"
          >
            Enter a url below to preview a low latency stream
          </div>
        </div>
        <div class="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 mt-5">
          Connection State: <span id="connection-state" class="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-700/10"></span>
        </div>
        <div>
          <div>
            <input id="disable-video" type="checkbox"  />
            <label for="disable-video">Disable Video</label><br />
            <input id="disable-audio" type="checkbox" />
            <label for="disable-audio">Disable Audio</label><br />
          </div>
          <div style="margin-top: 0.4rem">
            <input
              id="whep-input-text"
              type="text"
              placeholder="Enter playback url"
              class="block w-full rounded-md border-0 py-1.5 pl-4 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
            <div class="mt-10 flex items-center justify-center gap-x-6">
              <button
                id="submit"
                type="button"
                class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Connect
              </button>
              <button
                id="disconnect"
                type="button"
                disabled
                class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled: hover:bg-indigo-600"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
  
        <div class="flex justify-center items-center">
          <video
            id="local-video"
            autoplay
            playsinline
            controls
            class="mt-5 w-full"
          ></video>
        </div>
      </div>
    </div>
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
