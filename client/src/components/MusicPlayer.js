import React, { useEffect, useRef, useState } from 'react';
import { IconButton, Slider, Stack, Box } from '@mui/material';

// Browsers block autoplay without a user gesture. We start muted and unmute on
// the first interaction (click / touch / keypress) anywhere on the page,
// which the spec considers a valid gesture for resuming audio.

const BGM_TRACKS = [
  '/audio/bgm/track_1.mp3',
  '/audio/bgm/track_2.mp3',
  '/audio/bgm/track_3.mp3',
  '/audio/bgm/track_4.mp3',
  '/audio/bgm/track_5.mp3',
].map((src) => `${process.env.PUBLIC_URL || ''}${src}`);
const STORAGE_KEY = 'numwars:bgm';

const getNextTrackIndex = (currentTrackIndex, failedTracks = []) => {
  for (let offset = 1; offset <= BGM_TRACKS.length; offset += 1) {
    const nextTrackIndex = (currentTrackIndex + offset) % BGM_TRACKS.length;
    if (!failedTracks.includes(nextTrackIndex)) return nextTrackIndex;
  }
  return currentTrackIndex;
};

const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { volume: 0.45, muted: false };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === 'number' ? parsed.volume : 0.45,
      muted: !!parsed.muted,
    };
  } catch {
    return { volume: 0.45, muted: false };
  }
};

const savePrefs = (volume, muted) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, muted }));
  } catch {}
};

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [{ volume, muted }, setPrefs] = useState(loadPrefs);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [failedTracks, setFailedTracks] = useState([]);
  const [hasError, setHasError] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Apply volume / mute to the live audio element whenever they change.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
    savePrefs(volume, muted);
  }, [volume, muted]);

  // First user gesture starts playback. Plenty of redundancy because some
  // browsers only count specific event types as gestures.
  useEffect(() => {
    const tryPlay = () => {
      if (!audioRef.current || hasStarted) return;
      audioRef.current
        .play()
        .then(() => setHasStarted(true))
        .catch(() => {
          // Will retry on next gesture.
        });
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, tryPlay, { once: false }));
    return () => events.forEach((e) => window.removeEventListener(e, tryPlay));
  }, [hasStarted]);

  useEffect(() => {
    if (!audioRef.current || !hasStarted) return;
    audioRef.current.play().catch(() => {
      // Will retry on next gesture.
    });
  }, [currentTrackIndex, hasStarted]);

  const playNextTrack = () => {
    setCurrentTrackIndex((trackIndex) => getNextTrackIndex(trackIndex, failedTracks));
  };

  const handleTrackError = () => {
    const nextFailedTracks = failedTracks.includes(currentTrackIndex)
      ? failedTracks
      : [...failedTracks, currentTrackIndex];

    setFailedTracks(nextFailedTracks);

    if (nextFailedTracks.length >= BGM_TRACKS.length) {
      setHasError(true);
      return;
    }

    setCurrentTrackIndex(getNextTrackIndex(currentTrackIndex, nextFailedTracks));
  };

  const toggleMute = () => setPrefs((p) => ({ ...p, muted: !p.muted }));
  const handleVolume = (_, v) =>
    setPrefs((p) => ({ ...p, volume: Array.isArray(v) ? v[0] : v, muted: false }));

  if (hasError) return null;

  return (
    <Box className="music-player">
      <audio
        ref={audioRef}
        src={BGM_TRACKS[currentTrackIndex]}
        preload="auto"
        onEnded={playNextTrack}
        onError={handleTrackError}
      />
      <Stack direction="row" alignItems="center" spacing={1} className="music-player-inner">
        <IconButton
          size="small"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute music' : 'Mute music'}
          className="music-button"
        >
          {muted || volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.75 ? '🔉' : '🔊'}
        </IconButton>
        <Slider
          size="small"
          value={muted ? 0 : volume}
          onChange={handleVolume}
          min={0}
          max={1}
          step={0.01}
          aria-label="Music volume"
          className="music-slider"
        />
      </Stack>
    </Box>
  );
}
