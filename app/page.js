'use client';
import { useState, useRef, useEffect } from 'react';

export default function VoiceCalendarAgent() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Click microphone to start voice conversation');
  const [error, setError] = useState(null);
  
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, {
      role,
      text,
      timestamp: new Date().toISOString()
    }]);
  };

  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
    };
  }, []);

  const setupWebRTC = async () => {
    try {
      setStatus('Getting session token...');
      setError(null);
      
      // Get ephemeral token from our backend (secure!)
      const tokenResponse = await fetch('/api/session', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get session token');
      }
      
      const { client_secret } = await tokenResponse.json();
      
      setStatus('Setting up audio connection...');
      
      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Setup audio element for receiving AI voice
      const audioEl = audioElementRef.current;
      audioEl.autoplay = true;
      
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Add microphone audio
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      pc.addTrack(ms.getTracks()[0]);

      // Create data channel for sending/receiving events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;
      
      dc.addEventListener('open', () => {
        console.log('Data channel opened');
        setIsConnected(true);
        setIsRecording(true);
        setStatus('🎤 Connected! Speak to your calendar assistant');
        addMessage('system', '✅ Voice connection established. Try saying: "What events do I have?" or "Create a meeting tomorrow at 2pm"');
        
        // Configure the session
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: { type: 'server_vad' },
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            voice: 'verse',
            instructions: `You are a helpful calendar assistant.
            The current date and time is: ${new Date().toLocaleString()}

            Your job is to help users manage their Google Calendar through natural conversation.

            You can:
            1. Create calendar events - ask for event name, date, time, and duration
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
              {
                type: 'function',
                name: 'create_calendar_event',
                description: 'Create a new event in the user\'s Google Calendar',
                parameters: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'string',
                      description: 'The title/name of the event'
                    },
                    startTime: {
                      type: 'string',
                      description: 'Start time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)'
                    },
                    endTime: {
                      type: 'string',
                      description: 'End time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)'
                    },
                    timezone: {
                      type: 'string',
                      description: 'Timezone (default: Asia/Kolkata)',
                      default: 'Asia/Kolkata'
                    }
                  },
                  required: ['summary', 'startTime', 'endTime']
                }
              },
              {
                type: 'function',
                name: 'list_calendar_events',
                description: 'List upcoming events from the user\'s calendar',
                parameters: {
                  type: 'object',
                  properties: {
                    maxResults: {
                      type: 'number',
                      description: 'Maximum number of events to return (default: 10)',
                      default: 10
                    }
                  }
                }
              },
              {
                type: 'function',
                name: 'delete_calendar_event',
                description: 'Delete an event from the calendar',
                parameters: {
                  type: 'object',
                  properties: {
                    eventId: {
                      type: 'string',
                      description: 'The ID of the event to delete'
                    }
                  },
                  required: ['eventId']
                }
              },
              {
                type: 'function',
                name: 'find_calendar_event',
                description: 'Find a specific event by title and date',
                parameters: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'string',
                      description: 'The event title to search for'
                    },
                    date: {
                      type: 'string',
                      description: 'The date to search on (YYYY-MM-DD)'
                    }
                  },
                  required: ['summary', 'date']
                }
              }
            ],
            tool_choice: 'auto'
          }
        }));
      });

      dc.addEventListener('message', async (e) => {
        const msg = JSON.parse(e.data);
        
        // Log all events for debugging
        console.log('Received event:', msg.type);
        
        // Handle user speech transcription
        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          addMessage('user', msg.transcript);
        }
        
        // Handle AI speech transcription
        if (msg.type === 'response.audio_transcript.done') {
          addMessage('agent', msg.transcript);
        }
        
        // Handle function calls
        if (msg.type === 'response.function_call_arguments.done') {
          const functionName = msg.name;
          const args = JSON.parse(msg.arguments);
          const callId = msg.call_id;
          
          console.log('Function call:', functionName, args);
          addMessage('system', `⚙️ Calling: ${functionName}...`);
          
          try {
            // Map function names to API actions
            const actionMap = {
              'create_calendar_event': 'create',
              'list_calendar_events': 'list',
              'delete_calendar_event': 'delete',
              'find_calendar_event': 'find'
            };
            
            const action = actionMap[functionName];
            
            // Call our calendar API
            const response = await fetch('/api/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action,
                params: args
              })
            });
            
            const result = await response.json();
            console.log('Function result:', result);
            
            // Format result for display
            if (result.success) {
              if (action === 'create') {
                addMessage('system', `✅ Created: ${result.summary}`);
              } else if (action === 'list') {
                const eventsList = result.events.map(e => 
                  `• ${e.summary} - ${new Date(e.start).toLocaleString()}`
                ).join('\n');
                addMessage('system', `📅 Upcoming Events:\n${eventsList || 'No events found'}`);
              } else if (action === 'delete') {
                addMessage('system', '✅ Event deleted');
              }
            }
            
            // Send result back to OpenAI
            dc.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(result)
              }
            }));
            
            // Trigger AI response
            dc.send(JSON.stringify({ type: 'response.create' }));
            
          } catch (error) {
            console.error('Function execution error:', error);
            addMessage('system', `❌ Error: ${error.message}`);
            
            // Send error back to OpenAI
            dc.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify({ error: error.message })
              }
            }));
          }
        }
        
        // Handle errors
        if (msg.type === 'error') {
          console.error('OpenAI error:', msg.error);
          addMessage('system', `❌ Error: ${msg.error.message}`);
        }
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI and get answer
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${client_secret}`,
          'Content-Type': 'application/sdp'
        },
      });

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text()
      };
      
      await pc.setRemoteDescription(answer);

    } catch (error) {
      console.error('WebRTC setup error:', error);
      setStatus('❌ Connection failed');
      setError(error.message);
      addMessage('system', `❌ Error: ${error.message}`);
    }
  };

  const disconnect = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setIsConnected(false);
    setIsRecording(false);
    setStatus('Disconnected. Click to reconnect.');
    addMessage('system', '🔌 Voice connection closed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                🎙️ Voice Calendar Assistant
              </h1>
              <p className="text-gray-600">
                Powered by OpenAI Realtime API + WebRTC
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-sm text-gray-500 space-y-1">
                <div>🔒 Secure WebRTC</div>
                <div>🤖 AI-Powered</div>
                <div>📅 Real-time Sync</div>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Control Panel */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-6">
          <div className="flex flex-col items-center gap-6">
            
            {/* Status Indicator */}
            <div className="w-full max-w-md">
              <div className={`px-4 py-3 rounded-full text-center font-medium transition-all ${
                isConnected 
                  ? 'bg-green-100 text-green-700 shadow-green-200 shadow-lg' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  {isRecording && (
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  <span>{status}</span>
                </div>
              </div>
              
              {error && (
                <div className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Main Control Button */}
            <button
              onClick={isConnected ? disconnect : setupWebRTC}
              disabled={isRecording && isConnected}
              className={`relative w-40 h-40 rounded-full text-white font-bold text-xl shadow-2xl transform transition-all duration-300 ${
                isConnected
                  ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-105'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105'
              } active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-5xl mb-2">
                  {isConnected ? '🛑' : '🎤'}
                </span>
                <span className="text-lg">
                  {isConnected ? 'Stop' : 'Start'}
                </span>
              </div>
              
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
              )}
            </button>

            {/* Instructions */}
            <div className="max-w-2xl text-center space-y-4">
              <p className="text-gray-700 font-medium">
                Click the microphone to start a voice conversation
              </p>
              
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-sm text-gray-600 font-semibold mb-2">Try saying:</p>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="bg-white rounded-lg p-2">
                    💬 "What's on my calendar?"
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    ➕ "Create a meeting tomorrow at 2pm"
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    📋 "Show my upcoming events"
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    🗑️ "Delete my 3pm appointment"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden audio element */}
          <audio ref={audioElementRef} autoPlay className="hidden" />
        </div>

        {/* Conversation Transcript */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            💬 Conversation
            {messages.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({messages.length} messages)
              </span>
            )}
          </h2>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No conversation yet</p>
                <p className="text-sm mt-2">Start talking to see the transcript here</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 animate-fadeIn ${
                    msg.role === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {msg.role !== 'user' && (
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                      msg.role === 'agent' ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      {msg.role === 'agent' ? '🤖' : 'ℹ️'}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    <div className={`px-4 py-2 rounded-2xl shadow-md ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : msg.role === 'agent'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 px-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg">
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