const { submitRPSChoice } = require("../utils/submitRPSChoice");
const {
  removeRPSRoomsForSocket,
  requestRPSRematch,
  respondRPSRematch,
} = require("../utils/rpsRoom");

function makeRooms() {
  return {
    roomA: {
      player1SocketId: "socket-1",
      player2SocketId: "socket-2",
      player1Choice: "Rock",
      player2Choice: null,
      roundClosed: false,
    },
    roomB: {
      player1SocketId: "socket-3",
      player2SocketId: "socket-4",
      player1Choice: null,
      player2Choice: null,
      roundClosed: true,
    },
    waiting: {
      player1SocketId: "socket-1",
      player2SocketId: undefined,
      player1Choice: null,
      player2Choice: null,
      roundClosed: false,
    },
  };
}

describe("RPS disconnect cleanup", () => {
  test("deletes every in-memory room that contains the disconnected socket", () => {
    const rooms = makeRooms();

    const removed = removeRPSRoomsForSocket(rooms, "socket-1");

    expect(removed.sort()).toEqual(["roomA", "waiting"]);
    expect(rooms.roomA).toBeUndefined();
    expect(rooms.waiting).toBeUndefined();
    expect(rooms.roomB.player1SocketId).toBe("socket-3");
  });

  test("deletes a room when player 2 disconnects", () => {
    const rooms = makeRooms();

    expect(removeRPSRoomsForSocket(rooms, "socket-2")).toEqual(["roomA"]);
    expect(rooms.roomA).toBeUndefined();
    expect(rooms.waiting.player1SocketId).toBe("socket-1");
  });

  test("leaves rooms unchanged when the socket is not a player", () => {
    const rooms = makeRooms();

    expect(removeRPSRoomsForSocket(rooms, "socket-9")).toEqual([]);
    expect(Object.keys(rooms).sort()).toEqual(["roomA", "roomB", "waiting"]);
  });

  test("rejects a choice and a rematch after the room is deleted", () => {
    const rooms = makeRooms();
    removeRPSRoomsForSocket(rooms, "socket-2");

    expect(submitRPSChoice(rooms.roomA, "socket-1", "Paper")).toEqual({
      ok: false,
      reason: "not-a-player",
    });
    expect(requestRPSRematch(rooms, "roomA")).toEqual({
      ok: false,
      reason: "room-not-found",
    });
    expect(respondRPSRematch(rooms, "roomA", true)).toEqual({
      ok: false,
      reason: "room-not-found",
    });
  });

  test("still accepts a rematch while the room exists", () => {
    const rooms = makeRooms();

    expect(requestRPSRematch(rooms, "roomB")).toEqual({ ok: true });
    expect(respondRPSRematch(rooms, "roomB", false)).toEqual({
      ok: true,
      start: false,
    });
    expect(rooms.roomB.roundClosed).toBe(true);

    expect(respondRPSRematch(rooms, "roomB", true)).toEqual({
      ok: true,
      start: true,
    });
    expect(rooms.roomB.roundClosed).toBe(false);
    expect(rooms.roomB.player1Choice).toBeNull();
  });
});
