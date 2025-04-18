import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Webcam from 'react-webcam';
import { Stage, Layer, Line, Text } from 'react-konva';

const socket = io('https://two215000078.onrender.com');

function App() {
  const [roomId, setRoomId] = useState('');
  const [joinKey, setJoinKey] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const webcamRef = useRef(null);
  const stageRef = useRef(null);

  // Socket event listeners
  useEffect(() => {
    socket.on('room_created', (data) => {
      setCreatedRoom({
        roomId: data.roomId,
        joinKey: data.joinKey
      });
      setIsCreator(true);
    });

    socket.on('room_joined', (data) => {
      setCreatedRoom({
        roomId: data.roomId,
        joinKey: data.joinKey
      });
      setIsCreator(false);
      setParticipants(data.participants);
    });

    socket.on('new_participant', (participant) => {
      setParticipants(prev => [...prev, participant]);
    });

    socket.on('participant_left', (participantId) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    socket.on('draw', (line) => {
      setLines(prev => [...prev, line]);
    });

    socket.on('clear_board', () => {
      setLines([]);
    });

    return () => {
      socket.off();
    };
  }, []);

  const createRoom = () => {
    socket.emit('create_room');
  };

  const joinRoom = () => {
    if (roomId && joinKey) {
      socket.emit('join_room', { roomId, joinKey });
    }
  };

  const handleMouseDown = (e) => {
    if (!isCreator) return;
    
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], color: '#000000' }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !isCreator) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setLines(prev => {
      const lastLine = prev[prev.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      return [...prev.slice(0, -1), lastLine];
    });

    const lastLine = lines[lines.length - 1];
    socket.emit('draw', { roomId: createdRoom.roomId, line: lastLine });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    if (isCreator) {
      setLines([]);
      socket.emit('clear_board', { roomId: createdRoom.roomId });
    }
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}?room=${createdRoom.roomId}&key=${createdRoom.joinKey}`;
    navigator.clipboard.writeText(link);
    alert('Join link copied to clipboard!');
  };

  return (
    <div className="App" style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Streaming Website</h1>
      
      {!createdRoom ? (
        <div style={{ margin: '20px 0' }}>
          <button 
            onClick={createRoom}
            style={{ 
              padding: '10px 20px', 
              margin: '10px', 
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create New Room
          </button>
          
          <div style={{ margin: '20px 0' }}>
            <h3>Join Existing Room</h3>
            <input 
              type="text" 
              value={roomId} 
              onChange={(e) => setRoomId(e.target.value)} 
              placeholder="Room ID"
              style={{ 
                padding: '10px',
                margin: '10px 10px 10px 0',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
            <input 
              type="text" 
              value={joinKey} 
              onChange={(e) => setJoinKey(e.target.value)} 
              placeholder="Join Key"
              style={{ 
                padding: '10px',
                margin: '10px 10px 10px 0',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
            <button 
              onClick={joinRoom}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2>
            Room: {createdRoom.roomId}
            <span style={{ color: isCreator ? 'green' : 'blue', marginLeft: '10px' }}>
              {isCreator ? '(Creator)' : '(Participant)'}
            </span>
          </h2>
          
          {isCreator && (
            <div style={{ margin: '10px 0', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <p>Share this key to join your room: <strong>{createdRoom.joinKey}</strong></p>
              <button 
                onClick={copyJoinLink}
                style={{ 
                  padding: '5px 10px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '5px'
                }}
              >
                Copy Join Link
              </button>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
            <div>
              <h3>Your Webcam</h3>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                style={{ 
                  width: '400px', 
                  height: '300px',
                  border: '2px solid #ddd',
                  borderRadius: '8px'
                }}
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Shared Whiteboard</h3>
                {isCreator && (
                  <button 
                    onClick={clearWhiteboard}
                    style={{ 
                      padding: '5px 10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Board
                  </button>
                )}
              </div>
              <div
                style={{
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}
              >
                <Stage
                  width={400}
                  height={300}
                  ref={stageRef}
                  onMouseDown={handleMouseDown}
                  onMousemove={handleMouseMove}
                  onMouseup={handleMouseUp}
                >
                  <Layer>
                    {lines.map((line, i) => (
                      <Line
                        key={i}
                        points={line.points}
                        stroke={line.color}
                        strokeWidth={5}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                      />
                    ))}
                    {isCreator && (
                      <Text 
                        text="Draw here (Creator only)" 
                        x={10} 
                        y={10} 
                        fontSize={16} 
                        fill="#888" 
                        visible={lines.length === 0}
                      />
                    )}
                    {!isCreator && (
                      <Text 
                        text="View only" 
                        x={10} 
                        y={10} 
                        fontSize={16} 
                        fill="#888" 
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          </div>
          
          <div>
            <h3>Participants: {participants.length + 1}</h3>
            <ul>
              <li>You ({isCreator ? 'Creator' : 'Participant'})</li>
              {participants.map((p, i) => (
                <li key={i}>Participant {i+1}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;