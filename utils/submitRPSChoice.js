const getRPSWinner = require("./determineRPSWinner");

const VALID_RPS_CHOICES = ["Rock", "Paper", "Scissors"];

function submitRPSChoice(room, socketId, choice) {
  if (
    !room ||
    (room.player1SocketId !== socketId && room.player2SocketId !== socketId)
  ) {
    return { ok: false, reason: "not-a-player" };
  }

  if (room.roundClosed) {
    return { ok: false, reason: "round-closed" };
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

  room.player1Choice = null;
  room.player2Choice = null;
  room.roundClosed = true;

  return {
    ok: true,
    result: {
      winner,
      player1Choice,
      player2Choice,
    },
  };
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
