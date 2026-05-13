import React from 'react';
import { motion } from 'framer-motion';
import { CHARACTERS } from '../characters';

export default function CharacterPicker({
  selected,
  takenIds = [],
  onSelect,
  disabled = false,
}) {
  const takenSet = new Set(takenIds);

  return (
    <div className="character-picker">
      <div className="character-picker-grid">
        {CHARACTERS.map((c) => {
          const taken = takenSet.has(c.id) && c.id !== selected;
          const isSelected = c.id === selected;
          return (
            <motion.button
              key={c.id}
              type="button"
              className={`character-card${isSelected ? ' selected' : ''}${taken ? ' taken' : ''}`}
              onClick={() => !taken && !disabled && onSelect(c.id)}
              whileHover={!taken && !disabled ? { y: -3 } : {}}
              whileTap={!taken && !disabled ? { scale: 0.97 } : {}}
              style={{
                '--char-color': c.color,
                '--char-accent': c.accent,
              }}
              disabled={taken || disabled}
            >
              <span className="character-card-glyph">{c.glyph}</span>
              <span className="character-card-name">{c.name}</span>
              <span className="character-card-finisher">{c.finisher.name}</span>
              {taken && <span className="character-card-taken">TAKEN</span>}
              {isSelected && <span className="character-card-selected">SELECTED</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
