
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';
import { Call, CallSignal, UserProfile } from '../types';
import { respondToCall, endCall, sendCallSignal, subscribeToCallSignals, subscribeToCallStatus, createNotification } from '../services/firebase';

interface CallWindowProps {
  userId: string;
  call: Call;
  friendProfile: UserProfile | null;
  onClose: () => void;
}

const CallWindow: React.FC<CallWindowProps> = ({ userId, call, friendProfile, onClose }) => {
  const [status, setStatus] = useState<Call['status']>(call.status);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(call.type === 'audio');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());

  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const unsubStatus = subscribeToCallStatus(call.id, (updatedCall) => {
      setStatus(updatedCall.status);
      if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
        cleanup();
        setTimeout(onClose, 2000);
      }
    });

    if (call.fromUserId === userId) {
      // I am the caller
      startCall();
    }

    return () => {
      unsubStatus();
      cleanup();
    };
  }, [call.id]);

  useEffect(() => {
    if (status === 'accepted') {
      setupPeerConnection();
    }
  }, [status]);

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  const [error, setError] = useState<string | null>(null);

  const startCall = async (retryAudioOnly = false) => {
    setError(null);
    try {
      const constraints = {
        audio: true,
        video: retryAudioOnly ? false : call.type === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      
      if (call.type === 'video' && !retryAudioOnly) {
        // Try falling back to audio only
        console.log("Falling back to audio only...");
        return startCall(true);
      }
      
      setError("ক্যামেরা বা মাইক্রোফোন অ্যাক্সেস করতে সমস্যা হচ্ছে। দয়া করে পারমিশন চেক করুন।");
      // Do NOT end the call automatically. Let the user decide.
      return null;
    }
  };

  const setupPeerConnection = async () => {
    if (peerConnection.current) return;

    peerConnection.current = new RTCPeerConnection(configuration);

    let stream = localStream;
    if (!stream) {
      stream = await startCall();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream!);
      });
    }

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(call.id, 'candidate', event.candidate, userId);
      }
    };

    // Subscribe to signals
    const unsubSignals = subscribeToCallSignals(call.id, async (signals) => {
      for (const signal of signals) {
        if (signal.fromUserId === userId || processedSignals.current.has(signal.id)) continue;
        processedSignals.current.add(signal.id);

        if (signal.type === 'offer') {
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await peerConnection.current?.createAnswer();
          await peerConnection.current?.setLocalDescription(answer);
          sendCallSignal(call.id, 'answer', answer, userId);
        } else if (signal.type === 'answer') {
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(signal.data));
        } else if (signal.type === 'candidate') {
          try {
            await peerConnection.current?.addIceCandidate(new RTCIceCandidate(signal.data));
          } catch (e) {
            console.error("Error adding ice candidate", e);
          }
        }
      }
    });

    // If I am the caller, create offer
    if (call.fromUserId === userId) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      sendCallSignal(call.id, 'offer', offer, userId);
    }

    return unsubSignals;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, status, isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);

  const handleAccept = async () => {
    try {
      await respondToCall(call.id, 'accepted');
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleReject = async () => {
    try {
      await respondToCall(call.id, 'rejected');
      await createNotification(call.fromUserId, userId, 'missed_call', `${friendProfile?.displayName || userId} আপনার কলটি রিজেক্ট করেছেন।`);
      onClose();
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  const handleEndCall = async () => {
    try {
      if (status === 'ringing' && call.fromUserId === userId) {
        await createNotification(call.toUserId, userId, 'missed_call', `${friendProfile?.displayName || userId} থেকে একটি মিসড কল।`);
      }
      await endCall(call.id);
      cleanup();
      onClose();
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && call.type === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[200] bg-[#1D4ED8] text-white p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
          {friendProfile?.profileImageUrl ? (
            <img src={friendProfile.profileImageUrl} alt="Friend" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-blue-600 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold leading-none">{friendProfile?.displayName || call.fromUserId}</p>
          <p className="text-[10px] opacity-80">{status === 'ringing' ? 'কল আসছে...' : 'কল চলছে'}</p>
        </div>
        <button onClick={() => setIsMinimized(false)} className="p-1 hover:bg-white/20 rounded-full">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={handleEndCall} className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full">
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button onClick={() => setIsMinimized(true)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
            <Minimize2 className="w-5 h-5" />
          </button>
          <div className="bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
            <p className="text-white text-[10px] font-bold tracking-widest uppercase opacity-80">
              {call.type === 'video' ? 'ভিডিও কল' : 'অডিও কল'}
            </p>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-20 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg z-50 text-center text-sm">
            {error}
            <button 
              onClick={() => startCall()}
              className="ml-2 underline font-bold"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        )}

        {/* Video Area */}
        <div className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-hidden">
          {call.type === 'video' && status === 'accepted' && remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                {friendProfile?.profileImageUrl ? (
                  <img src={friendProfile.profileImageUrl} alt="Friend" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                    <Phone className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-white text-2xl font-bold">{friendProfile?.displayName || (call.fromUserId === userId ? call.toUserId : call.fromUserId)}</h2>
                <p className="text-blue-400 font-medium animate-pulse mt-1">
                  {status === 'ringing' ? (call.fromUserId === userId ? 'কল করা হচ্ছে...' : 'কল আসছে...') : 
                   status === 'accepted' ? 'সংযুক্ত হচ্ছে...' : 
                   status === 'rejected' ? 'কল রিজেক্ট করা হয়েছে' : 
                   status === 'ended' ? 'কল শেষ হয়েছে' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Local Video Preview */}
          {call.type === 'video' && status === 'accepted' && (
            <div className="absolute bottom-24 right-4 w-28 aspect-[3/4] bg-black rounded-xl overflow-hidden border-2 border-white/20 shadow-xl z-20">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <VideoOff className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-900/80 backdrop-blur-xl p-8 flex flex-col gap-6 items-center border-t border-white/5">
          {status === 'ringing' && call.toUserId === userId ? (
            <div className="flex gap-12">
              <button 
                onClick={handleReject}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 transition-all hover:scale-110 active:scale-95"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <button 
                onClick={handleAccept}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 transition-all hover:scale-110 active:scale-95 animate-bounce"
              >
                <Phone className="w-8 h-8" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <button 
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 transition-all hover:scale-110 active:scale-95"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              {call.type === 'video' && (
                <button 
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallWindow;
