# Stockfish.js (lite, single-threaded)

Used by the chess game review in `js/games/chess.js`. Loaded only when a review starts, in a Web Worker.

- Engine: Stockfish 19 (https://github.com/official-stockfish/Stockfish), compiled to WebAssembly by Nathan Rugg / Chess.com as Stockfish.js 19.0.1 (https://github.com/nmrugg/stockfish.js, npm package `stockfish`).
- Files: `stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm`, unchanged from the npm package.
- License: GNU General Public License v3, see `COPYING.txt`. The complete source code is available at the two links above.
