// The design surface. Everything is laid out against these numbers and the
// Scale Manager fits the result into whatever window it is given, so no piece
// of layout code ever has to ask how big the browser is.
export const VIEW_W = 1440;
export const VIEW_H = 810;

// The resolution of the signal the CRT filter displays: the whole picture is
// resolved down to this grid once, and the filter treats one texel of it as one
// phosphor cell. It is a property of the machine we are pretending to be, not
// of the browser window.
export const SIGNAL_W = 640;
export const SIGNAL_H = 360;

export const TILE = 18;
export const MAZE_W = 19;
export const MAZE_H = 19;

// Tile ids used by the maze grid.
export const WALL = 1;
export const FLOOR = 0;
export const FAST = 2;
export const MUD = 3;

// How long a direction press stays queued waiting for an opening, and how far
// past a tile centre a turn is still allowed to snap back.
export const INPUT_BUFFER = 0.45;
export const TURN_SLACK = 0.14;

export const DIRS = [
  {x: 0, y: -1},
  {x: 0, y: 1},
  {x: -1, y: 0},
  {x: 1, y: 0}
];

export const DIR_VECTORS = {
  up: {x: 0, y: -1},
  down: {x: 0, y: 1},
  left: {x: -1, y: 0},
  right: {x: 1, y: 0}
};

// The shared shell colours. Themes recolour the world; these are the chrome the
// UI is built from and they do not change.
export const PALETTE = {
  ink: '#181425',
  shadow: '#262b44',
  slate: '#3a4466',
  muted: '#5a6988',
  dim: '#8b9bb4',
  paper: '#c0cbdc',
  white: '#ffffff',
  gold: '#fee761',
  cyan: '#2ce8f5',
  rose: '#b55088',
  danger: '#ff0044'
};

export const FONT = '"Press Start 2P"';
