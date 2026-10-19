const { submitRPSChoice } = require("../utils/submitRPSChoice");
const {
  createRPSFriendRoom,
  renewRPSFriendMatch,
  continueRPSRound,
  removeRPSRoomsForSocket,
} = require("../utils/rpsRoom");
const {
  createRPSComputerMatch,
  playRPSComputerRound,
  nextRPSComputerRound,
} = require("../utils/rpsComputerMatch");
const {
  createFriendTicTacToe,
  applyFriendTicTacToeMove,
  resetFriendTicTacToe,
} = require("../utils/ticTacToeFriendMatch");
const {
  COMPUTER_MATCH_MS,
  startComputerMatchClock,
  clearComputerMatchClock,
} = require("../utils/ticTacToeComputerClock");

function fakeClock(start) {
  let time = start;
  const timers = [];

  return {
    now: () => time,
    advance(ms) {
      time += ms;
      timers.forEach((timer) => {
        if (!timer.cleared && time >= timer.fireAt) {
          timer.cleared = true;
          timer.fn();
        }
      });
    },
    schedule(fn, delay) {
      const timer = { fn, fireAt: time + delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clear(timer) {
      if (timer) timer.cleared = true;
    },
  };
}

function clockOptions(clock, extra) {
  return {
    now: clock.now,
    schedule: clock.schedule,
    clear: clock.clear,
    ...extra,
  };
}

describe("shared 60-second match timer", () => {
  test("draws a friend Tic Tac Toe match that expires with no moves", () => {
    const clock = fakeClock(1_000);
    const room = createFriendTicTacToe("Ada", "socket-1");
    room.player2SocketId = "socket-2";
    room.status = "playing";

    startComputerMatchClock(room, clockOptions(clock));
    const shared = { endsAt: room.endsAt, gameId: room.id };
    expect(shared.endsAt).toBe(1_000 + COMPUTER_MATCH_MS);
    expect({ ...shared }).toEqual(shared);

    clock.advance(COMPUTER_MATCH_MS);

    expect(room.status).toBe("time-up");
    expect(room.board.every((cell) => cell == null)).toBe(true);
  });

  test("gives both multiplayer players the same deadline", () => {
    const clock = fakeClock(5_000);
    const room = createRPSFriendRoom("Ada", "socket-1");
    room.player2SocketId = "socket-2";
    room.status = "playing";
    startComputerMatchClock(room, clockOptions(clock));

    const player1 = { endsAt: room.endsAt, gameId: room.id };
    const player2 = { endsAt: room.endsAt, gameId: room.id };

    expect(player1).toEqual(player2);
    expect(player1.endsAt).toBe(5_000 + COMPUTER_MATCH_MS);
  });

  test("rejects a late Tic Tac Toe move and keeps an earlier win", () => {
    const room = createFriendTicTacToe("Ada", "socket-1");
    room.player2 = "Grace";
    room.player2SocketId = "socket-2";
    room.status = "playing";
    room.endsAt = 10_000;

    applyFriendTicTacToeMove(room, "socket-1", 0, () => 1_000);
    applyFriendTicTacToeMove(room, "socket-2", 3, () => 1_100);
    applyFriendTicTacToeMove(room, "socket-1", 1, () => 1_200);
    applyFriendTicTacToeMove(room, "socket-2", 4, () => 1_300);
    const win = applyFriendTicTacToeMove(room, "socket-1", 2, () => 1_400);

    expect(win.result).toBe("o-win");
    expect(room.status).toBe("finished");

    const late = applyFriendTicTacToeMove(room, "socket-2", 5, () => 11_000);
    expect(late).toMatchObject({ ok: false, reason: "game-over" });
    expect(room.board[2]).toBe("O");
    expect(room.board[5]).toBeNull();
    expect(room.status).toBe("finished");
  });

  test("rejects an outsider and a move after the deadline with no moves", () => {
    const room = createFriendTicTacToe("Ada", "socket-1");
    room.player2SocketId = "socket-2";
    room.status = "playing";
    room.endsAt = 4_000;
    const before = room.board.slice();

    expect(applyFriendTicTacToeMove(room, "socket-9", 0, () => 1_000)).toEqual({
      ok: false,
      reason: "not-a-player",
    });

    const late = applyFriendTicTacToeMove(room, "socket-1", 0, () => 4_000);
    expect(late.reason).toBe("time-up");
    expect(room.board).toEqual(before);
  });

  test("keeps one RPS deadline across rounds and starts a new one for a new match", () => {
    const clock = fakeClock(2_000);
    const room = createRPSFriendRoom("Ada", "socket-1");
    room.player2SocketId = "socket-2";
    room.status = "playing";
    startComputerMatchClock(room, clockOptions(clock));
    const firstDeadline = room.endsAt;

    const first = submitRPSChoice(room, "socket-1", "Rock", clock.now);
    const resolved = submitRPSChoice(room, "socket-2", "Scissors", clock.now);
    expect(first.opponentNotice).toEqual({ submitted: true });
    expect(JSON.stringify(first)).not.toContain("Rock");
    expect(resolved.result.winner).toBe("player1");

    const continued = continueRPSRound(room, clock.now);
    expect(continued).toEqual({ ok: true, endsAt: firstDeadline });
    expect(room.endsAt).toBe(firstDeadline);
    expect(room.roundClosed).toBe(false);

    clock.advance(1_000);
    clearComputerMatchClock(room, clock.clear);
    const previousId = room.id;
    renewRPSFriendMatch(room);
    startComputerMatchClock(room, clockOptions(clock));

    expect(room.id).not.toBe(previousId);
    expect(room.endsAt).toBe(clock.now() + COMPUTER_MATCH_MS);
    expect(room.endsAt).not.toBe(firstDeadline);
  });

  test("does not let an old RPS timeout end the restarted match", () => {
    const clock = fakeClock(0);
    const rooms = { roomA: createRPSFriendRoom("Ada", "socket-1") };
    const room = rooms.roomA;
    room.player2SocketId = "socket-2";
    room.status = "playing";

    startComputerMatchClock(
      room,
      clockOptions(clock, { isCurrent: (current) => rooms.roomA === current })
    );
    clearComputerMatchClock(room, clock.clear);
    renewRPSFriendMatch(room);
    startComputerMatchClock(
      room,
      clockOptions(clock, { isCurrent: (current) => rooms.roomA === current })
    );

    clock.advance(COMPUTER_MATCH_MS);
    expect(room.status).toBe("time-up");

    const replacement = renewRPSFriendMatch(room);
    replacement.status = "playing";
    removeRPSRoomsForSocket(rooms, "socket-1");
    clock.advance(COMPUTER_MATCH_MS);
    expect(rooms.roomA).toBeUndefined();
    expect(replacement.status).toBe("playing");
  });

  test("keeps RPS computer scores and deadline through a round, then resets them for a new match", () => {
    const clock = fakeClock(100);
    const match = createRPSComputerMatch();
    startComputerMatchClock(match, clockOptions(clock));
    const deadline = match.endsAt;

    const round = playRPSComputerRound(match, "Rock", () => 0, clock.now);
    expect(round.ok).toBe(true);
    expect(round.endsAt).toBe(deadline);
    expect(match.roundOpen).toBe(false);

    const next = nextRPSComputerRound(match, clock.now);
    expect(next).toMatchObject({ ok: true, endsAt: deadline, gameId: match.id });
    expect(match.playerScore).toBe(round.playerScore);
    expect(match.computerScore).toBe(round.computerScore);

    const times = [clock.now(), deadline];
    const expired = playRPSComputerRound(match, "Paper", () => 0, () => times.shift());
    expect(expired.reason).toBe("time-up");
    expect(match.playerScore).toBe(round.playerScore);

    const fresh = createRPSComputerMatch();
    startComputerMatchClock(fresh, clockOptions(clock));
    expect(fresh.id).not.toBe(match.id);
    expect(fresh.playerScore).toBe(0);
    expect(fresh.computerScore).toBe(0);
    expect(fresh.endsAt).toBe(clock.now() + COMPUTER_MATCH_MS);
  });

  test("a friend rematch gets a fresh 60 seconds and an empty board", () => {
    const clock = fakeClock(50);
    const room = createFriendTicTacToe("Ada", "socket-1");
    room.player2SocketId = "socket-2";
    room.status = "playing";
    startComputerMatchClock(room, clockOptions(clock));
    applyFriendTicTacToeMove(room, "socket-1", 0, clock.now);
    const oldId = room.id;
    const oldDeadline = room.endsAt;

    clock.advance(5_000);
    clearComputerMatchClock(room, clock.clear);
    resetFriendTicTacToe(room);
    startComputerMatchClock(room, clockOptions(clock));

    expect(room.id).not.toBe(oldId);
    expect(room.endsAt).not.toBe(oldDeadline);
    expect(room.endsAt).toBe(clock.now() + COMPUTER_MATCH_MS);
    expect(room.board.every((cell) => cell == null)).toBe(true);
    expect(room.turn).toBe("O");
  });
});
