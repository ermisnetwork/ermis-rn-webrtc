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
import { RTCView } from 'react-native-webrtc'; // Thêm vào import
import { CallEventData, ErmisDirectCallNative, UserCallInfo } from 'ermis-rn-webrtc';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = '5%';
  const PROJECT_ID = 'b44937e4-c0d4-4a73-847c-3730a923ce83';
  const API_KEY = 'kUCqqbfEQxkZge7HHDFcIxfoHzqSZUam';
  const USER_ID = '0xf72d58f7353c2461953302a4b214d09ff33eeba1';
  const API_URL = 'https://api-internal.ermis.network';
  const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiMHhmNzJkNThmNzM1M2MyNDYxOTUzMzAyYTRiMjE0ZDA5ZmYzM2VlYmExIiwiY2xpZW50X2lkIjoiNmZiZGVjYjAtMWVjOC00ZTMyLTk5ZDctZmYyNjgzZTMwOGI3IiwiY2hhaW5faWQiOjAsInByb2plY3RfaWQiOiJiNDQ5MzdlNC1jMGQ0LTRhNzMtODQ3Yy0zNzMwYTkyM2NlODMiLCJhcGlrZXkiOiJrVUNxcWJmRVF4a1pnZTdISERGY0l4Zm9IenFTWlVhbSIsImVybWlzIjp0cnVlLCJleHAiOjE4NDU0MDkwMDk5ODYsImFkbWluIjpmYWxzZSwiZ2F0ZSI6ZmFsc2V9.r18drh5J4Rq2-znFx_RwA3hJbqoJBV5iBrpurvYgARg';
  const SESSION_ID = '8cf60120-6e05-46d4-b913-ef69670b8dd7';
  const CID = 'messaging:b44937e4-c0d4-4a73-847c-3730a923ce83:b5e9c9f8c28a602894d279a89bcf6582c218';


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
