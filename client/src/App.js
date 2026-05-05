import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Box } from '@mui/material';
import PlayerView from './PlayerView';
import SpectatorView from './SpectatorView';
import MusicPlayer from './components/MusicPlayer';
import './App.css';

function NavBar() {
  return (
    <Box className="app-nav">
      <Box className="app-nav-links">
        <Link to="/" className="app-nav-link">PLAY</Link>
        <Link to="/spectate" className="app-nav-link">SPECTATE</Link>
      </Box>
      <MusicPlayer />
    </Box>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<PlayerView />} />
        <Route path="/spectate" element={<SpectatorView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
