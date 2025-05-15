import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import {
  CallAction,
  CallEventData,
  CallStatus,
  MediaStreamConstraints,
  SignalData,
  UserCallInfo,
} from './types';
import RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel';
import { RTCSessionDescriptionInit } from 'react-native-webrtc/lib/typescript/RTCSessionDescription';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:36.50.62.242:3478',
    username: 'hoang',
    credential: 'pass1',
  },
];

export class ErmisDirectCallNative {
  /** Reference to the Ermis Chat client instance */
  _client: any;

  /** Unique identifier for the current call session */
  sessionID: string;

  /** Channel ID for communication between users */
  cid?: string;

  /** Type of call - 'audio' or 'video' */
  callType?: string;

  /** Current user's ID */
  userID?: string | undefined;

  /** Current status of the call */
  callStatus? = '';

  /** WebRTC peer connection instance */
  peer?: RTCPeerConnection | null = null;

  /** Data channel for sending metadata during the call */
  dataChannel?: RTCDataChannel | null = null;

  /** Local media stream (audio/video) */
  localStream?: MediaStream | null = null;

  /** Remote media stream from the other participant */
  remoteStream?: MediaStream | null = null;

  /** Information about the caller user */
  callerInfo?: UserCallInfo;

  /** Information about the receiver user */
  receiverInfo?: UserCallInfo;

  /** Callback triggered when call events occur (incoming/outgoing) */
  onCallEvent?: (data: CallEventData) => void;

  /** Callback when local stream is ready */
  onLocalStream?: (stream: MediaStream) => void;

  /** Callback when remote stream is received */
  onRemoteStream?: (stream: MediaStream) => void;

  /** Callback when connection status message changes */
  onConnectionMessageChange?: (message: string | null) => void;

  /** Callback when call status changes */
  onCallStatus?: (status: string | null) => void;

  /** Callback when data is received through the data channel */
  onDataChannelMessage?: (data: any) => void;

  /** Callback when call is upgraded from audio to video */
  onUpgradeCall?: (upgraderInfo: UserCallInfo) => void;

  /** Callback for error handling */
  onError?: (error: string) => void;

  /** Timeout for handling missed calls */
  private missCallTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Interval for sending health checks via data channel */
  private healthCallInterval: ReturnType<typeof setInterval> | null = null;

  /** Interval for sending health checks via server */
  private healthCallServerInterval: ReturnType<typeof setInterval> | null =
    null;

  /** Timeout for detecting call health issues */
  private healthCallTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Timeout for showing connection warning messages */
  private healthCallWarningTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Handler for WebSocket signal events */
  private signalHandler: any;

  /** Handler for connection state change events */
  private connectionChangedHandler: any;

  /** Handler for message update events */
  private messageUpdatedHandler: any;

  /** Flag indicating if the device is offline */
  private isOffline: boolean = false;

  /**
   * True if this call instance is destroyed (e.g., when another device accepts the call).
   * When true, SIGNAL_CALL events will be ignored.
   */
  private isDestroyed = false;

  constructor(client: any, sessionID: string) {
    this._client = client;
    this.cid = '';
    this.callType = '';
    this.sessionID = sessionID;
    this.userID = client.userID;

    this.listenSocketEvents();
  }

  private getClient() {
    return this._client;
  }

  private async _sendSignal(payload: SignalData) {
    try {
      return await this.getClient().post(this.getClient().baseURL + '/signal', {
        ...payload,
        cid: this.cid || payload.cid,
        is_video: this.callType === 'video' || payload.is_video,
        ios: false,
        session_id: this.sessionID,
      });
    } catch (error: any) {
      if (typeof this.onError === 'function') {
        const action = payload.action;
        if (error.code === 'ERR_NETWORK') {
          if (action === CallAction.CREATE_CALL) {
            this.onError(
              'Unable to make the call. Please check your network connection'
            );
          }
        } else {
          if (error.response.data.ermis_code === 20) {
            this.onError('Recipient was busy');
          } else {
            this.onError('Call Failed');
          }
        }
      }
    }
  }

  private async startLocalStream(
    constraints: MediaStreamConstraints = { audio: true, video: true }
  ) {
    const stream = await mediaDevices.getUserMedia(constraints);
    if (this.onLocalStream) {
      this.onLocalStream(stream);
    }
    this.localStream = stream;
    return stream;
  }

  private setConnectionMessage(message: string | null) {
    if (typeof this.onConnectionMessageChange === 'function') {
      this.onConnectionMessageChange(message);
    }
  }

  private setCallStatus(status: CallStatus) {
    this.callStatus = status;
    if (typeof this.onCallStatus === 'function') {
      this.onCallStatus(status);
    }
  }

