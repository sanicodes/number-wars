import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import './App.css';

const getServerUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

const socket = io(getServerUrl(), {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const STATUS_COPY = {
  joining: 'Enter the lobby and wait for everyone to get ready.',
  waiting: 'You are in the lobby. Review the rules and lock in when ready.',
  playing: 'Pick a number strategically. Closest to 80% of the average wins.',
  results: 'Round finished. Review the outcome and get ready for the next one.',
  gameOver: 'The match is complete.',
};

function App() {
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('joining');
  const [players, setPlayers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundInfo, setRoundInfo] = useState(null);
  const [error, setError] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const cards = Array.from({ length: 101 }, (_, i) => i);
  const playerCount = players.length;
  const sortedPlayers = [...players].sort((a, b) => b[1].score - a[1].score);
  const readyCount = players.filter(([_, player]) => player.ready).length;
  const aliveCount = players.filter(([_, player]) => player.score > 0).length;

  useEffect(() => {
    socket.on('joinSuccess', () => {
      setError('');
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
        setRoundResults((prev) => ({
          ...prev,
          winner: data.winner.id,
          winnerName: data.winner.name,
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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const getStatusTone = () => {
    if (gameState === 'playing') return 'success';
    if (gameState === 'results') return 'warning';
    return 'info';
  };

  const renderHero = () => (
    <Paper className="hero-panel" elevation={0}>
      <Stack spacing={2}>
        <Box className="hero-topline">
          <Chip label="Multiplayer strategy game" className="hero-chip" />
          <Chip label={`${playerCount}/5 players`} variant="outlined" className="hero-chip-muted" />
        </Box>
        <Typography variant="h2" className="hero-title">
          Number Wars
        </Typography>
        <Typography variant="body1" className="hero-subtitle">
          Clean, fast, competitive. Pick the number closest to 80% of the average and survive longer than everyone else.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box className="stat-card">
              <Typography className="stat-label">Players ready</Typography>
              <Typography className="stat-value">{readyCount}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box className="stat-card">
              <Typography className="stat-label">Players alive</Typography>
              <Typography className="stat-value">{aliveCount}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box className="stat-card">
              <Typography className="stat-label">Round timer</Typography>
              <Typography className="stat-value">{gameState === 'playing' ? formatTime(timeLeft) : '--:--'}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );

  const renderScoreboard = () => (
    <Paper className="section-panel" elevation={0}>
      <Box className="section-header">
        <Box>
          <Typography variant="h5">Leaderboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Live rankings based on remaining score.
          </Typography>
        </Box>
        <Chip label={`${playerCount} active`} className="soft-chip" />
      </Box>
      <TableContainer>
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
            {sortedPlayers.map(([id, player], index) => {
              const isCurrentPlayer = id === socket.id;
              return (
                <TableRow key={id} className={isCurrentPlayer ? 'table-row-current' : ''}>
                  <TableCell>
                    <Box className="rank-badge">#{index + 1}</Box>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box className="player-avatar">{player.name?.charAt(0)?.toUpperCase() || '?'}</Box>
                      <Box>
                        <Typography className="player-name">{player.name}</Typography>
                        {isCurrentPlayer && <Typography className="player-self">You</Typography>}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography className="score-value">{player.score}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={player.ready ? 'Ready' : 'Waiting'}
                      color={player.ready ? 'success' : 'default'}
                      variant={player.ready ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderRules = () => (
    <Paper className="section-panel" elevation={0}>
      <Box className="section-header">
        <Box>
          <Typography variant="h5">Rules</Typography>
          <Typography variant="body2" color="text.secondary">
            The rule set changes as the match narrows down.
          </Typography>
        </Box>
        <Chip label={`${playerCount || 0} players`} className="soft-chip" />
      </Box>
      <Stack spacing={1.25} className="rules-list">
        <Typography>All players start with 10 points.</Typography>
        <Typography>Pick any number from 0 to 100.</Typography>
        <Typography>Target number = average of all picks × 0.8.</Typography>
        <Typography>Closest valid pick wins the round.</Typography>
        <Typography className="rule-accent">Matching someone else's number costs 2 points.</Typography>
        {playerCount === 4 && (
          <Typography className="rule-accent">At 4 players: duplicates lose 1 point, then the best unique number wins.</Typography>
        )}
        {playerCount === 3 && (
          <Typography className="rule-accent">At 3 players: an exact target hit doubles the losers' penalty.</Typography>
        )}
        {playerCount === 2 && (
          <Typography className="rule-accent">At 2 players: 0 vs 100 triggers an instant win for 100.</Typography>
        )}
        <Typography>Hit 0 points and you're eliminated.</Typography>
        <Typography className="rule-win">Last player standing wins the game.</Typography>
      </Stack>
    </Paper>
  );

  const renderRoundInfo = () => {
    if (!roundInfo) return null;

    return (
      <Alert severity={getStatusTone()} className="round-banner">
        <Stack spacing={0.75}>
          <Typography variant="subtitle1" fontWeight={700}>
            Round {roundInfo.round} is live · {roundInfo.players} players remaining
          </Typography>
          <Typography variant="body2">
            {roundInfo.newRuleIntroduced
              ? 'A new rule is active this round. Take a second to read before you commit your number.'
              : 'Pick carefully. Once you submit, your number is locked in.'}
          </Typography>
        </Stack>
      </Alert>
    );
  };

  const renderCardGrid = () => (
    <Paper className="section-panel" elevation={0}>
      <Box className="section-header">
        <Box>
          <Typography variant="h5">Choose your number</Typography>
          <Typography variant="body2" color="text.secondary">
            {hasSubmitted ? 'Your pick has been submitted.' : 'Tap a card to select your play.'}
          </Typography>
        </Box>
        <Chip
          label={selectedNumber !== null ? `Selected ${selectedNumber}` : 'No selection'}
          className={selectedNumber !== null ? 'soft-chip selected' : 'soft-chip'}
        />
      </Box>
      <Box className="number-grid">
        {cards.map((number) => {
          const isSelected = selectedNumber === number;
          return (
            <button
              type="button"
              key={number}
              className={`number-card${isSelected ? ' selected' : ''}${hasSubmitted ? ' locked' : ''}`}
              onClick={() => handleCardSelect(number)}
              disabled={hasSubmitted}
            >
              <span>{number}</span>
            </button>
          );
        })}
      </Box>
    </Paper>
  );

  const renderResults = () => {
    if (!roundResults) return null;

    const numbers = roundResults.players.map(([_, player]) => player.number);
    const average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const target = average * 0.8;

    return (
      <Stack spacing={3}>
        <Paper className="section-panel highlight-panel" elevation={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box className="result-stat">
                <Typography className="stat-label">Average</Typography>
                <Typography className="result-value">{average.toFixed(2)}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box className="result-stat">
                <Typography className="stat-label">Target</Typography>
                <Typography className="result-value">{target.toFixed(2)}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box className="result-stat">
                <Typography className="stat-label">Round winner</Typography>
                <Typography className="result-value">
                  {roundResults.winnerName || roundResults.players.find(([id]) => id === roundResults.winner)?.[1]?.name || 'No winner'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          {roundResults.players.map(([id, player]) => {
            const isWinner = id === roundResults.winner;
            return (
              <Grid item xs={12} md={6} key={id}>
                <Paper className={`result-card${isWinner ? ' winner' : ''}`} elevation={0}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6">{player.name}</Typography>
                    <Chip label={isWinner ? 'Winner' : 'Round summary'} color={isWinner ? 'success' : 'default'} />
                  </Stack>
                  <Typography className="result-line">Number picked: <strong>{player.number}</strong></Typography>
                  <Typography className="result-line">Score remaining: <strong>{player.score}</strong></Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {roundResults.newRuleIntroduced && (
          <Alert severity="warning" className="round-banner">
            New rule introduced for the next stage. Double-check the rules panel before continuing.
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleReady}
          disabled={isReady}
        >
          {isReady ? 'Ready locked in' : 'Ready for next round'}
        </Button>
      </Stack>
    );
  };

  if (gameState === 'gameOver') {
    return (
      <Container maxWidth="sm" className="app-shell">
        <Paper className="center-panel" elevation={0}>
          <Chip label="Match complete" className="soft-chip" />
          <Typography variant="h3" sx={{ mt: 2, mb: 1 }}>Game Over</Typography>
          {roundResults?.winnerName ? (
            <>
              <Typography variant="h5">{roundResults.winnerName} wins the match.</Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                Clean finish. Everyone else has been eliminated.
              </Typography>
            </>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              The match has ended.
            </Typography>
          )}
        </Paper>
      </Container>
    );
  }

  if (gameOver) {
    return (
      <Container maxWidth="sm" className="app-shell">
        <Paper className="center-panel" elevation={0}>
          <Chip label="Eliminated" color="error" />
          <Typography variant="h3" sx={{ mt: 2, mb: 1 }}>You are out</Typography>
          <Typography color="text.secondary">
            Your score reached 0, so you have been eliminated. You can still watch the rest of the match play out.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className="app-shell">
      <Stack spacing={3}>
        {renderHero()}

        {error && <Alert severity="error">{error}</Alert>}

        <Paper className="status-strip" elevation={0}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography variant="overline" className="status-label">Current state</Typography>
              <Typography variant="h6" className="status-title">{gameState.charAt(0).toUpperCase() + gameState.slice(1)}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" className="status-copy">
              {STATUS_COPY[gameState]}
            </Typography>
          </Stack>
        </Paper>

        {gameState === 'joining' && (
          <Paper className="section-panel join-panel" elevation={0}>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Stack spacing={1.5}>
                  <Typography variant="h4">Join the lobby</Typography>
                  <Typography color="text.secondary">
                    Set your player name, enter the room, and wait for everyone to ready up.
                  </Typography>
                  <Box className="mini-feature-grid">
                    <Box className="mini-feature-card">
                      <Typography className="mini-title">Fast rounds</Typography>
                      <Typography className="mini-copy">Simple actions, strategic outcomes.</Typography>
                    </Box>
                    <Box className="mini-feature-card">
                      <Typography className="mini-title">Dynamic rules</Typography>
                      <Typography className="mini-copy">The game shifts as players get eliminated.</Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <form onSubmit={handleJoin}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Player name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      error={error.includes('Username')}
                      helperText={error.includes('Username') ? error : 'Use a unique name visible to everyone in the match.'}
                    />
                    <Button type="submit" variant="contained" size="large" disabled={!playerName.trim()}>
                      Join game
                    </Button>
                  </Stack>
                </form>
              </Grid>
            </Grid>
          </Paper>
        )}

        {(gameState === 'waiting' || gameState === 'playing' || gameState === 'results') && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                {gameState === 'playing' && renderRoundInfo()}
                {gameState === 'playing' && (
                  <Paper className="timer-panel" elevation={0}>
                    <Typography className="timer-label">Time remaining</Typography>
                    <Typography className="timer-value">{formatTime(timeLeft)}</Typography>
                    <Typography color="text.secondary">Lock in your number before the round closes.</Typography>
                  </Paper>
                )}
                {gameState === 'playing' && renderCardGrid()}
                {gameState === 'results' && renderResults()}
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                {renderScoreboard()}
                {renderRules()}
                {gameState === 'waiting' && (
                  <Paper className="section-panel" elevation={0}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Ready check</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      Start when everyone is in and prepared.
                    </Typography>
                    <Button variant="contained" fullWidth size="large" onClick={handleReady} disabled={isReady}>
                      {isReady ? 'Waiting for other players...' : 'I am ready'}
                    </Button>
                  </Paper>
                )}
                {gameState === 'playing' && (
                  <Paper className="section-panel" elevation={0}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Submit move</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {selectedNumber !== null
                        ? `Selected number: ${selectedNumber}`
                        : 'Choose a number from the grid first.'}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={handleSubmitNumber}
                      disabled={selectedNumber === null || hasSubmitted}
                    >
                      {hasSubmitted ? 'Number submitted' : 'Submit number'}
                    </Button>
                  </Paper>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}

export default App;
