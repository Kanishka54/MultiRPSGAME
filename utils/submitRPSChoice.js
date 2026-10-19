const getRPSWinner = require("./determineRPSWinner");

const VALID_RPS_CHOICES = ["Rock", "Paper", "Scissors"];

function submitRPSChoice(room, socketId, choice, now = () => Date.now()) {
  if (
    !room ||
    (room.player1SocketId !== socketId && room.player2SocketId !== socketId)
  ) {
    return { ok: false, reason: "not-a-player" };
  }

  if (room.status === "time-up" || room.status === "finished") {
    return { ok: false, reason: "game-over" };
  }

  if (room.roundClosed) {
    return { ok: false, reason: "round-closed" };
  }

  if (typeof room.endsAt === "number" && now() >= room.endsAt) {
    room.status = "time-up";
    return { ok: false, reason: "time-up" };
  }

  if (!VALID_RPS_CHOICES.includes(choice)) {
    return { ok: false, reason: "invalid-choice" };
  }

  const isPlayer1 = room.player1SocketId === socketId;
  const choiceField = isPlayer1 ? "player1Choice" : "player2Choice";

  if (room[choiceField]) {
    return { ok: false, reason: "already-submitted" };
  }

  room[choiceField] = choice;

  if (!room.player1Choice || !room.player2Choice) {
    return {
      ok: true,
      opponentNotice: { submitted: true },
    };
  }

  const player1Choice = room.player1Choice;
  const player2Choice = room.player2Choice;
  const winner = getRPSWinner(player1Choice, player2Choice);

  if (typeof room.endsAt === "number" && now() >= room.endsAt) {
    room.player1Choice = null;
    room.player2Choice = null;
    room.status = "time-up";
    return { ok: false, reason: "time-up" };
  }

  room.player1Choice = null;
  room.player2Choice = null;
  room.roundClosed = true;

  const result = {
    winner,
    player1Choice,
    player2Choice,
  };
  if (typeof room.endsAt === "number") result.endsAt = room.endsAt;

  return { ok: true, result };
}

function openRPSRound(room) {
  if (!room) return;
  room.player1Choice = null;
  room.player2Choice = null;
  room.roundClosed = false;
}

module.exports = {
  submitRPSChoice,
  openRPSRound,
  VALID_RPS_CHOICES,
};