  private setUserInfo(
    cid: string | undefined,
    eventUserId: string | undefined
  ) {
    if (!cid || !eventUserId) return;

    // Get caller and receiver userId from activeChannels
    const channel = cid ? this.getClient().activeChannels[cid] : undefined;
    const members = channel?.state?.members || {};
    const memberIds = Object.keys(members);

    // callerId is eventUserId, receiverId is the other user in the channel
    const callerId = eventUserId || '';
    const receiverId = memberIds.find(id => id !== callerId) || '';

    // Get user info from client.state.users
    const callerUser = this.getClient().state.users[callerId];
    const receiverUser = this.getClient().state.users[receiverId];

    this.callerInfo = {
      id: callerId,
      name: callerUser?.name,
      avatar: callerUser?.avatar || '',
    };
    this.receiverInfo = {
      id: receiverId,
      name: receiverUser?.name,
      avatar: receiverUser?.avatar || '',
    };
  }

  private createPeer(initiator: boolean) {
    if (this.peer) {
      this.peer.close();
      this.peer = null;
      this.dataChannel = null;
    }

    this.peer = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peer) {
          this.peer.addTrack(track, this.localStream);
        }
      });
    }

    if (initiator && this.peer) {
      this.dataChannel = this.peer.createDataChannel('rtc_data_channel');
      this.setupDataChannel(this.dataChannel);
    } else {
      (this.peer as any).ondatachannel = (event: any) => {
        this.dataChannel = event.channel;
        if (this.dataChannel) {
          this.setupDataChannel(this.dataChannel);
        }
      };
    }

    (this.peer as any).onicecandidate = async (event: any) => {
      if (event.candidate) {
        const candidate = event.candidate;
        const sdp = `${candidate.sdpMid}$${candidate.sdpMLineIndex}$${candidate.candidate}`;
        const signal = { type: 'ice', sdp };

        await this.signalCall(signal);
      }
    };

    (this.peer as any).ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(event.streams[0]);
        }
      }
    };

    (this.peer as any).onconnectionstatechange = () => {
      if (this.peer?.connectionState === 'connected') {
        this.handlePeerConnected();
      } else if (
        this.peer?.connectionState === 'disconnected' ||
        this.peer?.connectionState === 'failed' ||
        this.peer?.connectionState === 'closed'
      ) {
        this.setCallStatus(CallStatus.ERROR);
        this.cleanupCall();
      }
    };

    if (initiator) {
      this.createOffer();
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    (channel as any).onopen = () => {
      const jsonData = {
        type: 'transciver_state',
        body: {
          audio_enable: true,
          video_enable: this.callType === 'video',
        },
      };
      channel.send(JSON.stringify(jsonData));
    };

    (channel as any).onmessage = (event: any) => {
      const message = JSON.parse(event.data);

      if (typeof this.onDataChannelMessage === 'function') {
        this.onDataChannelMessage(message);
      }

      if (message.type === 'health_call') {
        // Reset timeout whenever health_call is received
        if (this.healthCallTimeout) clearTimeout(this.healthCallTimeout);
        this.healthCallTimeout = setTimeout(async () => {
          // If no health_call is received after 30s, end the call
          await this.endCall();
        }, 30000);

        // Reset remote connection lost warning
        if (this.healthCallWarningTimeout)
          clearTimeout(this.healthCallWarningTimeout);
        this.setConnectionMessage(null);

        // If no health_call is received after 3s, show remote peer connection unstable warning
        this.healthCallWarningTimeout = setTimeout(() => {
          if (!this.isOffline) {
            this.setConnectionMessage(
              `${
                this.userID === this.callerInfo?.id
                  ? this.receiverInfo?.name
                  : this.callerInfo?.name
              } network connection is unstable`
            );
          }
        }, 3000);
      }
    };

    (channel as any).onerror = (error: any) => {
      console.error('Data channel error:', error);
    };
  }

  private async handlePeerConnected() {
    await this.connectCall();
    this.setCallStatus(CallStatus.CONNECTED);

    // Clear missCall timeout when connected
    if (this.missCallTimeout) {
      clearTimeout(this.missCallTimeout);
      this.missCallTimeout = null;
    }

    // Set up health_call interval via WebRTC every 1s
    if (this.healthCallInterval) clearInterval(this.healthCallInterval);
    this.healthCallInterval = setInterval(() => {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({ type: 'health_call' }));
      }
    }, 1000);

    // Set up healthCall interval via server every 10s
    if (this.healthCallServerInterval)
      clearInterval(this.healthCallServerInterval);
    this.healthCallServerInterval = setInterval(() => {
      this.healthCall();
    }, 10000);
  }

  private async createOffer() {
    if (!this.peer) return;

    try {
      const offer = await this.peer.createOffer({});
      await this.peer.setLocalDescription(offer);
      await this.signalCall(this.peer.localDescription?.toJSON());
    } catch (error) {
      console.error('Error creating offer:', error);
      if (this.onError) this.onError('Failed to create offer');
    }
  }

  private async makeOffer() {
    this.createPeer(true); // initiator = true
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peer) {
      this.createPeer(false); // initiator = false
    }

    try {
      await this.peer?.setRemoteDescription(new RTCSessionDescription(offer));
      // Create answer
      const answer = await this.peer?.createAnswer();
      await this.peer?.setLocalDescription(answer);

      // Send answer back
      if (this.peer?.localDescription) {
        await this.signalCall(this.peer.localDescription.toJSON());
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      if (this.onError) this.onError('Failed to handle offer');
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      if (this.peer) {
        await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      if (this.onError) this.onError('Failed to handle answer');
    }
  }

  private async handleIceCandidate(candidateData: any) {
    try {
      if (this.peer) {
        const candidate = new RTCIceCandidate({
          candidate: candidateData.candidate.candidate,
          sdpMLineIndex: candidateData.candidate.sdpMLineIndex,
          sdpMid: candidateData.candidate.sdpMid,
        });
        await this.peer.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private listenSocketEvents() {
    this.signalHandler = async (event: any) => {
      const {
        action,
        user_id: eventUserId,
        session_id: eventSessionId,
        cid,
        is_video,
        signal,
      } = event;

      switch (action) {
        case CallAction.CREATE_CALL:
          if (
            eventUserId === this.userID &&
            eventSessionId !== this.sessionID
          ) {
            // If the event is triggered by the current user but the session ID is different,
            // it means another device (or tab) of the same user has started a call.
            // In this case, mark this call instance as destroyed and ignore further events.
            this.isDestroyed = true;
            return;
          }

          this.isDestroyed = false;
          await this.startLocalStream({ audio: true, video: true });
          this.setUserInfo(cid, eventUserId);
          this.setCallStatus(CallStatus.RINGING);
          this.callType = is_video ? 'video' : 'audio';
          this.cid = cid || '';
          if (typeof this.onCallEvent === 'function') {
            this.onCallEvent({
              type: eventUserId !== this.userID ? 'incoming' : 'outgoing',
              callType: is_video ? 'video' : 'audio',
              cid: cid || '',
              callerInfo: this.callerInfo,
              receiverInfo: this.receiverInfo,
            });
          }
          // Set missCall timeout if no connection after 60s
          if (this.missCallTimeout) clearTimeout(this.missCallTimeout);
          this.missCallTimeout = setTimeout(async () => {
            await this.missCall();
          }, 60000);
          break;

        case CallAction.ACCEPT_CALL:
          if (eventUserId !== this.userID && !this.isDestroyed) {
            // Caller: when receiver accepts, create offer and send to receiver
            await this.makeOffer();
            return;
          }
          if (eventSessionId !== this.sessionID) {
            // If the event is triggered by the current user but the session ID is different,
            // This means another device (or tab) of the same user has answered the call.
            // In this case, end and destroy the current call instance, and mark it as destroyed
            // so it will ignore further call events.
            this.setCallStatus(CallStatus.ENDED);
            this.destroy();
            this.isDestroyed = true;
          }
          break;

        case CallAction.SIGNAL_CALL:
          if (eventUserId === this.userID || this.isDestroyed) return;

          if (
            typeof signal === 'object' &&
            signal !== null &&
            'type' in signal
          ) {
            const signalObj = signal as { type: string; [key: string]: any };
            if (signalObj.type === 'offer') {
              // Receiver: receive offer, create peer, send answer and ice to caller
              await this.handleOffer(signalObj as RTCSessionDescriptionInit);
            } else if (signalObj.type === 'answer') {
              // Caller: receive answer, establish connection
              await this.handleAnswer(signalObj as RTCSessionDescriptionInit);
            } else if (signalObj.type === 'ice' && 'sdp' in signalObj) {
              // Both sides: receive ICE candidate
              const sdp = signalObj.sdp;
              const splitSdp = sdp.split('$');

              await this.handleIceCandidate({
                candidate: {
                  candidate: splitSdp[2],
                  sdpMLineIndex: Number(splitSdp[1]),
                  sdpMid: splitSdp[0],
                },
                type: 'candidate',
              });
            }
          }

          break;

        case CallAction.END_CALL:
        case CallAction.REJECT_CALL:
        case CallAction.MISS_CALL:
          this.setCallStatus(CallStatus.ENDED);
          this.destroy();
          break;
      }
    };

    this.connectionChangedHandler = (event: any) => {
      const online = event.online;
      this.isOffline = !online;
      if (!online) {
        this.setConnectionMessage('Your network connection is unstable');

        // Clear health_call intervals when offline
        if (this.healthCallInterval) {
          clearInterval(this.healthCallInterval);
          this.healthCallInterval = null;
        }
        if (this.healthCallServerInterval) {
          clearInterval(this.healthCallServerInterval);
          this.healthCallServerInterval = null;
        }
      } else {
        this.setConnectionMessage(null);

        // When back online, if CONNECTED, set up health_call intervals again
        if (this.callStatus === CallStatus.CONNECTED && this.peer) {
          if (!this.healthCallInterval) {
            this.healthCallInterval = setInterval(() => {
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify({ type: 'health_call' }));
              }
            }, 1000);
          }
          if (!this.healthCallServerInterval) {
            this.healthCallServerInterval = setInterval(() => {
              this.healthCall();
            }, 10000);
          }
        }
      }
    };

    this.messageUpdatedHandler = (event: any) => {
      if (this.callStatus === CallStatus.CONNECTED && event.cid === this.cid) {
        const upgradeUserId = event.user?.id;

        let upgraderInfo: UserCallInfo | undefined;

        if (upgradeUserId === this.callerInfo?.id) {
          upgraderInfo = this.callerInfo;
        } else if (upgradeUserId === this.receiverInfo?.id) {
          upgraderInfo = this.receiverInfo;
        }

        if (upgraderInfo && typeof this.onUpgradeCall === 'function') {
          this.onUpgradeCall(upgraderInfo);
        }

        if (upgradeUserId === this.userID) {
          const jsonData = {
            type: 'transciver_state',
            body: {
              audio_enable: this.localStream
                ?.getAudioTracks()
                .some(track => track.enabled),
              video_enable: true,
            },
          };

          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(jsonData));
          }
        }
      }
    };

    this._client.on('signal', this.signalHandler);
    this._client.on('connection.changed', this.connectionChangedHandler);
    this._client.on('message.updated', this.messageUpdatedHandler);
  }

  private cleanupCall() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.missCallTimeout) {
      clearTimeout(this.missCallTimeout);
      this.missCallTimeout = null;
    }

    if (this.healthCallInterval) {
      clearInterval(this.healthCallInterval);
      this.healthCallInterval = null;
    }

    if (this.healthCallServerInterval) {
      clearInterval(this.healthCallServerInterval);
      this.healthCallServerInterval = null;
    }

    if (this.healthCallTimeout) {
      clearTimeout(this.healthCallTimeout);
      this.healthCallTimeout = null;
    }

    if (this.healthCallWarningTimeout) {
      clearTimeout(this.healthCallWarningTimeout);
      this.healthCallWarningTimeout = null;
    }

    this.setConnectionMessage(null);
  }

  private destroy() {
    // if (this.signalHandler) this._client.off('signal', this.signalHandler);
    // if (this.connectionChangedHandler) this._client.off('connection.changed', this.connectionChangedHandler);
    // if (this.messageUpdatedHandler) this._client.off('message.updated', this.messageUpdatedHandler);
    this.cleanupCall();
  }

  public async createCall(callType: string, cid: string) {
    return await this._sendSignal({
      action: CallAction.CREATE_CALL,
      cid,
      is_video: callType === 'video',
    });
  }

  public async acceptCall() {
    return await this._sendSignal({ action: CallAction.ACCEPT_CALL });
  }

  private async signalCall(signal: any) {
    return await this._sendSignal({ action: CallAction.SIGNAL_CALL, signal });
  }

  public async endCall() {
    return await this._sendSignal({ action: CallAction.END_CALL });
  }

  public async rejectCall() {
    return await this._sendSignal({ action: CallAction.REJECT_CALL });
  }

  private async missCall() {
    return await this._sendSignal({ action: CallAction.MISS_CALL });
  }

  private async connectCall() {
    return await this._sendSignal({ action: CallAction.CONNECT_CALL });
  }

  private async healthCall() {
    return await this._sendSignal({ action: CallAction.HEALTH_CALL });
  }

  public async upgradeCall() {
    if (this.callType === 'audio') {
      return await this._sendSignal({ action: CallAction.UPGRADE_CALL });
    }
    return null;
  }

  public toggleMic(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });

      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(
          JSON.stringify({
            type: 'transciver_state',
            body: {
              audio_enable: enabled,
              video_enable: this.localStream
                .getVideoTracks()
                .some(track => track.enabled),
            },
          })
        );
      }
    }
  }

  public toggleCamera(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });

      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(
          JSON.stringify({
            type: 'transciver_state',
            body: {
              audio_enable: this.localStream
                .getAudioTracks()
                .some(track => track.enabled),
              video_enable: enabled,
            },
          })
        );
      }
    }
  }
}
