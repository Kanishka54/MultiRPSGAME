const { createSoloTicTacToe, playComputerTurn } = require("../utils/playTicTacToeAgainstComputer");
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

describe("Tic Tac Toe computer match clock", () => {
  test("ends an active game as time-up after 60 seconds", () => {
    const clock = fakeClock(1_000);
    const game = createSoloTicTacToe("easy");
    let expired = null;

    startComputerMatchClock(game, {
      now: clock.now,
      schedule: clock.schedule,
      clear: clock.clear,
      onExpire(current) {
        expired = current;
      },
    });

    expect(game.endsAt).toBe(1_000 + COMPUTER_MATCH_MS);
    clock.advance(COMPUTER_MATCH_MS);

    expect(game.status).toBe("time-up");
    expect(expired).toBe(game);
  });

  test("rejects a move after the deadline without changing the board", () => {
    const game = createSoloTicTacToe("hard");
    game.endsAt = 5_000;
    game.board = ["X", null, null, null, "O", null, null, null, null];
    const before = game.board.slice();

    const outcome = playComputerTurn(game, 1, () => 0, () => 5_000);

    expect(outcome).toMatchObject({ ok: false, reason: "time-up", result: "time-up" });
    expect(game.board).toEqual(before);
    expect(game.status).toBe("time-up");
  });

  test("still records a normal win before the deadline", () => {
    const game = createSoloTicTacToe("easy");
    game.endsAt = 10_000;
    game.board = ["X", "X", null, "O", "O", null, null, null, null];

    const outcome = playComputerTurn(game, 2, () => 0, () => 9_000);

    expect(outcome.result).toBe("x-win");
    expect(outcome.board[2]).toBe("X");
    expect(game.board.filter((cell) => cell === "O")).toEqual(["O", "O"]);
  });

  test("does not apply a computer win when the clock expires during calculation", () => {
    const game = createSoloTicTacToe("hard");
    game.endsAt = 8_000;
    game.board = ["O", "O", null, "X", null, null, null, null, null];
    const times = [7_000, 8_000];

    const outcome = playComputerTurn(game, 8, () => 0, () => times.shift());

    expect(outcome.result).toBe("time-up");
    expect(outcome.board[8]).toBe("X");
    expect(outcome.board[2]).toBeNull();
    expect(outcome.result).not.toBe("o-win");
  });

  test("a restart clears the old timeout and starts a new 60 seconds", () => {
    const clock = fakeClock(2_000);
    const games = {};
    const first = createSoloTicTacToe("hard");
    games.socket = first;

    startComputerMatchClock(first, {
      now: clock.now,
      schedule: clock.schedule,
      clear: clock.clear,
      isCurrent: (game) => games.socket === game,
    });

    clearComputerMatchClock(first, clock.clear);
    const second = createSoloTicTacToe(first.difficulty);
    games.socket = second;
    startComputerMatchClock(second, {
      now: clock.now,
      schedule: clock.schedule,
      clear: clock.clear,
      isCurrent: (game) => games.socket === game,
    });

    expect(second.difficulty).toBe("hard");
    expect(second.endsAt).toBe(2_000 + COMPUTER_MATCH_MS);
    expect(second.id).not.toBe(first.id);

    clock.advance(COMPUTER_MATCH_MS);

    expect(first.status).toBe("playing");
    expect(second.status).toBe("time-up");
  });

  test("cleanup stops an old callback from ending a replacement game", () => {
    const clock = fakeClock(0);
    const game = createSoloTicTacToe("easy");
    let expirations = 0;

    startComputerMatchClock(game, {
      now: clock.now,
      schedule: clock.schedule,
      clear: clock.clear,
      onExpire() {
        expirations += 1;
      },
    });

    clearComputerMatchClock(game, clock.clear);
    clock.advance(COMPUTER_MATCH_MS);

    expect(game.status).toBe("playing");
    expect(expirations).toBe(0);
  });
});
