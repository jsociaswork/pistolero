const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let rooms = {};

io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado');

    socket.on('createRoom', (roomCode) => {
        if (rooms[roomCode]) {
            socket.emit('error', 'La sala ya existe');
        } else {
            rooms[roomCode] = { players: [socket.id], moves: {}, turn: 0 };
            socket.join(roomCode);
            socket.emit('roomCreated', roomCode);
            console.log(`Sala creada: ${roomCode}`);
        }
    });

    socket.on('joinRoom', (roomCode) => {
        const room = rooms[roomCode];
        if (room && room.players.length < 2) {
            room.players.push(socket.id);
            socket.join(roomCode);
            io.to(roomCode).emit('startGame', { bullets: [1, 1] });
            console.log(`Jugador se ha unido a la sala: ${roomCode}`);
        } else {
            socket.emit('error', 'La sala está llena o no existe');
        }
    });

    socket.on('playerMove', (data) => {
        const { roomCode, move } = data;
        const room = rooms[roomCode];

        if (room) {
            room.moves[socket.id] = move;
            io.to(roomCode).emit('playerMoveReceived', { playerId: socket.id });

            if (Object.keys(room.moves).length === 2) {
                resolveTurn(roomCode);
            }
        }
    });

    const resolveTurn = (roomCode) => {
        const room = rooms[roomCode];
        const [player1, player2] = room.players;
        const move1 = room.moves[player1];
        const move2 = room.moves[player2];

        let bullets = [1, 1];
        let result = { player1: null, player2: null };

        // Inicializa la cantidad de balas
        bullets[0] = room.bullets ? room.bullets[0] : 1;
        bullets[1] = room.bullets ? room.bullets[1] : 1;

        if (move1 === 'shoot' && move2 === 'reload') {
            result.player1 = 'win';
            result.player2 = 'lose';
        } else if (move1 === 'reload' && move2 === 'shoot') {
            result.player1 = 'lose';
            result.player2 = 'win';
        } else {
            if (move1 === 'reload') bullets[0]++;
            if (move2 === 'reload') bullets[1]++;
            if (move1 === 'shoot') bullets[0]--;
            if (move2 === 'shoot') bullets[1]--;
            result.player1 = 'continue';
            result.player2 = 'continue';
        }

        room.bullets = bullets;
        room.moves = {};

        io.to(player1).emit('resolveTurn', {
            playerMove: move1,
            opponentMove: move2,
            bullets: bullets[0],
            opponentBullets: bullets[1],
            result: result.player1,
        });

        io.to(player2).emit('resolveTurn', {
            playerMove: move2,
            opponentMove: move1,
            bullets: bullets[1],
            opponentBullets: bullets[0],
            result: result.player2,
        });
    };

    socket.on('disconnect', () => {
        let roomCodeToDelete = null;
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players.includes(socket.id)) {
                io.to(roomCode).emit('playerDisconnected');
                room.players = room.players.filter(id => id !== socket.id);
                if (room.players.length === 0) {
                    roomCodeToDelete = roomCode;
                }
            }
        }

        if (roomCodeToDelete) {
            delete rooms[roomCodeToDelete];
            console.log(`Sala ${roomCodeToDelete} eliminada`);
        }

        console.log('Jugador desconectado');
    });
});

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Servidor escuchando en puerto 3000');
});