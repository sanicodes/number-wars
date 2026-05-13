import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacter } from '../characters';

export default function SubmissionFeed({ events = [] }) {
  return (
    <div className="submission-feed">
      <div className="submission-feed-title">Lock-in Feed</div>
      <div className="submission-feed-list">
        <AnimatePresence initial={false}>
          {events.slice(0, 8).map((event) => {
            const character = getCharacter(event.character);
            return (
              <motion.div
                key={event.key}
                className="submission-feed-item"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                style={{ '--char-color': character.color }}
              >
                <span className="feed-glyph">{character.glyph}</span>
                <span className="feed-name">{event.name}</span>
                <span className="feed-action">locked in</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {events.length === 0 && (
          <div className="submission-feed-empty">Waiting for first submission…</div>
        )}
      </div>
    </div>
  );
}
