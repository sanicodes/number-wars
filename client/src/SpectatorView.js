import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import socket from './socket';
import PlayerTile from './components/PlayerTile';
import CenterStage from './components/CenterStage';
import SubmissionFeed from './components/SubmissionFeed';

export default function SpectatorView() {
  const [players, setPlayers] = useState([]);
  const [gamePhase, setGamePhase] = useState('idle');
  const [roundInfo, setRoundInfo] = useState(null);
  const [roundResults, setRoundResults] = useState(null);
  const [feedEvents, setFeedEvents] = useState([]);
  const [submittedNonces, setSubmittedNonces] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [defeatedIds, setDefeatedIds] = useState([]);
  const [eliminatedIds, setEliminatedIds] = useState([]);
  const nonceCounter = useRef(0);
  const eventCounter = useRef(0);

  useEffect(() => {
    socket.emit('joinAsSpectator', 'Spectator');

    const onSpectatorJoined = (data) => {
      setPlayers(data.players || []);
      if (data.roundInProgress) setGamePhase('playing');
      else if (data.gameStarted) setGamePhase('results');
      else setGamePhase('lobby');
    };

    const onPlayerList = (list) => setPlayers(list);

    const onRoundStart = (info) => {
      setGamePhase('playing');
      setRoundInfo(info);
      setRoundResults(null);
      setTimeLeft(info.time / 1000);
      setSubmittedNonces({});
      setFeedEvents([]);
      setDefeatedIds([]);
      setEliminatedIds([]);
    };

    const onRoundEnd = (data) => {
      setGamePhase('results');
      setRoundResults(data);
      setPlayers(data.players);
      setRoundInfo(null);
      const resultPlayers = data.roundPlayers || data.players;
      const defeated = data.defeatedPlayers || resultPlayers
        .map(([id, p]) => (p.number !== null && id !== data.winner ? id : null))
        .filter(Boolean);
      setDefeatedIds(defeated);
      setEliminatedIds(data.gameOverPlayers || []);
    };

    const onGameOver = (data) => {
      setGamePhase('gameOver');
      if (data.winner) {
        setRoundResults((prev) => ({
          ...(prev || {}),
          winner: data.winner.id,
          winnerName: data.winner.name,
        }));
      }
    };

    const onPlayerSubmitted = ({ id, name, character }) => {
      nonceCounter.current += 1;
      const nonce = nonceCounter.current;
      setSubmittedNonces((prev) => ({ ...prev, [id]: nonce }));
      eventCounter.current += 1;
      setFeedEvents((prev) => [
        { key: `evt-${eventCounter.current}`, id, name, character, ts: Date.now() },
        ...prev,
      ].slice(0, 20));
    };

    socket.on('spectatorJoined', onSpectatorJoined);
    socket.on('playerList', onPlayerList);
    socket.on('roundStart', onRoundStart);
    socket.on('roundEnd', onRoundEnd);
    socket.on('gameOver', onGameOver);
    socket.on('playerSubmitted', onPlayerSubmitted);

    return () => {
      socket.off('spectatorJoined', onSpectatorJoined);
      socket.off('playerList', onPlayerList);
      socket.off('roundStart', onRoundStart);
      socket.off('roundEnd', onRoundEnd);
      socket.off('gameOver', onGameOver);
      socket.off('playerSubmitted', onPlayerSubmitted);
    };
  }, []);

  useEffect(() => {
    let timer;
    if (gamePhase === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [gamePhase, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const r = seconds % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const validNumbers = roundResults
    ? (roundResults.roundPlayers || roundResults.players).map(([_, p]) => p.number).filter((n) => n !== null)
    : [];
  const target = validNumbers.length
    ? (validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length) * 0.8
    : null;

  const submittedCount = players.filter(([_, p]) => p.hasSubmitted || p.number !== null).length;
  const waitingFor = players
    .filter(([_, p]) => !p.hasSubmitted && p.number === null && p.score > 0)
    .map(([_, p]) => p.name);

  return (
    <Container maxWidth={false} className="spectator-shell">
      <Stack spacing={3}>
        <Paper className="spectator-header" elevation={0}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Box>
              <Chip label="SPECTATOR FEED" className="hero-chip" sx={{ mb: 1 }} />
              <Typography variant="h3" className="hero-title">Number Wars Live</Typography>
            </Box>
            <Stack direction="row" spacing={2} className="spectator-stats">
              <Box className="stat-card">
                <Typography className="stat-label">Phase</Typography>
                <Typography className="stat-value">{gamePhase.toUpperCase()}</Typography>
              </Box>
              <Box className="stat-card">
                <Typography className="stat-label">Round</Typography>
                <Typography className="stat-value">{roundInfo?.round || roundResults?.round || '—'}</Typography>
              </Box>
              <Box className="stat-card">
                <Typography className="stat-label">Submitted</Typography>
                <Typography className="stat-value">{submittedCount}/{players.length || 0}</Typography>
              </Box>
              <Box className="stat-card">
                <Typography className="stat-label">Clock</Typography>
                <Typography className="stat-value">{gamePhase === 'playing' ? formatTime(timeLeft) : '--:--'}</Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        <Box className="spectator-layout">
          <Box className="spectator-main">
            <Paper className="spectator-stage-panel" elevation={0}>
              <CenterStage
                players={gamePhase === 'results' || gamePhase === 'gameOver' ? roundResults?.roundPlayers || players : players}
                submittedNonces={submittedNonces}
                targetValue={target}
                isReveal={gamePhase === 'results' || gamePhase === 'gameOver'}
                winnerId={roundResults?.winner}
                defeatedIds={defeatedIds}
                eliminatedIds={eliminatedIds}
              />
              {gamePhase === 'playing' && waitingFor.length > 0 && (
                <Box className="spectator-waiting">
                  <span>Waiting on:</span>
                  <strong>{waitingFor.slice(0, 4).join(', ')}{waitingFor.length > 4 ? ` +${waitingFor.length - 4}` : ''}</strong>
                </Box>
              )}
              {gamePhase === 'results' && roundResults?.winnerName && (
                <Box className="spectator-winner-banner">
                  <span>Round Winner</span>
                  <strong>{roundResults.winnerName}</strong>
                </Box>
              )}
            </Paper>
          </Box>

          <Box className="spectator-side">
            <Paper className="section-panel" elevation={0}>
              <Box className="section-header">
                <Typography variant="h5">Combatants</Typography>
                <Chip label={`${players.length} active`} className="soft-chip" />
              </Box>
              <Box className="player-tile-grid spectator-grid">
                {players.map(([id, p]) => (
                  <PlayerTile
                    key={id}
                    player={p}
                    isWinner={roundResults?.winner === id}
                    isDefeated={defeatedIds.includes(id)}
                    isJustEliminated={eliminatedIds.includes(id)}
                    submittedNonce={submittedNonces[id] || 0}
                    size="sm"
                  />
                ))}
                {players.length === 0 && (
                  <Box className="empty-state">
                    <Typography className="empty-title">No combatants yet</Typography>
                    <Typography className="empty-copy">Waiting for players to join the arena.</Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            <Paper className="section-panel" elevation={0}>
              <SubmissionFeed events={feedEvents} />
            </Paper>
          </Box>
        </Box>
      </Stack>
    </Container>
  );
}
