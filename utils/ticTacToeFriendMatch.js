const {
  boardResult,
  emptyCells,
} = require("./playTicTacToeAgainstComputer");

let nextFriendGameId = 1;

function createFriendTicTacToe(player1Name, player1SocketId) {
  return {
    id: nextFriendGameId++,
    player1: player1Name,
    player1SocketId,
    player2: null,
    player2SocketId: null,
    capacity: true,
    board: Array(9).fill(null),
    turn: "O",
    status: "waiting",
    recorded: false,
    endsAt: null,
    timeout: null,
    timerToken: 0,
  };
}

function markForSocket(room, socketId) {
  if (room.player1SocketId === socketId) return "O";
  if (room.player2SocketId === socketId) return "X";
  return null;
}

function applyFriendTicTacToeMove(room, socketId, cellIndex, now = () => Date.now()) {
  if (!room) return { ok: false, reason: "no-game" };

  const mark = markForSocket(room, socketId);
  if (!mark) return { ok: false, reason: "not-a-player" };
  if (room.status === "time-up" || room.status === "finished") {
    return { ok: false, reason: "game-over" };
  }
  if (room.status !== "playing") return { ok: false, reason: "not-ready" };

  if (typeof room.endsAt === "number" && now() >= room.endsAt) {
    room.status = "time-up";
    return {
      ok: false,
      reason: "time-up",
      result: "time-up",
      board: room.board.slice(),
    };
  }

  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
    return { ok: false, reason: "invalid-index" };
  }
  if (room.turn !== mark) return { ok: false, reason: "wrong-turn" };
  if (room.board[cellIndex] != null) return { ok: false, reason: "occupied" };

  room.board[cellIndex] = mark;
  const result = boardResult(room.board);
  if (result !== "playing") {
    room.status = "finished";
  } else {
    room.turn = mark === "O" ? "X" : "O";
  }

  return {
    ok: true,
    board: room.board.slice(),
    result,
    turn: room.turn,
    endsAt: room.endsAt,
    gameId: room.id,
  };
}

function resetFriendTicTacToe(room) {
  if (!room) return null;
  room.id = nextFriendGameId++;
  room.board = Array(9).fill(null);
  room.turn = "O";
  room.status = "playing";
  room.recorded = false;
  return room;
}

module.exports = {
  createFriendTicTacToe,
  applyFriendTicTacToeMove,
  resetFriendTicTacToe,
  emptyCells,
};
