import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MessageSquare, ShieldAlert } from 'lucide-react';

interface WebRTCVideoCallProps {
  roomId: string;
  role: string;
  onClose: () => void;
}

export default function WebRTCVideoCall({ roomId, role, onClose }: WebRTCVideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing Media...');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [webrtcFallbackActive, setWebrtcFallbackActive] = useState(false);

  // WebRTC configuration (Google STUN servers for NAT traversal)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    startConsultation();

    return () => {
      // Cleanup streams and socket
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId]);

  const startConsultation = async () => {
    try {
      // 1. Get user media (mic & camera)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera/Mic not detected. Activating clinical sandbox video simulation mode.");
        setWebrtcFallbackActive(true);
        setConnectionStatus("Connected (Sandbox Simulator)");
        return;
      }

      // 2. Open WebSocket Signaling channel
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/webrtc/signal/${roomId}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setConnectionStatus('Waiting for participant to join...');
        initializePeerConnection();
      };

      socketRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        handleSignalingMessage(data);
      };

      socketRef.current.onerror = () => {
        setConnectionStatus('Signaling channel error.');
      };

      socketRef.current.onclose = () => {
        setConnectionStatus('Disconnected.');
      };

    } catch (e) {
      console.error("Consultation initialization failed", e);
      setConnectionStatus('Failed to connect.');
    }
  };

  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote media track arrival
    pc.ontrack = (event) => {
      setConnectionStatus('Consultation Active (HD Video)');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };

    // Patient initiates the call offer
    if (role === 'patient') {
      createCallOffer();
    }
  };

  const createCallOffer = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'offer',
          sdp: offer.sdp
        }));
      }
    } catch (e) {
      console.error("Failed to create WebRTC offer", e);
    }
  };

  const handleSignalingMessage = async (data: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'answer',
            sdp: answer.sdp
          }));
        }
        setConnectionStatus('Consultation Active (HD Video)');
      } 
      else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        setConnectionStatus('Consultation Active (HD Video)');
      } 
      else if (data.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
      else if (data.type === 'chat') {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
      }
    } catch (e) {
      console.error("Signaling parsing error", e);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    } else {
      setMicEnabled(!micEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    } else {
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (webrtcFallbackActive) return;
    try {
      if (!screenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        videoTrack.onended = () => {
          stopScreenSharing();
        };
        setScreenSharing(true);
      } else {
        stopScreenSharing();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stopScreenSharing = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setScreenSharing(false);
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    // Append to local state
    setMessages(prev => [...prev, { sender: role, text: chatInput }]);
    
    // Broadcast over WS
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        sender: role,
        text: chatInput
      }));
    }
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-100 dark:border-gray-800">
        
        {/* Video stream container */}
        <div className="flex-1 bg-gray-950 p-6 flex flex-col justify-between relative">
          
          {/* Header Banner */}
          <div className="flex items-center justify-between z-10 bg-gray-900/60 backdrop-blur-md p-3 px-4 rounded-xl border border-white/5">
            <div>
              <h2 className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                Telehealth Consult Session
              </h2>
              <p className="text-[10px] text-gray-400">ID: {roomId.slice(0, 18)}...</p>
            </div>
            <span className="text-xs bg-teal-500/20 text-teal-400 font-semibold px-2.5 py-1 rounded-full border border-teal-500/30">
              {connectionStatus}
            </span>
          </div>

          {/* Videos Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 my-4 items-center justify-center">
            
            {/* Local Camera stream */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video border border-white/5 flex items-center justify-center">
              {webrtcFallbackActive ? (
                <div className="text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center font-bold text-xl mb-3">
                    {role[0].toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-400 font-semibold">Self Video (Simulated Feed)</p>
                  <p className="text-[10px] text-gray-500 mt-1">Mic: {micEnabled ? 'On' : 'Muted'}</p>
                </div>
              ) : (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              <span className="absolute bottom-3 left-3 bg-gray-950/60 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-lg border border-white/5">
                You ({role.toUpperCase()})
              </span>
            </div>

            {/* Remote camera stream */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video border border-white/5 flex items-center justify-center">
              {webrtcFallbackActive ? (
                <div className="text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center font-bold text-xl mb-3 animate-pulse">
                    {role === 'patient' ? 'D' : 'P'}
                  </div>
                  <p className="text-xs text-gray-400 font-semibold">
                    {role === 'patient' ? 'Dr. Sarah Connor' : 'John Doe (Patient)'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">Simulated HD Consult Room Feed</p>
                </div>
              ) : (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              )}
              <span className="absolute bottom-3 left-3 bg-gray-950/60 backdrop-blur-md text-[10px] text-white px-2.5 py-1 rounded-lg border border-white/5">
                {role === 'patient' ? 'Ophthalmologist (DR)' : 'Patient (PT)'}
              </span>
            </div>
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-center gap-3 z-10 bg-gray-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 w-fit mx-auto">
            
            {/* Audio Toggle */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-xl transition-all ${
                micEnabled ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-xl transition-all ${
                videoEnabled ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share (if not simulated) */}
            <button
              onClick={toggleScreenShare}
              disabled={webrtcFallbackActive}
              className={`p-3 rounded-xl transition-all ${
                screenSharing ? 'bg-teal-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
              } ${webrtcFallbackActive ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* Hangup */}
            <button
              onClick={onClose}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Side Consultation Chat */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col justify-between h-[30vh] md:h-full">
          
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-500" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Session Chat</h3>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">Send a message to start conversation.</p>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.sender === role;
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-gray-400 mb-0.5 capitalize">{m.sender}</span>
                    <div className={`p-2.5 rounded-2xl text-xs max-w-[85%] leading-normal ${
                      isMe 
                        ? 'bg-teal-500 text-white rounded-tr-none' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input block */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input
              type="text"
              placeholder="Type message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
              className="flex-1 border border-gray-200 dark:border-gray-700 bg-transparent dark:bg-gray-800 rounded-xl px-3 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
            />
            <button
              onClick={sendChatMessage}
              className="px-3 py-2 bg-teal-500 text-white rounded-xl text-xs font-semibold hover:bg-teal-600 transition-all"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
