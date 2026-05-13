import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacter } from '../characters';

// Uniform lock-in pulse for every character.
const LOCK_IN_VARIANT = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.12, 1],
    transition: { duration: 0.55, ease: 'easeOut' },
  },
};

export default function PlayerTile({
  player,
  isSelf = false,
  isWinner = false,
  isDefeated = false,
  isJustEliminated = false,
  submittedNonce = 0,
  size = 'md',
}) {
  const character = getCharacter(player.character);
  const variant = LOCK_IN_VARIANT;
  const submitted = player.hasSubmitted || player.number !== null;
  const eliminated = player.score <= 0;

  const tileAnimate = isJustEliminated
    ? {
        x: [0, -10, 12, -8, 6, 0],
        rotate: [0, -3, 4, -2, 1, 0],
        opacity: [1, 1, 1, 0.8, 0.55, 0.45],
        filter: ['grayscale(0)', 'grayscale(0.4)', 'grayscale(0.8)', 'grayscale(1)'],
        transition: { duration: 1.4, ease: 'easeOut' },
      }
    : isDefeated
    ? {
        opacity: 0.6,
        scale: 0.96,
        y: 4,
        transition: { duration: 0.6, ease: 'easeOut' },
      }
    : isWinner
    ? {
        opacity: 1,
        scale: [1, 1.06, 1.02],
        y: [-2, 0],
        transition: { duration: 0.7, ease: 'easeOut' },
      }
    : { opacity: 1, y: 0, scale: 1, x: 0, rotate: 0 };

  return (
    <motion.div
      className={`player-tile size-${size}${isSelf ? ' is-self' : ''}${isWinner ? ' is-winner' : ''}${eliminated ? ' is-out' : ''}${isDefeated ? ' is-defeated' : ''}${isJustEliminated ? ' is-dying' : ''}${submitted ? ' is-locked' : ''}`}
      style={{
        '--char-color': character.color,
        '--char-accent': character.accent,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={tileAnimate}
      layout
    >
      <div className="player-tile-bg" aria-hidden="true" />
      <motion.div
        className="player-tile-glyph"
        key={`glyph-${submittedNonce}`}
        initial={variant.initial}
        animate={submittedNonce ? variant.animate : variant.initial}
      >
        <span>{character.glyph}</span>
      </motion.div>

      <div className="player-tile-meta">
        <div className="player-tile-name">
          {player.name}
          {isSelf && <span className="player-tile-self">YOU</span>}
        </div>
        <div className="player-tile-row">
          <span className="player-tile-character">{character.name}</span>
          <span className="player-tile-score">{player.score} pts</span>
        </div>
      </div>

      <AnimatePresence>
        {submitted && !eliminated && (
          <motion.div
            className="player-tile-locked-badge"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
          >
            LOCKED
          </motion.div>
        )}
        {eliminated && (
          <motion.div
            className="player-tile-out-badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            OUT
          </motion.div>
        )}
        {isWinner && (
          <motion.div
            className="player-tile-winner-badge"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            WINNER
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submittedNonce > 0 && (
          <motion.div
            key={`pulse-${submittedNonce}`}
            className="player-tile-pulse"
            initial={{ opacity: 0.7, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWinner && (
          <motion.div
            key="crown"
            className="player-tile-crown"
            initial={{ opacity: 0, y: -8, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 14 }}
          >
            👑
          </motion.div>
        )}
        {isJustEliminated && (
          <motion.div
            key="death"
            className="player-tile-death"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <span className="player-tile-skull">💀</span>
            <span className="player-tile-cracks" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
