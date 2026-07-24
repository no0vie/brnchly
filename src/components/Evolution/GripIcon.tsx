import React from 'react';

export const GripIcon: React.FC<{ isDragging: boolean }> = ({ isDragging }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    opacity={isDragging ? 0.3 : 0.35}
    style={{ pointerEvents: 'none' }}
  >
    <circle cx="5" cy="3" r="1.8" />
    <circle cx="11" cy="3" r="1.8" />
    <circle cx="5" cy="8" r="1.8" />
    <circle cx="11" cy="8" r="1.8" />
    <circle cx="5" cy="13" r="1.8" />
    <circle cx="11" cy="13" r="1.8" />
  </svg>
);
