'use client';

import { useCallback, useEffect, useState } from 'react';
import { useScript } from 'usehooks-ts';

declare global {
  interface Window {
    uneeq: any;
  }
}
declare class Uneeq {
  constructor(options: any);
  init(): void;
  startSession(): void;
  endSession(): void;
  stopSpeaking(): void;
  chatPrompt(message: string): void;
}

// TODO: Move script source to config or env variable
const scriptSrc = 'https://cdn.uneeq.io/hosted-experience/deploy/index.js';
let uneeqScriptStatus = 'idle';

export const useUneeq = (configOverride?: Partial<any>) => {
  const [readyToStart, setReadyToStart] = useState(false);
  const [avatarLive, setAvatarLive] = useState(false);
  const [avatarThinking, setAvatarThinking] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>();
  const [uneeqInstance, setUneeqInstance] = useState<Uneeq | null>(null);

  uneeqScriptStatus = useScript(scriptSrc, {
    id: 'uneeq',
    shouldPreventLoad: uneeqScriptStatus === 'ready',
  });

  useEffect(() => {
    if (uneeqScriptStatus === 'ready' && typeof Uneeq !== 'undefined') {
      // Wait for the container to exist with retry
      const checkContainer = () => {
        const container = document.getElementById('uneeqContainedLayout');
        if (!container) {
          console.log('Container not found, retrying in 100ms...');
          setTimeout(checkContainer, 100);
          return;
        }
        
        console.log('Container found, initializing Uneeq...');
        
        // TODO: Move default options to config or env variables
        const defaultOptions = {
          connectionUrl: 'https://api.uneeq.io',
          personaId: 'YOUR_ACTUAL_PERSONA_ID_HERE',
          displayCallToAction: false,
          renderContent: true,
          welcomePrompt: "Hello! I'm Sunny the Tiger, your therapeutic companion. How are you feeling today?",
          mobileViewWidthBreakpoint: 900,
          layoutMode: 'contained',
          cameraAnchorHorizontal: 'center',
          cameraAnchorDistance: 'loose_close_up',
          logLevel: "warn", // Changed from "info" to reduce noise
          enableMicrophone: false, // Disabled to avoid recording errors
          showUserInputInterface: true,
          enableVad: false, // Disabled since microphone is disabled
          enableInterruptBySpeech: false,
          autoStart: false,
          containedAutoLayout: true,
          showClosedCaptions: false,
          captionsPosition: 'bottom',
          languageStrings: {},
          customMetadata: {},
          speechRecognitionHintPhrasesBoost: 0,
          allowResumeSession: false,
          forceTURN: false,
        };

        const uneeqOptions = {
          ...defaultOptions
        };
        console.log('Initializing Uneeq with options:', uneeqOptions);
        const instance = new Uneeq(uneeqOptions);
        setUneeqInstance(instance);
        instance.init(); // Initialize Uneeq
        setReadyToStart(true);
        console.log('Uneeq instance created and initialized.');
      };
      
      checkContainer();
    }
  }, [uneeqScriptStatus, configOverride]);

  useEffect(() => {
    if (!uneeqInstance) return;

    const handleUneeqMessage = (event: any) => {
      const msg = event.detail;
      switch (msg.uneeqMessageType) {
        case 'SpeechEvent':
            // TODO: Handle SpeechEvent (Say to cursor to get get EventValue show button for example) 
            const eventValue = msg.speechEvent.param_value;
            console.log('SpeechEvent value: ', eventValue);
            setLastResponse(eventValue);
            break;

        case 'AvatarStoppedSpeaking':
          console.log('AvatarStoppedSpeaking');
          break;
          
        case 'Error':
          // Handle errors more gracefully
          console.warn('Uneeq error:', msg);
          break;
          
        default:
          break;
      }
    };

    window.addEventListener('UneeqMessage', handleUneeqMessage as EventListener);
    console.log('UneeqMessage listener added.');

    return () => {
      window.removeEventListener('UneeqMessage', handleUneeqMessage as EventListener);
      console.log('UneeqMessage listener removed.');
      // Optional: Clean up Uneeq instance if component unmounts while session active?
      // if (avatarLive) {
      //   uneeqInstance.endSession();
      // }
    };
  }, [uneeqInstance]);

  const startSession = useCallback(() => {
    console.log('Attempting to start session...', { readyToStart, avatarLive });
    if (uneeqInstance && readyToStart && !avatarLive) {
      console.log('Calling uneeqInstance.startSession()');
      uneeqInstance.startSession();
      setAvatarLive(true);
    }
  }, [uneeqInstance, readyToStart, avatarLive]);

  const endSession = useCallback(() => {
    console.log('Attempting to end session...', { avatarLive });
    if (uneeqInstance && avatarLive) {
      console.log('Calling uneeqInstance.endSession()');
      uneeqInstance.endSession();
      setAvatarLive(false);
    }
  }, [uneeqInstance, avatarLive]);

  const stopSpeaking = useCallback(() => {
    if (uneeqInstance) {
      uneeqInstance.stopSpeaking();
    }
  }, [uneeqInstance]);

  const sendMessage = useCallback(
    (message: string) => {
      console.log('Attempting to send message...', { avatarLive });
      if (uneeqInstance && avatarLive) {
        console.log(`Calling uneeqInstance.chatPrompt('${message}')`);
        uneeqInstance.chatPrompt(message);
      }
    },
    [uneeqInstance, avatarLive]
  );

  return {
    scriptStatus: uneeqScriptStatus,
    readyToStart,
    avatarLive,
    avatarThinking,
    lastResponse,
    startSession, // Renamed from startDigitalHuman for clarity
    endSession,
    stopSpeaking,
    sendMessage,
    uneeqInstance,
  };
}; 