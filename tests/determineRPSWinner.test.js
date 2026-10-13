const getRPSWinner = require("../utils/determineRPSWinner");

describe("Rock Paper Scissors winner logic", () => {
  test("Rock beats Scissors", () => {
    expect(getRPSWinner("Rock", "Scissors")).toBe("player1");
  });

  test("Paper beats Rock", () => {
    expect(getRPSWinner("Paper", "Rock")).toBe("player1");
  });

  test("Scissors beats Paper", () => {
    expect(getRPSWinner("Scissors", "Paper")).toBe("player1");
  });

  test("Player 2 wins when Paper beats Rock", () => {
    expect(getRPSWinner("Rock", "Paper")).toBe("player2");
  });

  test("Player 2 wins when Scissors beats Paper", () => {
    expect(getRPSWinner("Paper", "Scissors")).toBe("player2");
  });

  test("Player 2 wins when Rock beats Scissors", () => {
    expect(getRPSWinner("Scissors", "Rock")).toBe("player2");
  });

  test("Same choices result in a draw", () => {
    expect(getRPSWinner("Rock", "Rock")).toBe("draw");
    expect(getRPSWinner("Paper", "Paper")).toBe("draw");
    expect(getRPSWinner("Scissors", "Scissors")).toBe("draw");
  });
});