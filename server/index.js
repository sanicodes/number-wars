const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Optimize memory usage
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: true, limit: '1kb' }));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins in development, you can restrict this in production
    methods: ["GET", "POST"]
  },
  // Optimize Socket.IO settings
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

const MAX_PLAYERS = 5;
const ROUND_TIME = 60000; // 1 minute
const NEW_RULE_TIME = 300000; // 5 minutes
const GAME_OVER_POINTS = 0;
const INITIAL_SCORE = 10;

class Game {
  constructor() {
    this.players = new Map();
    this.roundInProgress = false;
    this.currentRound = 0;
    this.roundTime = ROUND_TIME;
    this.eliminatedPlayers = 0;
    this.lastEliminatedCount = 0;
    this.lastWinner = null;
    this.gameStarted = false;
  }

  isUsernameTaken(username) {
    return Array.from(this.players.values()).some(player => 
      player.name.toLowerCase() === username.toLowerCase()
    );
  }

  addPlayer(socketId, playerName) {
    if (this.gameStarted) {
      return { success: false, message: 'Game has already started' };
    }
    if (this.players.size >= MAX_PLAYERS) {
      return { success: false, message: 'Game is full' };
    }
    if (this.isUsernameTaken(playerName)) {
      return { success: false, message: 'Username already taken' };
    }
    this.players.set(socketId, {
      name: playerName,
      score: INITIAL_SCORE,
      number: null,
      ready: false,
      consecutiveWins: 0
    });
    return { success: true };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  setPlayerNumber(socketId, number) {
    const player = this.players.get(socketId);
    if (player) {
      player.number = number;
    }
  }

  calculateWinner() {
    const numbers = Array.from(this.players.values())
      .filter(p => p.number !== null)
      .map(p => p.number);

    if (numbers.length === 0) return null;

    const average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const target = average * 0.8;

    // Check for duplicate numbers (4 players rule)
    if (this.players.size === 4) {
      const duplicates = numbers.filter((num, index) => numbers.indexOf(num) !== index);
      if (duplicates.length > 0) {
        // All players who chose duplicate numbers lose a point
        this.players.forEach((player, socketId) => {
          if (duplicates.includes(player.number)) {
            player.score = Math.max(0, player.score - 1);
          }
        });
        // Find the winner among non-duplicate numbers
        let closestPlayer = null;
        let minDiff = Infinity;
        this.players.forEach((player, socketId) => {
          if (player.number !== null && !duplicates.includes(player.number)) {
            const diff = Math.abs(player.number - target);
            if (diff < minDiff) {
              minDiff = diff;
              closestPlayer = { socketId, player };
            }
          }
        });
        if (closestPlayer) {
          closestPlayer.player.consecutiveWins++;
          this.lastWinner = closestPlayer.socketId;
        }
        return closestPlayer ? closestPlayer.socketId : null;
      }
    }

    // Check for exact match (3 players rule)
    if (this.players.size === 3) {
      let exactMatchFound = false;
      this.players.forEach((player, socketId) => {
        if (player.number === target) {
          exactMatchFound = true;
          // Double penalty for losers
          this.players.forEach((p, sid) => {
            if (sid !== socketId) {
              p.score = Math.max(0, p.score - 2);
            }
          });
          player.consecutiveWins++;
          this.lastWinner = socketId;
        }
      });
      if (exactMatchFound) {
        return Array.from(this.players.entries())
          .find(([_, player]) => player.number === target)[0];
      }
    }

    // Special rule for 2 players (endgame)
    if (this.players.size === 2) {
      const players = Array.from(this.players.entries());
      const [player1, player2] = players;
      
      // If one player chooses 0 and the other 100, it's an instant win
      if ((player1[1].number === 0 && player2[1].number === 100) ||
          (player2[1].number === 0 && player1[1].number === 100)) {
        const winner = player1[1].number === 0 ? player2 : player1;
        const loser = player1[1].number === 0 ? player1 : player2;
        
        // Loser loses all remaining points
        loser[1].score = 0;
        winner[1].consecutiveWins++;
        this.lastWinner = winner[0];
        return winner[0];
      }
    }

    // Normal round logic with duplicate number handling
    let closestPlayer = null;
    let minDiff = Infinity;
    let duplicateNumbers = new Set();

    // First pass: find duplicates
    this.players.forEach((player, socketId) => {
      if (player.number !== null) {
        const sameNumbers = Array.from(this.players.entries())
          .filter(([sid, p]) => sid !== socketId && p.number === player.number);
        if (sameNumbers.length > 0) {
          duplicateNumbers.add(socketId);
          sameNumbers.forEach(([sid, _]) => duplicateNumbers.add(sid));
        }
      }
    });

    // Second pass: find closest non-duplicate player
    this.players.forEach((player, socketId) => {
      if (player.number !== null && !duplicateNumbers.has(socketId)) {
        const diff = Math.abs(player.number - target);
        if (diff < minDiff) {
          minDiff = diff;
          closestPlayer = { socketId, player };
        }
      }
    });

    // Update scores
    if (closestPlayer) {
      this.players.forEach((player, socketId) => {
        if (socketId !== closestPlayer.socketId) {
          if (duplicateNumbers.has(socketId)) {
            // Players with duplicate numbers lose 2 points
            player.score = Math.max(0, player.score - 2);
          } else {
            // Normal loss
            player.score = Math.max(0, player.score - 1);
          }
          player.consecutiveWins = 0;
        } else {
          player.consecutiveWins++;
          this.lastWinner = socketId;
        }
      });
    } else {
      // If no valid winner (all players chose duplicates), all players lose 2 points
      this.players.forEach(player => {
        player.score = Math.max(0, player.score - 2);
        player.consecutiveWins = 0;
      });
      return null;
    }

    return closestPlayer ? closestPlayer.socketId : null;
  }

  resetRound() {
    this.players.forEach(player => {
      player.number = null;
      player.ready = false;
    });
    this.roundInProgress = false;
  }

  checkGameOver() {
    const eliminated = Array.from(this.players.entries())
      .filter(([_, player]) => player.score <= GAME_OVER_POINTS);
    
    eliminated.forEach(([socketId, _]) => {
      this.players.delete(socketId);
    });

    const newEliminatedCount = MAX_PLAYERS - this.players.size;
    const newRuleIntroduced = newEliminatedCount > this.lastEliminatedCount;
    this.lastEliminatedCount = newEliminatedCount;
    this.eliminatedPlayers = newEliminatedCount;

    return {
      eliminated: eliminated.map(([socketId, _]) => socketId),
      newRuleIntroduced,
      gameOver: this.players.size <= 1 // Game is over only when 1 or fewer players remain
    };
  }

  shouldUseNewRuleTime() {
    return this.currentRound === 1 || this.lastEliminatedCount < this.eliminatedPlayers;
  }
}

const game = new Game();

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (playerName) => {
    const result = game.addPlayer(socket.id, playerName);
    if (result.success) {
      socket.emit('joinSuccess');
      io.emit('playerList', Array.from(game.players.entries()));
    } else {
      socket.emit('joinError', result.message);
    }
  });

  socket.on('ready', () => {
    const player = game.players.get(socket.id);
    if (player) {
      player.ready = true;
      const allReady = Array.from(game.players.values()).every(p => p.ready);
      if (allReady && game.players.size >= 2) {
        game.gameStarted = true;
        game.roundInProgress = true;
        game.currentRound++;
        game.roundTime = game.shouldUseNewRuleTime() ? NEW_RULE_TIME : ROUND_TIME;
        io.emit('roundStart', {
          round: game.currentRound,
          time: game.roundTime,
          players: game.players.size,
          newRuleIntroduced: game.shouldUseNewRuleTime()
        });
      }
    }
  });

  socket.on('submitNumber', (number) => {
    if (game.roundInProgress) {
      game.setPlayerNumber(socket.id, number);
      const allSubmitted = Array.from(game.players.values()).every(p => p.number !== null);
      
      if (allSubmitted) {
        const winner = game.calculateWinner();
        const { eliminated, newRuleIntroduced, gameOver } = game.checkGameOver();
        
        io.emit('roundEnd', {
          winner,
          gameOverPlayers: eliminated,
          players: Array.from(game.players.entries()),
          round: game.currentRound,
          newRuleIntroduced,
          gameOver
        });

        if (gameOver) {
          const winner = Array.from(game.players.entries())[0];
          io.emit('gameOver', {
            winner: winner ? { id: winner[0], name: winner[1].name } : null
          });
        }

        game.resetRound();
      }
    }
  });

  socket.on('disconnect', () => {
    game.removePlayer(socket.id);
    io.emit('playerList', Array.from(game.players.entries()));
  });
});

// Optimize server settings
server.maxConnections = 100;
server.timeout = 120000;

// Serve static files from the React app
app.use(express.static('public'));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For Vercel serverless deployment
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
} 