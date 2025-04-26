# React Native Call SDK

## Overview

The React Native Call SDK provides a robust solution for integrating real-time voice and video calling capabilities into your React Native applications. This SDK simplifies the process of managing calls, handling signaling, and managing media streams.

## Features

- Create and manage voice and video calls
- Handle incoming and outgoing call events
- Manage media streams with ease
- Support for data channels for real-time messaging
- Health checks to ensure stable connections

## Installation

To install the React Native Call SDK, run the following command:

```bash
npm install react-native-call-sdk
```

or

```bash
yarn add react-native-call-sdk
```

## Usage

### Importing the SDK

To use the SDK in your application, import it as follows:

```typescript
import { ErmisDirectCallNative } from 'react-native-call-sdk';
```

### Creating a Call

You can create a call by using the `createCall` method:

```typescript
const callSDK = new ErmisDirectCallNative(client, sessionID);
callSDK.createCall('video', 'your-cid');
```

### Accepting a Call

To accept an incoming call, use the `acceptCall` method:

```typescript
callSDK.acceptCall();
```

### Ending a Call

To end an ongoing call, call the `endCall` method:

```typescript
callSDK.endCall();
```

## Example Application

An example application demonstrating the usage of the React Native Call SDK can be found in the `example` directory. To run the example application, navigate to the `example` folder and follow the instructions in the `README.md` file located there.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or support, please reach out to the maintainers of this SDK.