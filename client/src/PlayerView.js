import React, { useState, useEffect, useRef } from 'react';
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
import socket from './socket';
import { getCharacter } from './characters';
import PlayerTile from './components/PlayerTile';
import CharacterPicker from './components/CharacterPicker';
import CenterStage from './components/CenterStage';

const STATUS_COPY = {
  joining: 'Choose a callsign and enter the arena.',
  waiting: 'Lobby is open. Pick your character and ready up.',
  playing: 'Pick your number. Closest to 80% of the average takes the round.',
  results: 'Round complete. Study the spread before the next move.',
  gameOver: 'Final ranking locked.',
};

export default function PlayerView() {
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
  const [nextRoundCountdown, setNextRoundCountdown] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [myCharacter, setMyCharacter] = useState(null);
  const [submittedNonces, setSubmittedNonces] = useState({});
  const [defeatedIds, setDefeatedIds] = useState([]);
  const [eliminatedIds, setEliminatedIds] = useState([]);
  const nonceCounter = useRef(0);

  const cards = Array.from({ length: 101 }, (_, i) => i);
  const playerCount = players.length;
  const sortedPlayers = [...players].sort((a, b) => b[1].score - a[1].score);
  const readyCount = players.filter(([_, player]) => player.ready).length;
  const aliveCount = players.filter(([_, player]) => player.score > 0).length;
  const currentPlayer = players.find(([id]) => id === socket.id)?.[1];
  const phaseLabel = gameState.charAt(0).toUpperCase() + gameState.slice(1);
  const takenCharacterIds = players
    .map(([_, p]) => p.character)
    .filter(Boolean);

  useEffect(() => {
    const onJoinSuccess = (data) => {
      setError('');
      setGameState('waiting');
      if (data?.character) setMyCharacter(data.character);
    };
    const onJoinError = (message) => setError(message);
    const onPlayerList = (list) => setPlayers(list);
    const onCharacterError = (msg) => setError(msg);

    const onRoundStart = (info) => {
      setGameState('playing');
      setRoundInfo(info);
      setTimeLeft(info.time / 1000);
      setSelectedNumber(null);
      setHasSubmitted(false);
      setRoundResults(null);
      setIsReady(false);
      setNextRoundCountdown(null);
      setSubmittedNonces({});
      setDefeatedIds([]);
      setEliminatedIds([]);
    };

    const onRoundEnd = (data) => {
      setGameState('results');
      setRoundInfo(null);
      setRoundResults(data);
      setPlayers(data.players);
      if (data.gameOverPlayers.includes(socket.id)) setGameOver(true);
      if (data.nextRoundIn) setNextRoundCountdown(data.nextRoundIn / 1000);

      const resultPlayers = data.roundPlayers || data.players;
      const defeated = data.defeatedPlayers || resultPlayers
        .map(([id, p]) => (p.number !== null && id !== data.winner ? id : null))
        .filter(Boolean);
      setDefeatedIds(defeated);
      setEliminatedIds(data.gameOverPlayers || []);
    };

    const onGameOver = (data) => {
      setGameState('gameOver');
      if (data.winner) {
        setRoundResults((prev) => ({
          ...prev,
          winner: data.winner.id,
          winnerName: data.winner.name,
        }));
      }
      if (data.rankings) setRankings(data.rankings);
    };

    const onPlayerSubmitted = ({ id }) => {
      nonceCounter.current += 1;
      const nonce = nonceCounter.current;
      setSubmittedNonces((prev) => ({ ...prev, [id]: nonce }));
    };

    socket.on('joinSuccess', onJoinSuccess);
    socket.on('joinError', onJoinError);
    socket.on('playerList', onPlayerList);
    socket.on('characterError', onCharacterError);
    socket.on('roundStart', onRoundStart);
    socket.on('roundEnd', onRoundEnd);
    socket.on('gameOver', onGameOver);
    socket.on('playerSubmitted', onPlayerSubmitted);

    return () => {
      socket.off('joinSuccess', onJoinSuccess);
      socket.off('joinError', onJoinError);
      socket.off('playerList', onPlayerList);
      socket.off('characterError', onCharacterError);
      socket.off('roundStart', onRoundStart);
      socket.off('roundEnd', onRoundEnd);
      socket.off('gameOver', onGameOver);
      socket.off('playerSubmitted', onPlayerSubmitted);
    };
  }, []);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    let timer;
    if (gameState === 'results' && nextRoundCountdown > 0) {
      timer = setInterval(() => setNextRoundCountdown((p) => Math.max(0, p - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, nextRoundCountdown]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (playerName.trim()) socket.emit('join', playerName.trim());
  };

  const handleSelectCharacter = (id) => {
    setMyCharacter(id);
    socket.emit('selectCharacter', id);
  };

  const handleReady = () => {
    socket.emit('ready');
    setIsReady(true);
  };

  const handleCardSelect = (number) => {
    if (!hasSubmitted && gameState === 'playing') setSelectedNumber(number);
  };

  const handleSubmitNumber = () => {
    if (selectedNumber !== null) {
      socket.emit('submitNumber', selectedNumber);
      setHasSubmitted(true);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const r = seconds % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const getStatusTone = () => {
    if (gameState === 'playing') return 'success';
    if (gameState === 'results') return 'warning';
    return 'info';
  };

  const renderHero = () => {
    const myChar = myCharacter ? getCharacter(myCharacter) : null;
    const stagePlayers =
      gameState === 'results' && roundResults
        ? roundResults.roundPlayers || roundResults.players
        : players;
    const resultPlayers = roundResults?.roundPlayers || roundResults?.players || [];
    return (
      <Paper className="hero-panel" elevation={0}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={7}>
            <Stack spacing={2.5} className="hero-copy">
              <Box className="hero-topline">
                <Chip label="Live Strategy Arena" className="hero-chip" />
                <Chip label={`${playerCount}/10 seats filled`} variant="outlined" className="hero-chip-muted" />
                {myChar && (
                  <Chip
                    label={`Playing as ${myChar.name} ${myChar.glyph}`}
                    className="hero-chip-muted"
                  />
                )}
              </Box>
              <Box>
                <Typography variant="h2" className="hero-title">Number Wars</Typography>
                <Typography variant="body1" className="hero-subtitle">
                  Read the table, choose a number, and survive the target. Every round rewards the player closest to 80% of the average.
                </Typography>
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <Box className="stat-card">
                    <Typography className="stat-label">Ready</Typography>
                    <Typography className="stat-value">{readyCount}/{playerCount || 0}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box className="stat-card">
                    <Typography className="stat-label">Alive</Typography>
                    <Typography className="stat-value">{aliveCount}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box className="stat-card">
                    <Typography className="stat-label">Clock</Typography>
                    <Typography className="stat-value">{gameState === 'playing' ? formatTime(timeLeft) : '--:--'}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box className="hero-stage">
              <CenterStage
                players={stagePlayers}
                submittedNonces={submittedNonces}
                targetValue={roundResults ? (resultPlayers.reduce((sum, [_, p]) => sum + (p.number ?? 0), 0) / Math.max(resultPlayers.length, 1)) * 0.8 : null}
                isReveal={gameState === 'results'}
                winnerId={roundResults?.winner}
                defeatedIds={defeatedIds}
                eliminatedIds={eliminatedIds}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderTileGrid = () => {
    return (
      <Paper className="section-panel" elevation={0}>
        <Box className="section-header">
          <Box>
            <Typography variant="h5">Combatants</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Last one standing each round wins.
            </Typography>
          </Box>
          <Chip label={`${players.length} active`} className="soft-chip" />
        </Box>
        {players.length === 0 ? (
          <Box className="empty-state">
            <Typography className="empty-title">Lobby is empty</Typography>
            <Typography className="empty-copy">Once you join, your tile and animation appear here.</Typography>
          </Box>
        ) : (
          <Box className="player-tile-grid">
            {players.map(([id, p]) => (
              <PlayerTile
                key={id}
                player={p}
                isSelf={id === socket.id}
                isWinner={roundResults?.winner === id}
                isDefeated={defeatedIds.includes(id)}
                isJustEliminated={eliminatedIds.includes(id)}
                submittedNonce={submittedNonces[id] || 0}
              />
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  const renderScoreboard = () => (
    <Paper className="section-panel" elevation={0}>
      <Box className="section-header">
        <Box>
          <Typography variant="h5">Leaderboard</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Live rankings</Typography>
        </Box>
        <Chip label={`${playerCount} active`} className="soft-chip" />
      </Box>
      {sortedPlayers.length === 0 ? (
        <Box className="empty-state">
          <Typography className="empty-title">No players yet</Typography>
          <Typography className="empty-copy">The first player to join opens the lobby.</Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
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
                const character = getCharacter(player.character);
                return (
                  <TableRow key={id} className={isCurrentPlayer ? 'table-row-current' : ''}>
                    <TableCell><Box className="rank-badge">#{index + 1}</Box></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box className="player-avatar" style={{ background: `linear-gradient(135deg, ${character.color}, ${character.accent})` }}>
                          {character.glyph}
                        </Box>
                        <Box>
                          <Typography className="player-name">{player.name}</Typography>
                          {isCurrentPlayer && <Typography className="player-self">you</Typography>}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right"><Typography className="score-value">{player.score}</Typography></TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={player.score <= 0 ? 'Out' : player.ready ? 'Ready' : 'Idle'}
                        color={player.score <= 0 ? 'error' : player.ready ? 'success' : 'default'}
                        variant={player.ready ? 'filled' : 'outlined'}
                        sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', height: 24 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );

  const renderRules = () => (
    <Paper className="section-panel" elevation={0}>
      <Box className="section-header">
        <Box>
          <Typography variant="h5">Rules</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Adapts as players fall</Typography>
        </Box>
        <Chip label={`${playerCount || 0}p`} className="soft-chip" />
      </Box>
      <Stack spacing={0} className="rules-list">
        <Typography><span>01</span> Start with 10 points.</Typography>
        <Typography><span>02</span> Pick any number from 0 to 100.</Typography>
        <Typography><span>03</span> Target = average of all picks x 0.8</Typography>
        <Typography><span>04</span> Closest valid pick wins the round.</Typography>
        <Typography className="rule-accent"><span>05</span> Duplicate numbers cost 2 points instead of 1.</Typography>
        {playerCount === 4 && <Typography className="rule-accent"><span>4P</span> Duplicates lose 1pt, then best unique wins.</Typography>}
        {playerCount === 3 && <Typography className="rule-accent"><span>3P</span> Exact target hit doubles losers' penalty.</Typography>}
        {playerCount === 2 && <Typography className="rule-accent"><span>2P</span> 0 vs 100 = instant win for 100.</Typography>}
        <Typography><span>KO</span> 0 points = eliminated.</Typography>
        <Typography className="rule-win"><span>WIN</span> Last player standing wins.</Typography>
      </Stack>
    </Paper>
  );

  const renderRoundInfo = () => {
    if (!roundInfo) return null;
    return (
      <Alert severity={getStatusTone()} className="round-banner">
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'var(--font-display)' }}>
            Round {roundInfo.round} — {roundInfo.players} remaining
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {roundInfo.newRuleIntroduced
              ? 'New rule active. Check the rules panel before committing.'
              : 'Once submitted, your number is locked.'}
          </Typography>
        </Stack>
      </Alert>
    );
  };

  const renderCardGrid = () => (
    <Paper className="section-panel" elevation={0}>
      <Box className="section-header">
        <Box>
          <Typography variant="h5">Select Number</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {hasSubmitted ? 'Locked in.' : 'Tap to select.'}
          </Typography>
        </Box>
        <Chip
          label={selectedNumber !== null ? selectedNumber : '—'}
          className={selectedNumber !== null ? 'soft-chip selected' : 'soft-chip'}
          sx={{ fontFamily: 'var(--font-mono)', minWidth: 48 }}
        />
      </Box>
      <Box className="number-rail" aria-hidden="true">
        <span>0</span><Box /><span>100</span>
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
    const resultPlayers = roundResults.roundPlayers || roundResults.players;
    const numbers = resultPlayers.map(([_, p]) => p.number);
    const validNumbers = numbers.filter((n) => n !== null);
    const average = validNumbers.length ? validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length : 0;
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
                <Typography className="stat-label">Winner</Typography>
                <Typography className="result-value" sx={{ color: 'var(--green) !important' }}>
                  {roundResults.winnerName || resultPlayers.find(([id]) => id === roundResults.winner)?.[1]?.name || 'None'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          {resultPlayers.map(([id, player]) => {
            const isWinner = id === roundResults.winner;
            const character = getCharacter(player.character);
            return (
              <Grid item xs={12} md={6} key={id}>
                <Paper className={`result-card${isWinner ? ' winner' : ''}`} elevation={0}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box className="player-avatar" style={{ background: `linear-gradient(135deg, ${character.color}, ${character.accent})` }}>
                        {character.glyph}
                      </Box>
                      <Typography variant="h6">{player.name}</Typography>
                    </Stack>
                    <Chip
                      label={isWinner ? 'Winner' : 'Result'}
                      color={isWinner ? 'success' : 'default'}
                      size="small"
                      sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', height: 24 }}
                    />
                  </Stack>
                  <Typography className="result-line">Picked: <strong>{player.number !== null ? player.number : 'None (timed out)'}</strong></Typography>
                  <Typography className="result-line">Score: <strong>{player.score}</strong></Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {roundResults.newRuleIntroduced && (
          <Alert severity="warning" className="round-banner">New rule introduced. Check the rules panel.</Alert>
        )}

        <Stack spacing={1}>
          {nextRoundCountdown !== null && nextRoundCountdown > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Next round starts in {formatTime(nextRoundCountdown)}
            </Typography>
          )}
          {!gameOver && (
            <Button variant="contained" fullWidth size="large" onClick={handleReady} disabled={isReady}>
              {isReady ? 'Waiting for others to ready up...' : 'Ready — skip the wait'}
            </Button>
          )}
        </Stack>
      </Stack>
    );
  };

  if (gameState === 'gameOver') {
    return (
      <Container maxWidth="sm" className="app-shell">
        <Paper className="center-panel" elevation={0}>
          <Chip label="Match Complete" className="hero-chip" sx={{ mb: 2 }} />
          <Typography variant="h3" sx={{ mb: 1.5 }}>Game Over</Typography>
          {roundResults?.winnerName && (
            <Typography variant="h5" sx={{ color: 'var(--orange)', mb: 3 }}>
              {roundResults.winnerName} wins.
            </Typography>
          )}
          {rankings && rankings.length > 0 && (
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Place</TableCell>
                    <TableCell>Player</TableCell>
                    <TableCell align="right">Eliminated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankings.map((entry) => (
                    <TableRow key={entry.place}>
                      <TableCell><Box className="rank-badge">#{entry.place}</Box></TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: entry.place === 1 ? 700 : 400, color: entry.place === 1 ? 'var(--orange)' : 'var(--text)' }}>
                          {entry.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-soft)' }}>
                          {entry.place === 1 ? 'Winner' : `Round ${entry.round}`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className="app-shell">
      <Stack spacing={3}>
        {renderHero()}

        {error && <Alert severity="error">{error}</Alert>}

        {gameOver && (
          <Alert severity="error" className="round-banner">
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'var(--font-display)' }}>
              Eliminated — Spectating
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your score hit zero. Watch the rest of the match play out.
            </Typography>
          </Alert>
        )}

        <Paper className="status-strip" elevation={0}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1.5}>
            <Box>
              <Typography variant="overline" className="status-label">Phase</Typography>
              <Typography variant="h6" className="status-title">{phaseLabel}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" className="status-copy">
              {STATUS_COPY[gameState]}
            </Typography>
            {currentPlayer && (
              <Box className="player-status-card">
                <Typography className="stat-label">You</Typography>
                <Typography className="player-status-value">{currentPlayer.score} pts</Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {gameState === 'joining' && (
          <Paper className="section-panel join-panel" elevation={0}>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Stack spacing={1.5}>
                  <Typography variant="h4">Enter the Arena</Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Choose your name, join the lobby, then pick a character before readying up.
                  </Typography>
                  <Box className="mini-feature-grid">
                    <Box className="mini-feature-card">
                      <Typography className="mini-title">Fast rounds</Typography>
                      <Typography className="mini-copy">Simple actions, deep strategy.</Typography>
                    </Box>
                    <Box className="mini-feature-card">
                      <Typography className="mini-title">Cinematic finish</Typography>
                      <Typography className="mini-copy">Round winner eliminates the rest on stage.</Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <form onSubmit={handleJoin}>
                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="Player name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      error={error.includes('Username')}
                      helperText={error.includes('Username') ? error : 'Visible to all players in the match.'}
                      variant="outlined"
                    />
                    <Button type="submit" variant="contained" size="large" disabled={!playerName.trim()}>
                      Join Game
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
                {gameState === 'waiting' && !gameOver && (
                  <Paper className="section-panel" elevation={0}>
                    <Box className="section-header">
                      <Box>
                        <Typography variant="h5">Choose Character</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Pick the character you'll fight as.
                        </Typography>
                      </Box>
                      {myCharacter && (
                        <Chip
                          label={`${getCharacter(myCharacter).glyph} ${getCharacter(myCharacter).name}`}
                          className="soft-chip selected"
                        />
                      )}
                    </Box>
                    <CharacterPicker
                      selected={myCharacter}
                      takenIds={takenCharacterIds}
                      onSelect={handleSelectCharacter}
                    />
                  </Paper>
                )}
                {renderTileGrid()}
                {gameState === 'playing' && renderRoundInfo()}
                {gameState === 'playing' && (
                  <Paper className="timer-panel" elevation={0}>
                    <Typography className="timer-label">Time Remaining</Typography>
                    <Typography className="timer-value">{formatTime(timeLeft)}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {gameOver ? 'Spectating...' : 'Lock in before the round closes.'}
                    </Typography>
                  </Paper>
                )}
                {gameState === 'playing' && !gameOver && renderCardGrid()}
                {gameState === 'results' && renderResults()}
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                {renderScoreboard()}
                {renderRules()}
                {gameState === 'waiting' && !gameOver && (
                  <Paper className="section-panel" elevation={0}>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>Ready Check</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.88rem' }}>
                      All players must ready up to start.
                    </Typography>
                    <Button variant="contained" fullWidth size="large" onClick={handleReady} disabled={isReady}>
                      {isReady ? 'Waiting for opponents...' : 'Ready'}
                    </Button>
                  </Paper>
                )}
                {gameState === 'playing' && !gameOver && (
                  <Paper className="section-panel" elevation={0}>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>Confirm Move</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
                      {selectedNumber !== null ? `Selected: ${selectedNumber}` : 'No selection'}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={handleSubmitNumber}
                      disabled={selectedNumber === null || hasSubmitted}
                    >
                      {hasSubmitted ? 'Submitted' : 'Submit'}
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
