const WIN_LINES = [
  [0, 1, 2],
  [0, 3, 6],
  [0, 4, 8],
  [1, 4, 7],
  [2, 5, 8],
  [2, 4, 6],
  [3, 4, 5],
  [6, 7, 8],
];

function createSoloTicTacToe() {
  return {
    board: Array(9).fill(null),
    status: "playing",
  };
}

function winningMark(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function emptyCells(board) {
  const cells = [];
  board.forEach((cell, index) => {
    if (cell == null) cells.push(index);
  });
  return cells;
}

function boardResult(board) {
  const mark = winningMark(board);
  if (mark === "X") return "x-win";
  if (mark === "O") return "o-win";
  if (emptyCells(board).length === 0) return "draw";
  return "playing";
}

function playEasyComputerTurn(game, cellIndex, random = Math.random) {
  if (!game) {
    return { ok: false, reason: "no-game" };
  }

  if (game.status !== "playing") {
    return { ok: false, reason: "game-over" };
  }

  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
    return { ok: false, reason: "invalid-index" };
  }

  if (game.board[cellIndex] != null) {
    return { ok: false, reason: "occupied" };
  }

  game.board[cellIndex] = "X";
  let result = boardResult(game.board);

  if (result === "playing") {
    const open = emptyCells(game.board);
    const pick = open[Math.floor(random() * open.length)];
    game.board[pick] = "O";
    result = boardResult(game.board);
  }

  game.status = result;

  return {
    ok: true,
    board: game.board.slice(),
    result,
  };
}

module.exports = {
  createSoloTicTacToe,
  playEasyComputerTurn,
  WIN_LINES,
};
