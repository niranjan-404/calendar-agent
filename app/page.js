'use client';

import { useState, useRef, useEffect } from 'react';
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents/realtime';
import { z } from 'zod';

export default function VoiceCalendarAgent() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Click microphone to start voice conversation');
  const [error, setError] = useState(null);
  
  const sessionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { 
      role, 
      text, 
      timestamp: new Date().toISOString() 
    }]);
  };

  // Monitor microphone input level
  const monitorMicrophoneLevel = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkLevel = () => {
        if (!isConnected) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        setIsMicActive(average > 10); // Threshold for mic activity
        
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };
      
      checkLevel();
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Could not access microphone. Please grant permission.');
    }
  };

  // Cleanup microphone monitoring
  const stopMicrophoneMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    return () => {
      stopMicrophoneMonitoring();
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  // Tool Definitions
  const createCalendarEvent = tool({
    name: 'create_calendar_event',
    description: 'Create a new event in the user\'s Google Calendar',
    parameters: z.object({
      summary: z.string().describe('The title/name of the event'),
      attendees: z.array(z.string()).optional().describe('List of attendee email addresses'),
      startTime: z.string().describe('Start time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)'),
      endTime: z.string().describe('End time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)'),
      timezone: z.string().default('Asia/Kolkata').describe('Timezone (default: Asia/Kolkata)')
    }),
    execute: async (args) => {
      console.log('Tool execute: create_calendar_event', args);
      addMessage('system', `⚙️ Calling: create_calendar_event...`);
      
      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            params: args
          })
        });
        
        const result = await response.json();
        if (result.success) addMessage('system', `✅ Created: ${result.summary}`);
        return result;
      } catch (err) {
        addMessage('system', `❌ Error creating event: ${err.message}`);
        return { success: false, error: err.message };
      }
    }
  });

  const listCalendarEvents = tool({
    name: 'list_calendar_events',
    description: 'List upcoming events from the user\'s calendar',
    parameters: z.object({
      maxResults: z.number().default(10).describe('Maximum number of events to return')
    }),
    execute: async (args) => {
      console.log('Tool execute: list_calendar_events', args);
      addMessage('system', `⚙️ Calling: list_calendar_events...`);
      
      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'list',
            params: args
          })
        });
        
        const result = await response.json();
        if (result.success) {
          const eventsList = result.events.map(e => 
            `• ${e.summary} - ${new Date(e.start).toLocaleString()}`
          ).join('\n');
          addMessage('system', `📅 Upcoming Events:\n${eventsList || 'No events found'}`);
        }
        return result;
      } catch (err) {
        addMessage('system', `❌ Error listing events: ${err.message}`);
        return { success: false, error: err.message };
      }
    }
  });

  const deleteCalendarEvent = tool({
    name: 'delete_calendar_event',
    description: 'Delete an event from the calendar',
    parameters: z.object({
      eventId: z.string().describe('The ID of the event to delete')
    }),
    execute: async (args) => {
      console.log('Tool execute: delete_calendar_event', args);
      addMessage('system', `⚙️ Calling: delete_calendar_event...`);
      
      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            params: args
          })
        });
        
        const result = await response.json();
        if (result.success) addMessage('system', '✅ Event deleted');
        return result;
      } catch (err) {
        addMessage('system', `❌ Error deleting event: ${err.message}`);
        return { success: false, error: err.message };
      }
    }
  });

  const findCalendarEvent = tool({
    name: 'find_calendar_event',
    description: 'Find a specific event by title and date',
    parameters: z.object({
      summary: z.string().describe('The event title to search for'),
      date: z.string().describe('The date to search on (YYYY-MM-DD)')
    }),
    execute: async (args) => {
      console.log('Tool execute: find_calendar_event', args);
      addMessage('system', `⚙️ Calling: find_calendar_event...`);
      
      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'find',
            params: args
          })
        });
        
        const result = await response.json();
        return result;
      } catch (err) {
        addMessage('system', `❌ Error finding event: ${err.message}`);
        return { success: false, error: err.message };
      }
    }
  });

  const setupWebRTC = async () => {
    try {
      setStatus('Getting session token...');
      setError(null);

      // Request ephemeral client secret (ek_...) from backend
      const tokenResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!tokenResponse.ok) {
        const body = await tokenResponse.text();
        console.error('Failed to fetch ephemeral token:', tokenResponse.status, body);
        throw new Error('Failed to get session token');
      }

      const { client_secret } = await tokenResponse.json();

      // Validate the ephemeral token
      if (!client_secret || typeof client_secret !== 'string') {
        console.error('Invalid ephemeral token received from server:', client_secret);
        throw new Error('Invalid ephemeral token received from server');
      }

      if (!client_secret.startsWith('ek_')) {
        console.warn('Warning: ephemeral token does not start with "ek_". Token:', client_secret?.slice(0, 10) + '...');
      }

      setStatus('Creating agent and session...');

      // Create the agent with tools
      const agent = new RealtimeAgent({
        name: 'Calendar Assistant',
        instructions: `You are a friendly calendar assistant. You interact with the user to manage their Google Calendar. You can create, list, delete, and find events based on user requests. You have to always interact in a humanly way.

        For context:
        The current date and time is: ${new Date().toLocaleString()}
        Today's weekday is: ${new Date().toLocaleString('en-US', { weekday: 'long' })}

        Your job is to help users manage their Google Calendar through natural conversation. You can:
        1. Create calendar events - ask for event name, attendees (if needed), date, time, and duration
        2. List upcoming events
        3. Delete events by finding them first
        4. Find specific events

        When creating events:
        - Confirm all details before calling the function
        - Parse natural language dates like "tomorrow", "next Monday", "January 15th"
        - Default to 1 hour duration if not specified
        - Use ISO 8601 format for dates: YYYY-MM-DDTHH:MM:SS

        Be conversational and friendly. If information is missing, ask for it naturally.`,
        tools: [
          createCalendarEvent,
          listCalendarEvents,
          deleteCalendarEvent,
          findCalendarEvent
        ]
      });

      // Create the session with the agent
      const session = new RealtimeSession(agent);
      sessionRef.current = session;

      // Set up event listeners
      session.on('connected', () => {
        setIsConnected(true);
        setIsRecording(true);
        setStatus('🎤 Microphone Active - Listening...');
        addMessage('system', '✅ Voice connection established. Start speaking!');
        monitorMicrophoneLevel();
      });

      session.on('disconnected', () => {
        setIsConnected(false);
        setIsRecording(false);
        setIsMicActive(false);
        setStatus('Disconnected. Click to reconnect.');
        addMessage('system', '🔌 Voice connection closed');
        stopMicrophoneMonitoring();
      });

      session.on('error', (err) => {
        console.error('Session error:', err);
        setError(err.message);
        addMessage('system', `❌ Error: ${err.message}`);
        stopMicrophoneMonitoring();
      });

      // Listen for transcript events
      session.on('transcript', (event) => {
        if (event.role === 'user' && event.transcript) {
          addMessage('user', event.transcript);
        } else if (event.role === 'assistant' && event.transcript) {
          addMessage('agent', event.transcript);
        }
      });

      setStatus('Connecting to Realtime API...');
      console.log('Connecting with ephemeral token:', client_secret?.substring(0, 10) + '...');

      // Connect to the session with the ephemeral key
      await session.connect({ apiKey: client_secret });

    } catch (error) {
      console.error('WebRTC setup error:', error);
      setStatus('❌ Connection failed');
      setError(error.message);
      addMessage('system', `❌ Error: ${error.message}`);
      stopMicrophoneMonitoring();
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.disconnect();
      stopMicrophoneMonitoring();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎙️ Voice Calendar Assistant
          </h1>
          <p className="text-gray-600">Powered by OpenAI Agents SDK (WebRTC)</p>
          <div className="flex justify-center gap-4 mt-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              🔒 Secure WebRTC
            </span>
            <span className="flex items-center gap-1">
              🤖 SDK Powered
            </span>
            <span className="flex items-center gap-1">
              📅 Real-time Sync
            </span>
          </div>
        </div>

        {/* Voice Control Panel */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Status Indicator */}
          <div className="flex flex-col items-center justify-center gap-4 mb-6">
            {/* Microphone Visual Indicator */}
            {isRecording && (
              <div className="relative">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isMicActive 
                    ? 'bg-green-500 scale-110 shadow-lg shadow-green-300' 
                    : 'bg-blue-500 shadow-md'
                }`}>
                  <div className="text-4xl">🎤</div>
                </div>
                {isMicActive && (
                  <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                )}
              </div>
            )}
            
            {/* Status Text */}
            <div className="text-center">
              <p className="text-gray-700 font-medium text-lg">{status}</p>
              {isRecording && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-sm text-red-600 font-medium">
                    {isMicActive ? 'Detecting voice...' : 'Ready to listen'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Main Control Button */}
          <div className="flex justify-center">
            <button
              onClick={isConnected ? disconnect : setupWebRTC}
              className={`px-8 py-4 rounded-full text-white font-semibold text-lg transition-all transform hover:scale-105 shadow-lg ${
                isConnected 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isConnected ? '🛑 Stop Recording' : '🎤 Start Recording'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2 font-medium">
              {isConnected 
                ? '✅ Connected! Speak naturally into your microphone' 
                : '👆 Click the button above to start a voice conversation'}
            </p>
            <p className="text-xs text-gray-600 mb-2">Try saying:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>💬 "What's on my calendar?"</li>
              <li>➕ "Create a meeting tomorrow at 2pm"</li>
              <li>📋 "Show my upcoming events"</li>
              <li>🗑️ "Delete my 3pm appointment"</li>
            </ul>
          </div>
        </div>

        {/* Conversation Transcript */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              💬 Conversation
            </h2>
            {messages.length > 0 && (
              <span className="text-sm text-gray-500">
                ({messages.length} messages)
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-lg mb-2">No conversation yet</p>
                <p className="text-sm">Start talking to see the transcript here</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {msg.role !== 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm">
                      {msg.role === 'agent' ? '🤖' : 'ℹ️'}
                    </div>
                  )}
                  
                  <div
                    className={`flex-1 p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : msg.role === 'agent'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-50 text-gray-700 border border-yellow-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                      👤
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}