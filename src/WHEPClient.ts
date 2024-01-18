const DEFAULT_ICESERVERS = [
  {
    urls: 'stun:stun.cloudflare.com:3478',
  },
]

export type WHEPClientConfig = {
  iceServers?: RTCIceServer[]
  bundlePolicy?: RTCBundlePolicy
  disableAudio?: boolean
  disableVideo?: boolean
  maxRetries?: number
}

export default class WHEPClient {
  private readonly endpoint: string

  // @ts-ignore
  private peerConnection: RTCPeerConnection

  readonly config: {
    iceServers?: RTCIceServer[]
    bundlePolicy?: RTCBundlePolicy
    disableAudio?: boolean
    disableVideo?: boolean
    maxRetries?: number
  }

  private readonly stream: MediaStream

  private streamReadyCallback: (stream: MediaStream) => void

  private connectionStateChangeCallback: (state: RTCPeerConnectionState) => void

  constructor({
                endpoint,
                config = {
                  disableVideo: false,
                  disableAudio: false,
                  maxRetries: 3,
                },
              }: {
    endpoint: string
    config?: WHEPClientConfig
  }) {
    if (!endpoint) throw new Error('endpoint is required')
    if (config?.disableAudio && config?.disableVideo) {
      throw new Error('cannot disable both audio and video')
    }

    this.endpoint = endpoint
    this.stream = new MediaStream()
    this.config = config
    this.streamReadyCallback = () => {}
    this.connectionStateChangeCallback = () => {}
    this.init()
  }

  init() {
    const config = {
      iceServers: this.config?.iceServers || DEFAULT_ICESERVERS,
      bundlePolicy: this.config?.bundlePolicy || 'max-bundle',
    }
    this.peerConnection = new RTCPeerConnection(config)

    if (!this.config.disableVideo) {
      this.peerConnection.addTransceiver('video', {
        direction: 'recvonly',
      })
    }
    if (!this.config.disableAudio) {
      this.peerConnection.addTransceiver('audio', {
        direction: 'recvonly',
      })
    }

    this.peerConnection.addEventListener('track', (event) => {
      this.handleTrackEvent(event)
    })

    this.peerConnection.addEventListener('connectionstatechange', () => {
      this.handleConnectionStateChangeEvent()
    })

    this.peerConnection.addEventListener('negotiationneeded', async () => {
      try {
        await this.negotiateConnectionWithClientOffer(this.config?.maxRetries)
      } catch (e) {
        this.connectionStateChangeCallback?.('failed')
      }
    })
  }

  private async negotiateConnectionWithClientOffer(
    maxRetries = 3
  ) {
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    const intialisedOffer: RTCSessionDescription = await this.waitToCompleteICEGathering()
    if (!intialisedOffer) {
      throw Error('failed to gather ICE candidates for offer')
    }

    let attempt = 0
    let retryInterval = 2000

    do {
      /* eslint-disable no-await-in-loop */
      const response = await this.sendOffer(intialisedOffer.sdp)
      switch (response.status) {
        case 201: {
          const answerSDP = await response.text()
          await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: answerSDP })
          )
          return response.headers.get('Location')
        }

        case 403: {
          throw Error('Unauthorized')
        }

        case 405: {
          console.warn('URL must be updated')
          break
        }
        default: {
          const errorMessage = await response.text()
          console.error(errorMessage)
        }
      }

      await this.delay(retryInterval)
      retryInterval *= 2 // Exponential backoff
      attempt += 1
    } while (attempt < maxRetries && this.peerConnection.connectionState !== 'closed')

    if (attempt >= maxRetries) {
      throw Error('Max retry attempts reached')
    }
    return null
  }

  private async waitToCompleteICEGathering(
  ): Promise<RTCSessionDescription> {
    return new Promise((resolve) => {
      const timeoutRef = setTimeout(() => {
        /* eslint-disable no-param-reassign */
        this.peerConnection.onicegatheringstatechange = null
        resolve(this.peerConnection.localDescription as RTCSessionDescription)
      }, 1000)
      this.peerConnection.onicegatheringstatechange = () => {
        if (this.peerConnection.iceGatheringState === 'complete') {
          clearTimeout(timeoutRef)
          resolve(this.peerConnection.localDescription as RTCSessionDescription)
        }
      }
    })
  }


  close() {
    this.peerConnection.close()
  }

  private handleConnectionStateChangeEvent() {
    const { connectionState } = this.peerConnection
    this.connectionStateChangeCallback?.(connectionState)
    this.streamReadyCallback?.(this.stream)
  }

  private handleTrackEvent(event: RTCTrackEvent) {
    const { track } = event
    const currentTracks = this.stream.getTracks()

    const shouldAddVideoTrack =
        !this.config?.disableVideo ||
        currentTracks.some((t) => t.kind === 'video')
    const shouldAddAudioTrack =
        !this.config?.disableAudio ||
        currentTracks.some((t) => t.kind === 'audio')

    switch (track.kind) {
      case 'video':
        if (!shouldAddVideoTrack) {
          break
        }
        this.stream.addTrack(track)
        break
      case 'audio':
        if (!shouldAddAudioTrack) {
          break
        }
        this.stream.addTrack(track)
        break
      default:
        console.log(`got unknown track ${track}`)
    }
  }

  public onStreamReady(callback: (stream: MediaStream) => void) {
    this.streamReadyCallback = callback
  }

  public onConnectionStateChange(
      callback: (state: RTCPeerConnectionState) => void
  ) {
    this.connectionStateChangeCallback = callback
  }

  private delay(ms: number) {
    // eslint-disable-next-line no-promise-executor-return
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async sendOffer( data: any) {
    return fetch(this.endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'content-type': 'application/sdp',
      },
      body: data,
    })
  }



}
