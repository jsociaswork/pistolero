const socket = io();

const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const shootBtn = document.getElementById('shootBtn');
const protectBtn = document.getElementById('protectBtn');
const reloadBtn = document.getElementById('reloadBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const menu = document.getElementById('menu');
const game = document.getElementById('game');
const gameMessage = document.createElement('p');

game.insertBefore(gameMessage, game.firstChild);

let bullets = 1;
let opponentBullets = 1;
let actionChosen = false;

function lockButtons() {
    shootBtn.disabled = true;
    protectBtn.disabled = true;
    reloadBtn.disabled = true;
}

function unlockButtons() {
    shootBtn.disabled = false;
    protectBtn.disabled = false;
    reloadBtn.disabled = false;
}

function updateGameMessage(message) {
    gameMessage.textContent = message;
}

createRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value;
    if (roomCode) {
        socket.emit('createRoom', roomCode);
    }
});

joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value;
    if (roomCode) {
        socket.emit('joinRoom', roomCode);
    }
});

socket.on('roomCreated', (roomCode) => {
    console.log(`Sala creada: ${roomCode}`);
    menu.style.display = 'none';
    game.style.display = 'block';
    updateGameMessage('Elige una acción');
    unlockButtons();
});

socket.on('startGame', (data) => {
    console.log('El juego ha comenzado');
    menu.style.display = 'none';
    game.style.display = 'block';
    bullets = data.bullets[0];
    opponentBullets = data.bullets[1];
    updateGameMessage('Elige una acción');
    unlockButtons();
});

shootBtn.addEventListener('click', () => {
    if (bullets > 0) {
        socket.emit('playerMove', { roomCode: roomCodeInput.value, move: 'shoot' });
        lockButtons();
        updateGameMessage('Esperando al otro jugador...');
        actionChosen = true;
    } else {
        alert('No tienes balas suficientes para disparar.');
    }
});

protectBtn.addEventListener('click', () => {
    socket.emit('playerMove', { roomCode: roomCodeInput.value, move: 'protect' });
    lockButtons();
    updateGameMessage('Esperando al otro jugador...');
    actionChosen = true;
});

reloadBtn.addEventListener('click', () => {
    socket.emit('playerMove', { roomCode: roomCodeInput.value, move: 'reload' });
    lockButtons();
    updateGameMessage('Esperando al otro jugador...');
    actionChosen = true;
});

socket.on('resolveTurn', (data) => {
    bullets = data.bullets;
    opponentBullets = data.opponentBullets;

    if (data.result === 'win') {
        updateGameMessage('¡Ganaste! El otro jugador recargó mientras tú disparabas.');
    } else if (data.result === 'lose') {
        updateGameMessage('Perdiste... El otro jugador disparó mientras recargabas.');
    } else {
        let message = `Tu acción: ${data.playerMove}. Acción del oponente: ${data.opponentMove}.`;
        message += ` Tus balas: ${bullets}. Balas del oponente: ${opponentBullets}.`;
        updateGameMessage(message);
        actionChosen = false;
        unlockButtons();
    }
});

socket.on('playerDisconnected', () => {
    alert('El otro jugador se ha desconectado. Regresando al menú.');
    menu.style.display = 'block';
    game.style.display = 'none';
});