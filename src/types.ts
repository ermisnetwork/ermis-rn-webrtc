export enum CallAction {
  CREATE_CALL = 'create-call',
  ACCEPT_CALL = 'accept-call',
  SIGNAL_CALL = 'signal-call',
  CONNECT_CALL = 'connect-call',
  HEALTH_CALL = 'health-call',
  END_CALL = 'end-call',
  REJECT_CALL = 'reject-call',
  MISS_CALL = 'miss-call',
  UPGRADE_CALL = 'upgrade-call',
}

export enum CallStatus {
  RINGING = 'ringing',
  ENDED = 'ended',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export type MediaStreamConstraints = {
  audio?: boolean;
  video?: boolean;
};

export type CallEventType = 'incoming' | 'outgoing';

export type UserCallInfo = {
  id: string;
  name?: string;
  avatar?: string;
};

export type CallEventData = {
  type: CallEventType;
  callType: string;
  cid: string;
  callerInfo: UserCallInfo | undefined;
  receiverInfo: UserCallInfo | undefined;
};

export type SignalData = {
  cid?: string;
  is_video?: boolean;
  action?: string;
  signal?: Object;
};
