from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import secrets
import string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {} 
participants = {}  

def generate_join_key():
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(8))


@app.route('/')
def home():
    return jsonify({
        "status": "running",
        "message": "Socket.IO server is operational",
        "routes": {
            "socket_io": "ws://two215000078.onrender.com/socket.io/"
        }
    })

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    # Remove participant from all rooms
    for room_id, room_data in rooms.items():
        if request.sid == room_data['creator']:
            # Room creator left, disband room
            emit('room_closed', {'message': 'Room creator has left'}, room=room_id)
            del rooms[room_id]
            del participants[room_id]
            break
        elif room_id in participants and request.sid in participants[room_id]:
            # Participant left
            participants[room_id].remove(request.sid)
            emit('participant_left', {'id': request.sid}, room=room_id)
            break

@socketio.on('create_room')
def handle_create_room():
    room_id = str(len(rooms) + 1)
    join_key = generate_join_key()
    rooms[room_id] = {'creator': request.sid, 'join_key': join_key}
    participants[room_id] = [request.sid]
    join_room(room_id)
    emit('room_created', {
        'roomId': room_id,
        'joinKey': join_key
    })

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('roomId')
    join_key = data.get('joinKey')
    
    if room_id in rooms and rooms[room_id]['join_key'] == join_key:
        join_room(room_id)
        participants[room_id].append(request.sid)
        emit('room_joined', {
            'roomId': room_id,
            'joinKey': join_key,
            'participants': [{'id': sid} for sid in participants[room_id] if sid != request.sid]
        })
        emit('new_participant', {'id': request.sid}, room=room_id, include_self=False)
    else:
        emit('error', {'message': 'Invalid room ID or join key'})

@socketio.on('draw')
def handle_draw(data):
    room_id = data.get('roomId')
    line = data.get('line')
    # Only broadcast if sender is the room creator
    if room_id in rooms and rooms[room_id]['creator'] == request.sid:
        emit('draw', line, room=room_id, include_self=False)

@socketio.on('clear_board')
def handle_clear_board(data):
    room_id = data.get('roomId')
    # Only broadcast if sender is the room creator
    if room_id in rooms and rooms[room_id]['creator'] == request.sid:
        emit('clear_board', {}, room=room_id, include_self=False)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)