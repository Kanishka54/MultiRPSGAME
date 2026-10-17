const { openRPSRound } = require("./submitRPSChoice");

function removeRPSRoomsForSocket(rpsRooms, socketId) {
  const removedRoomIds = [];

  for (const [roomId, room] of Object.entries(rpsRooms)) {
    if (
      room &&
      (room.player1SocketId === socketId || room.player2SocketId === socketId)
    ) {
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

module.exports = {
  removeRPSRoomsForSocket,
  requestRPSRematch,
  respondRPSRematch,
};
