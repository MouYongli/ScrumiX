import React, { useState, useEffect } from 'react';
import { 
  X, Mic, MicOff, Video, VideoOff, Phone, PhoneOff, 
  Users, Settings, Share2, MessageCircle, MoreHorizontal,
  Volume2, VolumeX, Monitor, Camera, Grid3X3
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isPresenting: boolean;
  status: 'connected' | 'connecting' | 'disconnected';
}

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle?: string;
  participants?: Participant[];
  isHost?: boolean;
}

const mockParticipants: Participant[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    isMuted: false,
    isVideoOn: true,
    isPresenting: false,
    status: 'connected'
  },
  {
    id: '2',
    name: 'Mike Chen',
    isMuted: true,
    isVideoOn: true,
    isPresenting: true,
    status: 'connected'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    isMuted: false,
    isVideoOn: false,
    isPresenting: false,
    status: 'connected'
  },
  {
    id: '4',
    name: 'David Park',
    isMuted: true,
    isVideoOn: true,
    isPresenting: false,
    status: 'connecting'
  }
];

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  meetingTitle = "Team Meeting",
  participants = mockParticipants,
  isHost = false
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'speaker' | 'gallery'>('speaker');
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Timer for meeting duration
  useEffect(() => {
    if (!isOpen || !isClient) return;
    
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isClient]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const connectedParticipants = participants.filter(p => p.status === 'connected');
  const presentingParticipant = participants.find(p => p.isPresenting);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="w-full h-full max-w-7xl max-h-screen bg-gray-900 rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">{meetingTitle}</h2>
            <span className="text-sm text-gray-400">{formatDuration(meetingDuration)}</span>
            <span className="text-sm text-gray-400">
              {connectedParticipants.length} participant{connectedParticipants.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker')}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={`Switch to ${viewMode === 'speaker' ? 'gallery' : 'speaker'} view`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Toggle chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Main Video Area */}
          <div className="flex-1 p-4">
            {viewMode === 'speaker' ? (
              <div className="h-full flex flex-col gap-4">
                {/* Main Speaker */}
                <div className="flex-1 bg-gray-800 rounded-lg relative overflow-hidden">
                  {presentingParticipant ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                          {getInitials(presentingParticipant.name)}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{presentingParticipant.name}</h3>
                        <p className="text-gray-300">Presenting</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Video className="w-16 h-16 mx-auto mb-4" />
                        <p>No one is presenting</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Presentation indicator */}
                  {presentingParticipant && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Screen sharing
                    </div>
                  )}
                </div>

                {/* Participant Thumbnails */}
                <div className="flex gap-3 h-24">
                  {connectedParticipants.slice(0, 6).map((participant) => (
                    <div 
                      key={participant.id}
                      className="relative bg-gray-800 rounded-lg overflow-hidden w-32 flex-shrink-0"
                    >
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(participant.name)}
                        </div>
                      </div>
                      
                      {/* Video/Audio status */}
                      <div className="absolute bottom-1 left-1 flex gap-1">
                        {!participant.isVideoOn && (
                          <div className="bg-black bg-opacity-60 rounded p-1">
                            <VideoOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {participant.isMuted && (
                          <div className="bg-black bg-opacity-60 rounded p-1">
                            <MicOff className="w-3 h-3 text-red-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Name */}
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        {participant.name.split(' ')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Gallery View */
              <div className="h-full grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {connectedParticipants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                      <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-xl font-medium">
                        {getInitials(participant.name)}
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {!participant.isVideoOn && (
                        <div className="bg-black bg-opacity-60 rounded p-1">
                          <VideoOff className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {participant.isMuted && (
                        <div className="bg-black bg-opacity-60 rounded p-1">
                          <MicOff className="w-4 h-4 text-red-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded">
                      {participant.name}
                    </div>
                    
                    {/* Presenting indicator */}
                    {participant.isPresenting && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs">
                        Presenting
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          {isChatOpen && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Meeting Chat</h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-blue-400 font-medium">Sarah Johnson</span>
                    <span className="text-gray-400 ml-2">10:30 AM</span>
                    <p className="text-gray-300 mt-1">Good morning everyone! Ready for the demo?</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-400 font-medium">Mike Chen</span>
                    <span className="text-gray-400 ml-2">10:31 AM</span>
                    <p className="text-gray-300 mt-1">Yes, let me share my screen now</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-700">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Control Bar */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
          <div className="flex justify-center items-center gap-4">
            {/* Mic Control */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full transition-colors ${
                isMuted 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Control */}
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-3 rounded-full transition-colors ${
                !isVideoOn 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={() => setIsPresenting(!isPresenting)}
              className={`p-3 rounded-full transition-colors ${
                isPresenting 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isPresenting ? 'Stop sharing' : 'Share screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* Participants */}
            <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              <Users className="w-5 h-5" />
            </button>

            {/* More Options */}
            <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* Leave Call */}
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors ml-4"
              title="Leave call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal; 