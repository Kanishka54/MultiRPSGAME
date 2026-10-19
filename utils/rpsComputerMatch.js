const getRPSWinner = require("./determineRPSWinner");
const { VALID_RPS_CHOICES } = require("./submitRPSChoice");

let nextMatchId = 1;

function createRPSComputerMatch() {
  return {
    id: nextMatchId++,
    status: "playing",
    playerScore: 0,
    computerScore: 0,
    roundOpen: true,
    endsAt: null,
    timeout: null,
    timerToken: 0,
  };
}

function expired(match, now) {
  return typeof match.endsAt === "number" && now >= match.endsAt;
}

function playRPSComputerRound(match, choice, random = Math.random, now = () => Date.now()) {
  if (!match) return { ok: false, reason: "no-game" };
  if (match.status !== "playing") return { ok: false, reason: "game-over" };
  if (!match.roundOpen) return { ok: false, reason: "round-closed" };

  if (expired(match, now())) {
    match.status = "time-up";
    return { ok: false, reason: "time-up", result: "time-up" };
  }

  if (!VALID_RPS_CHOICES.includes(choice)) {
    return { ok: false, reason: "invalid-choice" };
  }

  const computerChoice =
    VALID_RPS_CHOICES[Math.floor(random() * VALID_RPS_CHOICES.length)];

  if (expired(match, now())) {
    match.status = "time-up";
    return { ok: false, reason: "time-up", result: "time-up" };
  }

  const winner = getRPSWinner(choice, computerChoice);
  if (winner === "player1") match.playerScore += 1;
  if (winner === "player2") match.computerScore += 1;
  match.roundOpen = false;

  return {
    ok: true,
    playerChoice: choice,
    computerChoice,
    winner,
    playerScore: match.playerScore,
    computerScore: match.computerScore,
    endsAt: match.endsAt,
    gameId: match.id,
  };
}

function nextRPSComputerRound(match, now = () => Date.now()) {
  if (!match) return { ok: false, reason: "no-game" };
  if (match.status !== "playing") return { ok: false, reason: "game-over" };
  if (expired(match, now())) {
    match.status = "time-up";
    return { ok: false, reason: "time-up" };
  }

  const endsAt = match.endsAt;
  match.roundOpen = true;
  return { ok: true, endsAt, gameId: match.id };
}

module.exports = {
  createRPSComputerMatch,
  playRPSComputerRound,
  nextRPSComputerRound,
};
