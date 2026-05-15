import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import PlayerView from './PlayerView';
import SpectatorView from './SpectatorView';
import MusicPlayer from './components/MusicPlayer';
import socket from './socket';
import './App.css';

function NavBar({ isJoined }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSpectateClick = (e) => {
    if (location.pathname === '/spectate') return;
    if (isJoined) {
      e.preventDefault();
      setConfirmOpen(true);
    }
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    navigate('/spectate');
  };

  return (
    <>
      <Box className="app-nav">
        <Box className="app-nav-links">
          <Link to="/" className="app-nav-link">PLAY</Link>
          <Link to="/spectate" className="app-nav-link" onClick={handleSpectateClick}>SPECTATE</Link>
        </Box>
        <MusicPlayer />
      </Box>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Leave the match?</DialogTitle>
        <DialogContent>
          <Typography>
            Switching to spectate will remove you from the lobby. You'll need to rejoin to play again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Stay in match</Button>
          <Button onClick={handleConfirm} variant="contained" color="warning">
            Spectate anyway
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function App() {
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    const onJoinSuccess = () => setIsJoined(true);
    const onSpectatorJoined = () => setIsJoined(false);
    const onGameOver = () => setIsJoined(false);
    const onRoundEnd = (data) => {
      if (data?.gameOverPlayers?.includes(socket.id)) setIsJoined(false);
    };

    socket.on('joinSuccess', onJoinSuccess);
    socket.on('spectatorJoined', onSpectatorJoined);
    socket.on('gameOver', onGameOver);
    socket.on('roundEnd', onRoundEnd);

    return () => {
      socket.off('joinSuccess', onJoinSuccess);
      socket.off('spectatorJoined', onSpectatorJoined);
      socket.off('gameOver', onGameOver);
      socket.off('roundEnd', onRoundEnd);
    };
  }, []);

  return (
    <BrowserRouter>
      <NavBar isJoined={isJoined} />
      <Routes>
        <Route path="/" element={<PlayerView />} />
        <Route path="/spectate" element={<SpectatorView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
