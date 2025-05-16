import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
} from '@mui/material';
import './App.css';

// Socket.io connection
const getServerUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // For Railway deployment, we'll use the same origin
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

const socket = io(getServerUrl(), {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('joining'); // joining, waiting, playing, results, gameOver
  const [players, setPlayers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundInfo, setRoundInfo] = useState(null);
  const [error, setError] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Generate cards array (0-100)
  const cards = Array.from({ length: 101 }, (_, i) => i);

  useEffect(() => {
    socket.on('joinSuccess', () => {
      setGameState('waiting');
    });

    socket.on('joinError', (message) => {
      setError(message);
    });

    socket.on('playerList', (playerList) => {
      setPlayers(playerList);
    });

    socket.on('roundStart', (info) => {
      setGameState('playing');
      setRoundInfo(info);
      setTimeLeft(info.time / 1000);
      setSelectedNumber(null);
      setHasSubmitted(false);
      setRoundResults(null);
      setIsReady(false);
    });

    socket.on('roundEnd', (data) => {
      setGameState('results');
      setRoundInfo(null);
      setRoundResults(data);
      setPlayers(data.players);
      if (data.gameOverPlayers.includes(socket.id)) {
        setGameOver(true);
      }
    });

    socket.on('gameOver', (data) => {
      setGameState('gameOver');
      if (data.winner) {
        setRoundResults(prev => ({
          ...prev,
          winner: data.winner.id,
          winnerName: data.winner.name
        }));
      }
    });

    return () => {
      socket.off('joinSuccess');
      socket.off('joinError');
      socket.off('playerList');
      socket.off('roundStart');
      socket.off('roundEnd');
      socket.off('gameOver');
    };
  }, []);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      socket.emit('join', playerName.trim());
    }
  };

  const handleReady = () => {
    socket.emit('ready');
    setIsReady(true);
  };

  const handleCardSelect = (number) => {
    if (!hasSubmitted && gameState === 'playing') {
      setSelectedNumber(number);
    }
  };

  const handleSubmitNumber = () => {
    if (selectedNumber !== null) {
      socket.emit('submitNumber', selectedNumber);
      setHasSubmitted(true);
    }
  };

  const renderScoreboard = () => {
    const sortedPlayers = [...players].sort((a, b) => b[1].score - a[1].score);
    
    return (
      <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Player</TableCell>
              <TableCell align="right">Score</TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlayers.map(([id, player], index) => (
              <TableRow 
                key={id}
                sx={{ 
                  bgcolor: id === socket.id ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell align="right">{player.score}</TableCell>
                <TableCell align="right">
                  {player.ready ? 'Ready' : 'Waiting'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderRoundInfo = () => {
    if (!roundInfo) return null;

    return (
      <Alert severity="info" className="round-info">
        <Typography variant="h6">
          Round {roundInfo.round} - {roundInfo.players} Players Remaining
        </Typography>
        {roundInfo.newRuleIntroduced && (
          <Typography>
            New rule introduced! You have 5 minutes to read and understand the rules.
          </Typography>
        )}
      </Alert>
    );
  };

  const renderRules = () => {
    const playerCount = players.length;
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Current Rules:</Typography>
        <Typography>• All players start with 10 points</Typography>
        <Typography>• All players select a number between 0 and 100</Typography>
        <Typography>• Average × 0.8 = Target number</Typography>
        <Typography>• Closest to target wins, others lose 1 point</Typography>
        <Typography color="error">• Choosing the same number as another player results in -2 points</Typography>
        {playerCount === 4 && (
          <Typography color="error">• Duplicate numbers lose 1 point!</Typography>
        )}
        {playerCount === 3 && (
          <Typography color="error">• Exact match doubles loser penalty!</Typography>
        )}
        {playerCount === 2 && (
          <Typography color="error">• If one player chooses 0 and the other 100, it's an instant win!</Typography>
        )}
        <Typography color="error" sx={{ mt: 1 }}>
          • Game Over at 0 points (player is eliminated)
        </Typography>
        <Typography color="primary" sx={{ mt: 1 }}>
          • Last player standing wins the game!
        </Typography>
      </Box>
    );
  };

  const renderCardGrid = () => {
    return (
      <Grid container spacing={1} sx={{ mt: 2 }}>
        {cards.map((number) => (
          <Grid item xs={2} sm={1.5} md={1} key={number}>
            <Card
              sx={{
                cursor: hasSubmitted ? 'default' : 'pointer',
                bgcolor: selectedNumber === number ? '#4caf50' : 'white',
                color: selectedNumber === number ? 'white' : 'inherit',
                '&:hover': {
                  bgcolor: hasSubmitted ? 'inherit' : selectedNumber === number ? '#4caf50' : '#f5f5f5',
                },
                transition: 'all 0.3s ease',
                transform: selectedNumber === number ? 'scale(1.1)' : 'scale(1)',
                boxShadow: selectedNumber === number 
                  ? '0 0 15px rgba(76, 175, 80, 0.5), 0 0 5px rgba(76, 175, 80, 0.3)' 
                  : '0 2px 4px rgba(0,0,0,0.1)',
                border: selectedNumber === number 
                  ? '3px solid #2e7d32' 
                  : '1px solid rgba(0,0,0,0.1)',
                position: 'relative',
                '&::after': selectedNumber === number ? {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  border: '2px solid #4caf50',
                  borderRadius: '4px',
                  animation: 'pulse 1.5s infinite',
                } : {},
                '@keyframes pulse': {
                  '0%': {
                    boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.4)',
                  },
                  '70%': {
                    boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
                  },
                  '100%': {
                    boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
                  },
                },
              }}
              onClick={() => handleCardSelect(number)}
            >
              <CardContent 
                sx={{ 
                  p: 1, 
                  textAlign: 'center',
                  fontWeight: selectedNumber === number ? 'bold' : 'normal',
                  fontSize: selectedNumber === number ? '1.2rem' : '1rem',
                }}
              >
                <Typography variant="h6">{number}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderResults = () => {
    if (!roundResults) return null;

    const numbers = roundResults.players.map(([_, player]) => player.number);
    const average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const target = average * 0.8;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Round Results:</Typography>
        <Typography>Average: {average.toFixed(2)}</Typography>
        <Typography>Target (Average × 0.8): {target.toFixed(2)}</Typography>
        <Typography variant="h6" sx={{ mt: 2 }}>Player Numbers:</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {roundResults.players.map(([id, player]) => (
            <Grid item xs={12} sm={6} key={id}>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: id === roundResults.winner ? '#4caf50' : '#f44336',
                  color: 'white'
                }}
              >
                <Typography>
                  {player.name}: {player.number}
                </Typography>
                <Typography>
                  Score: {player.score} points
                  {id === roundResults.winner && ' - Winner!'}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {roundResults.newRuleIntroduced && (
          <Alert severity="warning" className="new-rule-alert" sx={{ mt: 2 }}>
            A new rule has been introduced! Check the rules section above.
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={handleReady}
          disabled={isReady}
          color={isReady ? "success" : "primary"}
          sx={{ mt: 2 }}
        >
          {isReady ? "Ready for Next Round" : "Click to Ready for Next Round"}
        </Button>
      </Box>
    );
  };

  if (gameState === 'gameOver') {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="primary" gutterBottom>
            Game Over!
          </Typography>
          {roundResults?.winnerName ? (
            <>
              <Typography variant="h5" gutterBottom>
                {roundResults.winnerName} wins the game!
              </Typography>
              <Typography>
                Congratulations to the last player standing!
              </Typography>
            </>
          ) : (
            <Typography>
              The game has ended.
            </Typography>
          )}
        </Paper>
      </Container>
    );
  }

  if (gameOver) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="error" gutterBottom>
            You've Been Eliminated!
          </Typography>
          <Typography>
            You have reached 0 points and have been eliminated from the game.
          </Typography>
          <Typography sx={{ mt: 2 }}>
            You can still watch the game continue until a winner is determined.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {gameState === 'joining' && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Number Wars
          </Typography>
          <form onSubmit={handleJoin}>
            <TextField
              fullWidth
              label="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              sx={{ mb: 2 }}
              error={error.includes('Username')}
              helperText={error.includes('Username') ? error : ''}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!playerName.trim()}
            >
              Join Game
            </Button>
          </form>
        </Paper>
      )}

      {gameState === 'waiting' && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Number Wars - Waiting Room
          </Typography>
          {renderScoreboard()}
          {renderRules()}
          <Button
            variant="contained"
            fullWidth
            onClick={handleReady}
            disabled={isReady}
            color={isReady ? "success" : "primary"}
            sx={{ mt: 2 }}
          >
            {isReady ? "Waiting for Other Players..." : "Click to Ready"}
          </Button>
        </Paper>
      )}

      {gameState === 'playing' && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Number Wars - Round {roundInfo?.round}
          </Typography>
          {renderRoundInfo()}
          {renderScoreboard()}
          <Typography variant="h6" gutterBottom>
            Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select a Card:
            </Typography>
            {renderCardGrid()}
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmitNumber}
            disabled={selectedNumber === null || hasSubmitted}
            color={hasSubmitted ? "success" : "primary"}
            sx={{ mt: 3 }}
          >
            {hasSubmitted ? "Card Submitted" : "Submit Card"}
          </Button>

          {renderRules()}
        </Paper>
      )}

      {gameState === 'results' && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Number Wars - Round Results
          </Typography>
          {renderScoreboard()}
          {renderResults()}
        </Paper>
      )}
    </Container>
  );
}

export default App; 