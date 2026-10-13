const {
  submitRPSChoice,
  openRPSRound,
} = require("../utils/submitRPSChoice");

function makeRoom() {
  return {
    player1: "Ada",
    player2: "Grace",
    player1SocketId: "socket-1",
    player2SocketId: "socket-2",
    player1Choice: null,
    player2Choice: null,
    roundClosed: false,
  };
}

describe("RPS choice submission", () => {
  test("stores a choice and tells the opponent only that it was submitted", () => {
    const room = makeRoom();

    const outcome = submitRPSChoice(room, "socket-1", "Rock");

    expect(outcome).toEqual({
      ok: true,
      opponentNotice: { submitted: true },
    });
    expect(room.player1Choice).toBe("Rock");
    expect(room.player2Choice).toBeNull();
    expect(JSON.stringify(outcome)).not.toContain("Rock");
  });

  test("uses the stored socket id, not a caller-supplied role", () => {
    const room = makeRoom();

    submitRPSChoice(room, "socket-2", "Scissors");

    expect(room.player1Choice).toBeNull();
    expect(room.player2Choice).toBe("Scissors");
  });

  test("reveals both choices and the winner only after both players submit", () => {
    const room = makeRoom();

    submitRPSChoice(room, "socket-1", "Rock");
    const outcome = submitRPSChoice(room, "socket-2", "Scissors");

    expect(outcome).toEqual({
      ok: true,
      result: {
        winner: "player1",
        player1Choice: "Rock",
        player2Choice: "Scissors",
      },
    });
    expect(room.player1Choice).toBeNull();
    expect(room.player2Choice).toBeNull();
    expect(room.roundClosed).toBe(true);
  });

  test("rejects a second submission from the same player", () => {
    const room = makeRoom();

    submitRPSChoice(room, "socket-1", "Rock");
    const outcome = submitRPSChoice(room, "socket-1", "Paper");

    expect(outcome).toEqual({ ok: false, reason: "already-submitted" });
    expect(room.player1Choice).toBe("Rock");
  });

  test("rejects a socket that is not a player in the room", () => {
    const room = makeRoom();

    expect(submitRPSChoice(room, "socket-3", "Rock")).toEqual({
      ok: false,
      reason: "not-a-player",
    });
    expect(submitRPSChoice(null, "socket-1", "Rock")).toEqual({
      ok: false,
      reason: "not-a-player",
    });
    expect(room.player1Choice).toBeNull();
    expect(room.player2Choice).toBeNull();
  });

  test("accepts only Rock, Paper, and Scissors", () => {
    const room = makeRoom();

    ["Scissor", "rock", "", null, "Lizard"].forEach((choice) => {
      expect(submitRPSChoice(room, "socket-1", choice)).toEqual({
        ok: false,
        reason: "invalid-choice",
      });
    });

    expect(room.player1Choice).toBeNull();
  });

  test("keeps the round closed until a rematch opens it", () => {
    const room = makeRoom();

    submitRPSChoice(room, "socket-1", "Paper");
    submitRPSChoice(room, "socket-2", "Paper");

    expect(submitRPSChoice(room, "socket-1", "Rock")).toEqual({
      ok: false,
      reason: "round-closed",
    });

    openRPSRound(room);

    const outcome = submitRPSChoice(room, "socket-1", "Rock");

    expect(outcome.opponentNotice).toEqual({ submitted: true });
    expect(room.player1Choice).toBe("Rock");
    expect(room.roundClosed).toBe(false);
  });
});
