const playRPSAgainstComputer = require("../utils/playRPSAgainstComputer");

describe("Play Rock Paper Scissors against the computer", () => {
  test("rejects a choice the multiplayer game would reject", () => {
    expect(playRPSAgainstComputer("Scissor", () => 0)).toEqual({
      ok: false,
      reason: "invalid-choice",
    });
    expect(playRPSAgainstComputer(null, () => 0)).toEqual({
      ok: false,
      reason: "invalid-choice",
    });
  });

  test("uses the shared winner helper for the player's choice and a server choice", () => {
    expect(playRPSAgainstComputer("Rock", () => 0.9)).toEqual({
      ok: true,
      playerChoice: "Rock",
      computerChoice: "Scissors",
      winner: "player1",
    });

    expect(playRPSAgainstComputer("Rock", () => 0.4)).toEqual({
      ok: true,
      playerChoice: "Rock",
      computerChoice: "Paper",
      winner: "player2",
    });

    expect(playRPSAgainstComputer("Paper", () => 0)).toEqual({
      ok: true,
      playerChoice: "Paper",
      computerChoice: "Rock",
      winner: "player1",
    });

    expect(playRPSAgainstComputer("Scissors", () => 0.8)).toEqual({
      ok: true,
      playerChoice: "Scissors",
      computerChoice: "Scissors",
      winner: "draw",
    });
  });
});
