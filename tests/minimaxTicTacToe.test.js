const {
  boardResult,
  createSoloTicTacToe,
  emptyCells,
  playComputerTurn,
} = require("../utils/playTicTacToeAgainstComputer");
const { chooseMinimaxMove } = require("../utils/minimaxTicTacToe");

describe("Hard Tic Tac Toe minimax", () => {
  test("takes a winning move", () => {
    const game = createSoloTicTacToe("hard");
    game.board = ["O", "O", null, "X", "X", null, null, null, null];

    const outcome = playComputerTurn(game, 8);

    expect(outcome.result).toBe("o-win");
    expect(outcome.board[2]).toBe("O");
    expect(outcome.board[8]).toBe("X");
  });

  test("blocks an immediate human win", () => {
    const game = createSoloTicTacToe("hard");
    game.board = ["X", "X", null, "O", null, null, null, null, null];

    const outcome = playComputerTurn(game, 8);

    expect(outcome.result).toBe("playing");
    expect(outcome.board[2]).toBe("O");
  });

  test("never selects an occupied cell", () => {
    const board = ["X", "O", null, "X", null, "O", null, null, null];

    const index = chooseMinimaxMove(board);

    expect(board[index]).toBeNull();
    expect(emptyCells(board)).toContain(index);
  });

  test("does not modify the board while searching", () => {
    const board = ["X", null, null, null, "O", null, null, null, null];
    const before = board.slice();

    chooseMinimaxMove(board);

    expect(board).toEqual(before);
  });

  test("never loses against any legal sequence from a fresh game", () => {
    const board = Array(9).fill(null);

    function playHumanTurns(currentBoard) {
      const result = boardResult(currentBoard);
      if (result === "x-win") {
        throw new Error("Hard mode lost: " + currentBoard.join(","));
      }
      if (result !== "playing") return;

      for (const index of emptyCells(currentBoard)) {
        currentBoard[index] = "X";
        const afterHuman = boardResult(currentBoard);
        if (afterHuman === "playing") {
          const computerIndex = chooseMinimaxMove(currentBoard);
          expect(currentBoard[computerIndex]).toBeNull();
          currentBoard[computerIndex] = "O";
          playHumanTurns(currentBoard);
          currentBoard[computerIndex] = null;
        } else {
          expect(afterHuman).not.toBe("x-win");
        }
        currentBoard[index] = null;
      }
    }

    expect(() => playHumanTurns(board)).not.toThrow();
    expect(board).toEqual(Array(9).fill(null));
  });

  test("keeps hard difficulty when a new board is created for Play Again", () => {
    const next = createSoloTicTacToe(createSoloTicTacToe("hard").difficulty);

    expect(next.difficulty).toBe("hard");
    expect(next.board).toEqual(Array(9).fill(null));
    expect(next.status).toBe("playing");
  });
});
