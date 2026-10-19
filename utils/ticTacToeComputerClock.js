const COMPUTER_MATCH_MS = 60_000;

function startComputerMatchClock(game, options = {}) {
  const now = options.now || Date.now;
  const schedule = options.schedule || setTimeout;
  const clear = options.clear || clearTimeout;

  if (game.timeout) {
    clear(game.timeout);
    game.timeout = null;
  }

  const token = (game.timerToken || 0) + 1;
  game.timerToken = token;
  game.endsAt = now() + COMPUTER_MATCH_MS;

  game.timeout = schedule(() => {
    if (game.timerToken !== token) return;
    if (typeof options.isCurrent === "function" && !options.isCurrent(game)) {
      return;
    }
    if (game.status !== "playing") return;
    if (now() < game.endsAt) return;

    game.status = "time-up";
    game.timeout = null;
    if (typeof options.onExpire === "function") {
      options.onExpire(game);
    }
  }, COMPUTER_MATCH_MS);

  return game;
}

function clearComputerMatchClock(game, clear = clearTimeout) {
  if (!game) return;
  if (game.timeout) {
    clear(game.timeout);
    game.timeout = null;
  }
  game.timerToken = null;
}

module.exports = {
  COMPUTER_MATCH_MS,
  startComputerMatchClock,
  clearComputerMatchClock,
};
