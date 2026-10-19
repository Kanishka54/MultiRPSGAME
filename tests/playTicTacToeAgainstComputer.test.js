const {
  createSoloTicTacToe,
  playEasyComputerTurn,
} = require("../utils/playTicTacToeAgainstComputer");

describe("Easy Tic Tac Toe against the computer", () => {
  test("places X on an empty cell and then a random O", () => {
    const game = createSoloTicTacToe();

    const outcome = playEasyComputerTurn(game, 0, () => 0.5);

    expect(outcome.ok).toBe(true);
    expect(outcome.result).toBe("playing");
    expect(outcome.board[0]).toBe("X");
    expect(outcome.board[5]).toBe("O");
    expect(game.board).toEqual(outcome.board);
  });

  test("rejects an occupied cell without changing the board", () => {
    const game = createSoloTicTacToe();
    playEasyComputerTurn(game, 0, () => 0);
    const before = game.board.slice();

    expect(playEasyComputerTurn(game, 0, () => 0)).toEqual({
      ok: false,
      reason: "occupied",
    });
    expect(game.board).toEqual(before);
  });

  test("rejects indexes that are not integers from 0 to 8", () => {
    const game = createSoloTicTacToe();

    [-1, 9, 1.5, "4", null].forEach((index) => {
      expect(playEasyComputerTurn(game, index, () => 0)).toEqual({
        ok: false,
        reason: "invalid-index",
      });
    });
    expect(game.board).toEqual(Array(9).fill(null));
  });

  test("does not move the computer after the human wins", () => {
    const game = createSoloTicTacToe();
    game.board = ["X", "X", null, "O", "O", null, null, null, null];
    const random = jest.fn();

    const outcome = playEasyComputerTurn(game, 2, random);

    expect(outcome).toEqual({
      ok: true,
      board: ["X", "X", "X", "O", "O", null, null, null, null],
      result: "x-win",
    });
    expect(random).not.toHaveBeenCalled();
    expect(playEasyComputerTurn(game, 5, () => 0)).toEqual({
      ok: false,
      reason: "game-over",
    });
    expect(game.board[5]).toBeNull();
  });

  test("lets the computer win on its random empty cell", () => {
    const game = createSoloTicTacToe();
    game.board = ["O", "O", null, "X", "X", null, null, null, null];

    const outcome = playEasyComputerTurn(game, 8, () => 0);

    expect(outcome.result).toBe("o-win");
    expect(outcome.board[8]).toBe("X");
    expect(outcome.board[2]).toBe("O");
  });

  test("returns a draw when the human fills the last cell", () => {
    const game = createSoloTicTacToe();
    game.board = ["X", "O", "X", "X", "O", "O", "O", "X", null];
    const random = jest.fn();

    const outcome = playEasyComputerTurn(game, 8, random);

    expect(outcome.result).toBe("draw");
    expect(outcome.board[8]).toBe("X");
    expect(random).not.toHaveBeenCalled();
  });

  test("returns a draw when the computer fills the last cell", () => {
    const game = createSoloTicTacToe();
    game.board = ["X", "O", "X", "X", "O", "O", "O", null, null];

    const outcome = playEasyComputerTurn(game, 7, () => 0);

    expect(outcome.result).toBe("draw");
    expect(outcome.board[7]).toBe("X");
    expect(outcome.board[8]).toBe("O");
  });

  test("rejects a move when there is no game", () => {
    expect(playEasyComputerTurn(null, 0, () => 0)).toEqual({
      ok: false,
      reason: "no-game",
    });
  });
});
