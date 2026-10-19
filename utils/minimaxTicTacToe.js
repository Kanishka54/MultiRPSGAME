const { boardResult, emptyCells } = require("./playTicTacToeAgainstComputer");

function minimaxScore(board, mark) {
  const result = boardResult(board);
  if (result === "o-win") return 1;
  if (result === "x-win") return -1;
  if (result === "draw") return 0;

  const maximizing = mark === "O";
  let best = maximizing ? -Infinity : Infinity;

  for (const index of emptyCells(board)) {
    board[index] = mark;
    const score = minimaxScore(board, mark === "O" ? "X" : "O");
    board[index] = null;
    if (maximizing) {
      if (score > best) best = score;
    } else if (score < best) {
      best = score;
    }
  }

  return best;
}

function chooseMinimaxMove(board) {
  let bestScore = -Infinity;
  let bestIndex = null;

  for (const index of emptyCells(board)) {
    board[index] = "O";
    const score = minimaxScore(board, "X");
    board[index] = null;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

module.exports = {
  chooseMinimaxMove,
  minimaxScore,
};
