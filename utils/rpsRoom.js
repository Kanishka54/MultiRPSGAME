const { openRPSRound } = require("./submitRPSChoice");
const { clearComputerMatchClock } = require("./ticTacToeComputerClock");

let nextRpsMatchId = 1;

function createRPSFriendRoom(playerName, socketId) {
  return {
    id: nextRpsMatchId++,
    player1: playerName,
    player1SocketId: socketId,
    player2: null,
    player2SocketId: null,
    capacity: true,
    player1Choice: null,
    player2Choice: null,
    roundClosed: false,
    status: "waiting",
    endsAt: null,
    timeout: null,
    timerToken: 0,
  };
}

function renewRPSFriendMatch(room) {
  room.id = nextRpsMatchId++;
  room.player1Choice = null;
  room.player2Choice = null;
  room.roundClosed = false;
  room.status = "playing";
  return room;
}

function removeRPSRoomsForSocket(rpsRooms, socketId) {
  const removedRoomIds = [];

  for (const [roomId, room] of Object.entries(rpsRooms)) {
    if (
      room &&
      (room.player1SocketId === socketId || room.player2SocketId === socketId)
    ) {
      clearComputerMatchClock(room);
      removedRoomIds.push(roomId);
      delete rpsRooms[roomId];
    }
  }

  return removedRoomIds;
}

function requestRPSRematch(rpsRooms, roomId) {
  if (!roomId || !rpsRooms[roomId]) {
    return { ok: false, reason: "room-not-found" };
  }

  return { ok: true };
}

function respondRPSRematch(rpsRooms, roomId, response) {
  const room = roomId ? rpsRooms[roomId] : null;
  if (!room) {
    return { ok: false, reason: "room-not-found" };
  }

  if (response) {
    openRPSRound(room);
    return { ok: true, start: true };
  }

  return { ok: true, start: false };
}

function continueRPSRound(room, now = () => Date.now()) {
  if (!room) return { ok: false, reason: "room-not-found" };
  if (room.status === "time-up" || room.status === "finished") {
    return { ok: false, reason: "game-over" };
  }
  if (typeof room.endsAt === "number" && now() >= room.endsAt) {
    room.status = "time-up";
    return { ok: false, reason: "time-up" };
  }

  const endsAt = room.endsAt;
  openRPSRound(room);
  return { ok: true, endsAt };
}

module.exports = {
  createRPSFriendRoom,
  renewRPSFriendMatch,
  removeRPSRoomsForSocket,
  requestRPSRematch,
  respondRPSRematch,
  continueRPSRound,
};
