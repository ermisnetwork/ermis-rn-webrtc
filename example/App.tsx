/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  Header,
} from 'react-native/Libraries/NewAppScreen';
import { ErmisChat } from "ermis-chat-js-sdk";
import { RTCView } from 'react-native-webrtc';
// @ts-ignore
import { CallEventData, ErmisDirectCallNative, UserCallInfo } from 'ermis-rn-webrtc';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = '5%';
  const PROJECT_ID = 'YOUR_PROJECT_ID';
  const API_KEY = 'YOUR_API_KEY';
  const USER_ID = 'YOUR_USER_ID';
  const API_URL = 'YOUR_API_URL';
  const TOKEN = 'YOUR_TOKEN';
  const SESSION_ID = 'YOUR_SESSION_ID';
  const CID = 'YOUR_CID';


  const [callClient, setCallClient] = useState<any>(null)
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  useEffect(() => {
    const initChatClient = async () => {
      const chatClient = ErmisChat.getInstance(API_KEY, PROJECT_ID, {
        timeout: 6000,
        baseURL: API_URL,
      });

      await chatClient.connectUser(
        {
          api_key: API_KEY,
          id: USER_ID,
          name: USER_ID,
          image: '',
        },
        `Bearer ${TOKEN}`,
      );

      const fetchChannels = async () => {
        const filter = {};
        const sort: any = [];
        const options = {
          message_limit: 25,
        };

        await chatClient
          .queryChannels(filter, sort, options)
      }
      fetchChannels()
      const callClient = new ErmisDirectCallNative(chatClient, SESSION_ID)
      setCallClient(callClient)
    }

    initChatClient();

  }, []);

  useEffect(() => {
    if (!callClient) return;

    callClient.onCallEvent = (data: CallEventData) => {

      console.log('---onCallEvent---', data);

    };

    callClient.onLocalStream = (stream: any) => {

      console.log('---onLocalStream---', stream);

      setLocalStream(stream)
    };

    callClient.onRemoteStream = (stream: any) => {

      console.log('---onRemoteStream---', stream);

      setRemoteStream(stream)
    };

    callClient.onConnectionMessageChange = (msg: string) => {
      console.log('---onConnectionMessageChange---', msg);
    };

    callClient.onCallStatus = (status: string) => {
      console.log('---onCallStatus---', status);

    };

    callClient.onDataChannelMessage = (msg: string) => {
      console.log('---onDataChannelMessage---', msg);

    };

    callClient.onUpgradeCall = (user: UserCallInfo) => {
      console.log('---onUpgradeCall---', user);

    };

    callClient.onError = (msg: string) => {
      console.log('---onError---', msg);

    };
    // Cleanup unmount
    return () => {
      if (callClient) {
        callClient.onCallEvent = undefined;
        callClient.onLocalStream = undefined;
        callClient.onRemoteStream = undefined;
        callClient.onConnectionMessageChange = undefined;
        callClient.onCallStatus = undefined;
        callClient.onDataChannelMessage = undefined;
        callClient.onUpgradeCall = undefined;
        callClient.onError = undefined;
      }
    };
  }, [callClient]);

  const onStartCall = async () => {
    await callClient.createCall('video', CID);
  };

  const onAcceptCall = async () => {
    await callClient.acceptCall();
  };

  const onEndCall = async () => {
    await callClient.endCall();
  }

  const onToggleMic = () => {
    callClient.toggleMic();
  };

  const onToggleCamera = () => {
    callClient.toggleCamera(false);
  };

  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        style={backgroundStyle}>
        <View style={{ paddingRight: safePadding }}>
          <Header />
        </View>

        <Button title='Create call' onPress={onStartCall} />
        <Button title='Accept call' onPress={onAcceptCall} />
        <Button title='End call' onPress={onEndCall} />
        <Button title='Toggle mic' onPress={onToggleMic} />
        <Button title='Toggle camera' onPress={onToggleCamera} />

        {localStream && (
          <RTCView
            streamURL={localStream.toURL()}
            style={{ width: 200, height: 150, backgroundColor: 'black' }}
            objectFit="cover"
          />
        )}
        {remoteStream && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={{ width: 200, height: 150, backgroundColor: 'black' }}
            objectFit="cover"
          />
        )}
      </ScrollView>
    </View>
  );
}

export default App;
