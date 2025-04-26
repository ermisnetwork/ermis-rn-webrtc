# [ErmisChat](https://ermis.network) Call SDK for React native

![Platform](https://img.shields.io/badge/platform-REACTNATIVE-orange.svg)
![Languages](https://img.shields.io/badge/language-TYPESCRIPT-orange.svg)
[![npm](https://img.shields.io/npm/v/ermis-rn-webrtc.svg?style=popout&colorB=red)](https://www.npmjs.com/package/ermis-rn-webrtc)

## Overview

The ermis-rn-webrtc SDK provides a robust solution for integrating real-time
voice and video calling capabilities into your React Native applications. Built
on WebRTC technology, this SDK simplifies the process of managing calls,
handling signaling, and managing media streams.

**Note:** This SDK is designed exclusively for React Native applications and
cannot be used with regular web applications.

## Features

- Create and manage voice and video calls
- Handle incoming and outgoing call events
- Manage audio and video streams with ease
- Support for data channels for real-time messaging
- Network health monitoring and connection stability features
- Call upgrade capability (audio to video)

## Installation

To install the ermis-rn-webrtc SDK, run the following command:

```bash
npm install ermis-rn-webrtc react-native-webrtc
```

or

```bash
yarn add ermis-rn-webrtc react-native-webrtc
```

## Prerequisites

- Setup [ermis-chat-js-sdk](https://www.npmjs.com/package/ermis-chat-js-sdk)
- Before using the call SDK, you must initialize and set up the chat SDK, as the
  call functionality relies on the chat client for signaling:

```javascript
import { ErmisChat } from 'ermis-chat-js-sdk';

// Initialize chat client
const chatClient = ErmisChat.getInstance(API_KEY, PROJECT_ID, {
  timeout: 6000,
  baseURL: API_URL,
});

// Connect user to chat
await chatClient.connectUser(
  {
    api_key: API_KEY,
    id: USER_ID,
    name: USER_ID,
    image: '',
  },
  `Bearer ${YOUR_TOKEN}`
);
```

## Usage

### Importing the SDK

Importing the SDK to use the SDK in your application, import it as follows:

```javascript
import { ErmisDirectCallNative } from 'ermis-rn-webrtc';

// Initialize call client
const callClient = new ErmisDirectCallNative(chatClient, sessionId);
```

The `sessionId` parameter required when initializing the call client is a unique
identifier that:

- Should be generated as a random UUID when the user first logs in
- Must be stored and reused for subsequent sessions for the same user
- Should be unique per device and user
- Is used to maintain call state across reconnections

Example of generating a sessionId:

```javascript
import { v4 as uuidv4 } from 'uuid';

// Generate on first login and store it
const SESSION_ID = uuidv4(); // e.g. '8cf60120-6e05-46d4-b913-ef69670b8dd7'
```

### Creating a Call

You can create a call by using the `createCall` method:

```javascript
await callClient.createCall(callType, cid);
```

Initiates a new call.

- `callType`: Either 'audio' or 'video'
- `cid`: Channel ID for the call

### Accepting a Call

To accept an incoming call, use the `acceptCall` method:

```javascript
await callClient.acceptCall();
```

### Ending a Call

To end an ongoing call, call the `endCall` method:

```javascript
await callClient.endCall();
```

### Reject a Call

To reject an ongoing call, call the `rejectCall` method:

```javascript
await callClient.rejectCall();
```

### Upgrade a Call

To upgrade an audio call to a video call, call the `upgradeCall` method:

```javascript
await callClient.upgradeCall();
```

### Toggle Mic

Enables or disables the microphone, call the `toggleMic` method:

```javascript
callClient.toggleMic(true); // Enable microphone
callClient.toggleMic(false); // Disable microphone
```

### Toggle Camera

Enables or disables the camera, call the `toggleCamera` method:

```javascript
callClient.toggleCamera(true); // Enable microphone
callClient.toggleCamera(false); // Disable microphone
```

### Callback Functions

#### `onCallEvent`

Triggered when a call event occurs (incoming or outgoing).

```javascript
callClient.onCallEvent = data => {
  console.log(`Call type: ${data.type}`); // 'incoming' or 'outgoing'
  console.log(`Call mode: ${data.callType}`); // 'audio' or 'video'
};
```

#### `onLocalStream`

Triggered when the local video stream is ready.

```javascript
callClient.onLocalStream = stream => {
  // Handle local stream, e.g., display in <RTCView>
};
```

#### `onRemoteStream`

Triggered when the remote video stream is received.

```javascript
callClient.onRemoteStream = stream => {
  // Handle local stream, e.g., display in <RTCView>
};
```

#### `onConnectionMessageChange`

Triggered when the connection status message changes.

```javascript
callClient.onConnectionMessageChange = message => {
  // Handle connection messages (e.g., "Your network connection is unstable")
};
```

#### `onCallStatus`

Triggered when the call status changes.

```javascript
callClient.onCallStatus = status => {
  // Handle call status updates (RINGING, CONNECTED, ENDED)
};
```

#### `onDataChannelMessage`

Triggered when a message is received through the WebRTC data channel.

```javascript
callClient.onDataChannelMessage = data => {
  // Handle data channel messages
};
```

#### `onUpgradeCall`

Triggered when a call is upgraded from audio to video.

```javascript
callClient.onUpgradeCall = upgraderInfo => {
  // Handle call upgrade
};
```

#### `onError`

Triggered when an error occurs during the call.

```javascript
callClient.onError = error => {
  // Handle error
};
```

## Example Application

An example application demonstrating the usage of the React Native Call SDK can
be found in the `example` directory. To run the example application, navigate to
the `example` folder and follow the instructions in the `README.md` file located
there.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an
issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

## Contact

For any inquiries or support, please reach out to the maintainers of this SDK.
