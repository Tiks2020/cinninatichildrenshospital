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
  const [showAssessmentScale, setShowAssessmentScale] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);

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
          personaId: 'e672106f-b8d2-41eb-8988-588a3770aa78',
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
      console.log('Uneeq message type:', msg.uneeqMessageType, 'Full message:', msg);
      switch (msg.uneeqMessageType) {
        case 'SpeechEvent':
            // TODO: Handle SpeechEvent (Say to cursor to get get EventValue show button for example) 
            const eventValue = msg.speechEvent.param_value;
            console.log('SpeechEvent received - Full message:', msg);
            console.log('SpeechEvent value: ', eventValue);
            setLastResponse(eventValue);
            
            // Check if SpeechEvent contains custom_event XML to show assessment scale
            if (eventValue && typeof eventValue === 'string' && eventValue.includes('<uneeq:custom_event name="question_1" />')) {
              console.log('✅ Found custom_event XML in SpeechEvent - showing assessment scale');
              setShowAssessmentScale(true);
            }
            break;
            
        case 'PromptResult':
            console.log('PromptResult received - Full message:', msg);
            // Log the actual text content to see if XML is there
            if (msg.promptResult && msg.promptResult.response && msg.promptResult.response.text) {
              console.log('PromptResult text:', msg.promptResult.response.text);
              // Check for XML in the response text
              if (msg.promptResult.response.text.includes('<uneeq:displayAssesmentScale />')) {
                console.log('✅ Found displayAssesmentScale XML in PromptResult response');
                setShowAssessmentScale(true);
              }
              // Check for custom_event XML in the response text
              if (msg.promptResult.response.text.includes('<uneeq:custom_event name="question_')) {
                // Extract question number from XML like <uneeq:custom_event name="question_9" />
                const match = msg.promptResult.response.text.match(/<uneeq:custom_event name="question_(\d+)" \/>/);
                if (match) {
                  const questionNum = parseInt(match[1]);
                  console.log(`✅ Found custom_event XML for question ${questionNum} in PromptResult response - showing assessment scale`);
                  setCurrentQuestionNumber(questionNum);
                  setShowAssessmentScale(true);
                }
              }
            }
            if (msg.promptResult && msg.promptResult.text) {
              console.log('PromptResult direct text:', msg.promptResult.text);
              // Check for XML in the direct text
              if (msg.promptResult.text.includes('<uneeq:displayAssesmentScale />')) {
                console.log('✅ Found displayAssesmentScale XML in PromptResult direct text');
                setShowAssessmentScale(true);
              }
              // Check for custom_event XML in the direct text
              if (msg.promptResult.text.includes('<uneeq:custom_event name="question_')) {
                // Extract question number from XML like <uneeq:custom_event name="question_9" />
                const match = msg.promptResult.text.match(/<uneeq:custom_event name="question_(\d+)" \/>/);
                if (match) {
                  const questionNum = parseInt(match[1]);
                  console.log(`✅ Found custom_event XML for question ${questionNum} in PromptResult direct text - showing assessment scale`);
                  setCurrentQuestionNumber(questionNum);
                  setShowAssessmentScale(true);
                }
              }
            }
            break;

        case 'AvatarStoppedSpeaking':
          console.log('AvatarStoppedSpeaking');
          break;
          
        case 'Error':
          // Handle errors more gracefully
          console.warn('Uneeq error:', msg);
          break;
          
        default:
          // Check all possible locations for the XML in any message type
          const possibleText =
            (msg && msg.promptResult && msg.promptResult.response && msg.promptResult.response.text) ||
            (msg && msg.promptResult && msg.promptResult.text) ||
            (msg && msg.speechEvent && msg.speechEvent.param_value) ||
            (msg && msg.param_value) ||
            (msg && msg.text);
            
          if (typeof possibleText === 'string' && possibleText.includes('<uneeq:displayAssesmentScale />')) {
            console.log('✅ Found displayAssesmentScale XML in message:', msg.uneeqMessageType);
            setShowAssessmentScale(true);
          }
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
      
      // Test if we can send a message to trigger the digital human
      setTimeout(() => {
        console.log('Testing: Sending welcome message to trigger digital human...');
        if (uneeqInstance) {
          uneeqInstance.chatPrompt("Hello, can you start the session?");
          
          // Debug: Check what properties are available on the uneeqInstance
          console.log('Uneeq instance properties:', Object.keys(uneeqInstance));
          console.log('Uneeq instance:', uneeqInstance);
        }
      }, 3000);
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
    showAssessmentScale,
    setShowAssessmentScale,
    currentQuestionNumber,
    startSession, // Renamed from startDigitalHuman for clarity
    endSession,
    stopSpeaking,
    sendMessage,
    uneeqInstance,
  };
}; 