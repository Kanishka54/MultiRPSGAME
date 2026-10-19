require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { connectDB, store } = require("./db");
const bodyParser = require("body-parser");
const session = require("express-session");
const authRouter = require("./client/routes/auth");
const gamesRoutes = require("./client/routes/gamesRoutes");
const userRoutes = require("./client/routes/userRoutes");
const passport = require("./client/routes/passport");
const RPSData = require("./models/RPSData");
const ChessData = require("./models/ChessData");
const TicTacToeData = require("./models/TicTacToeData");
const User = require("./models/User"); // Import User model
const { submitRPSChoice } = require("./utils/submitRPSChoice");
const {
  createRPSComputerMatch,
  playRPSComputerRound,
  nextRPSComputerRound,
} = require("./utils/rpsComputerMatch");
const {
  createRPSFriendRoom,
  renewRPSFriendMatch,
  removeRPSRoomsForSocket,
  requestRPSRematch,
  respondRPSRematch,
  continueRPSRound,
} = require("./utils/rpsRoom");
const {
  createSoloTicTacToe,
  playComputerTurn,
  isComputerDifficulty,
} = require("./utils/playTicTacToeAgainstComputer");
const {
  createFriendTicTacToe,
  applyFriendTicTacToeMove,
  resetFriendTicTacToe,
} = require("./utils/ticTacToeFriendMatch");
const {
  startComputerMatchClock,
  clearComputerMatchClock,
} = require("./utils/ticTacToeComputerClock");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;
const SESSION_SECRET = process.env.SESSION_SECRET;
const chessRooms = {};
const ticTacToeRooms = {};
const soloTicTacToeGames = {};
const rpsComputerMatches = {};
const rpsRooms = {};
const LEVEL_UP_THRESHOLD = 10; // Number of games to level up

const userSocketMap = {}; // Map to track user IDs and socket IDs

// Connect to MongoDB
connectDB();

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use(express.static(path.join(__dirname, "client")));
// Set up view engine and static files
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "client"));

app.use(passport.initialize());
app.use(passport.session()); // This is essential for persistent login sessions
app.use("/auth", authRouter);
app.use("/games", gamesRoutes);
app.use("/u/:username", isAuthenticated, userRoutes);

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login-signup.html?a=0");
}

// Root Route
app.get("/", async (req, res) => {
  const user = req.user ? await User.findById(req.user._id) : { username: "Guest", gamesPlayed: 0, level: 1 };
  const showDropdown = req.user ? req.user : null;

  const games = [
    {
      id: "rockpaperscissors",
      title: "Rock Paper Scissors",
      link: "/games/rockpaperscissors",
      image: "/space-game-background-neon-night-alien-landscape-free-vector.jpg",
      icon: "fas fa-hand-peace",
    },
    {
      id: "tictactoe",
      title: "Tic Tac Toe",
      link: "/games/tictactoe",
      image: "/space-game-background-neon-night-alien-landscape-free-vector.jpg",
      icon: "fas fa-hand-peace",
    },
    {
      id: "chess",
      title: "Chess",
      link: "/games/chess",
      image: "/space-game-background-neon-night-alien-landscape-free-vector.jpg",
      icon: "fas fa-chess",
    },
  ];

  res.render("index", {
    title: "Gaming Arena",
    user: {
      id: req.user ? req.user._id : null,
      name: req.user ? req.user.username : "Guest",
      isLoggedIn: !!req.user,
      gamesPlayed: user.gamesPlayed,
      level: user.level,
    },
    showDropdown,
    games: games,
  });
});


// CHECK THIS ***********
// Middleware to update games played and level
async function updateUserGameCount(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.gamesPlayed += 1;

    // Calculate new level
    const newLevel = Math.floor(user.gamesPlayed / LEVEL_UP_THRESHOLD) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
      // Emit levelUp event to the user's socket
      const socketId = userSocketMap[userId];
      if (socketId) {
        io.to(socketId).emit("levelUp", { level: newLevel });
      }
      console.log(`User ${user.username} leveled up to Level ${newLevel}!`);
    }

    await user.save();
  } catch (error) {
    console.error("Error updating user game count:", error);
  }
}

io.on("connection", (socket) => {
  console.log("A user connected");

  // CHECK THIS ***********
  // Register user ID to socket
  socket.on("registerUser", (userId) => {
    userSocketMap[userId] = socket.id;
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // CHECK THIS ***********
    // Remove user from the map upon disconnection
    for (const [userId, sockId] of Object.entries(userSocketMap)) {
      if (sockId === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }

    const removedRoomIds = removeRPSRoomsForSocket(rpsRooms, socket.id);
    removedRoomIds.forEach((roomId) => {
      io.to(roomId).emit("rpsOpponentLeft");
      io.socketsLeave(roomId);
    });

    clearComputerMatchClock(rpsComputerMatches[socket.id]);
    delete rpsComputerMatches[socket.id];

    clearComputerMatchClock(soloTicTacToeGames[socket.id]);
    delete soloTicTacToeGames[socket.id];

    for (const [roomId, room] of Object.entries(ticTacToeRooms)) {
      if (
        room &&
        (room.player1SocketId === socket.id || room.player2SocketId === socket.id)
      ) {
        clearComputerMatchClock(room);
        delete ticTacToeRooms[roomId];
        io.to(roomId).emit("tttOpponentLeft");
        io.socketsLeave(roomId);
      }
    }
  });

  function rpsFriendClockPayload(room) {
    return {
      endsAt: room.endsAt,
      serverNow: Date.now(),
      gameId: room.id,
      status: room.status,
    };
  }

  function startRPSFriendClock(roomUniqueId, room) {
    startComputerMatchClock(room, {
      isCurrent: (current) => rpsRooms[roomUniqueId] === current,
      onExpire() {
        if (rpsRooms[roomUniqueId] !== room) return;
        clearComputerMatchClock(room);
        io.to(roomUniqueId).emit("rpsTimeUp", rpsFriendClockPayload(room));
      },
    });
  }

  function rpsComputerView(match) {
    return {
      gameId: match.id,
      endsAt: match.endsAt,
      serverNow: Date.now(),
      playerScore: match.playerScore,
      computerScore: match.computerScore,
      status: match.status,
    };
  }

  // === Rock Paper Scissors (RPS) Events ===

  // Create RPS Game
  socket.on("createRPSGame", async (data) => {
    try {
      const roomUniqueId = generateRoomId(5);
      rpsRooms[roomUniqueId] = createRPSFriendRoom(data.playerName, socket.id);

      socket.join(roomUniqueId);
      socket.emit("newRPSGame", { roomUniqueId });

      const gameData = new RPSData({
        roomUniqueId,
        player1Name: data.playerName,
      });
      await gameData.save();
    } catch (error) {
      console.error("Error creating RPS game:", error);
    }
  });

  // Join RPS Game
  socket.on("joinRPSGame", async (data) => {
    try {
      const room = rpsRooms[data.roomUniqueId];
      if (room) {
        if (room.capacity === true) {
          room.player2 = data.playerName;
          room.player2SocketId = socket.id;
          room.capacity = false;
          room.status = "playing";
          socket.join(data.roomUniqueId);
          startRPSFriendClock(data.roomUniqueId, room);
          io.to(data.roomUniqueId).emit(
            "playersConnectedRPS",
            rpsFriendClockPayload(room)
          );
          await RPSData.findOneAndUpdate(
            { roomUniqueId: data.roomUniqueId },
            { player2Name: data.playerName }
          );
        } else {
          socket.emit("FullRPS");
        }
      }
    } catch (error) {
      console.error("Error joining RPS game:", error);
    }
  });

  function beginRPSComputerMatch() {
    clearComputerMatchClock(rpsComputerMatches[socket.id]);
    const match = createRPSComputerMatch();
    rpsComputerMatches[socket.id] = match;
    startComputerMatchClock(match, {
      isCurrent: (current) => rpsComputerMatches[socket.id] === current,
      onExpire() {
        if (rpsComputerMatches[socket.id] !== match) return;
        clearComputerMatchClock(match);
        socket.emit("rpsComputerTimeUp", rpsComputerView(match));
      },
    });
    socket.emit("rpsComputerStarted", rpsComputerView(match));
  }

  socket.on("startRPSComputer", () => {
    beginRPSComputerMatch();
  });

  socket.on("leaveRPSComputer", () => {
    clearComputerMatchClock(rpsComputerMatches[socket.id]);
    delete rpsComputerMatches[socket.id];
  });

  socket.on("nextRPSComputerRound", () => {
    const match = rpsComputerMatches[socket.id];
    const outcome = nextRPSComputerRound(match);
    if (!outcome.ok) {
      if (match && outcome.reason === "time-up") {
        clearComputerMatchClock(match);
        socket.emit("rpsComputerTimeUp", rpsComputerView(match));
        return;
      }
      socket.emit("rpsComputerRejected", { reason: outcome.reason });
      return;
    }

    socket.emit("rpsComputerNext", rpsComputerView(match));
  });

  socket.on("playRPSComputer", (data) => {
    const payload = data || {};
    const match = rpsComputerMatches[socket.id];
    const outcome = playRPSComputerRound(match, payload.choice);

    if (!outcome.ok) {
      if (match && outcome.reason === "time-up") {
        clearComputerMatchClock(match);
        socket.emit("rpsComputerTimeUp", rpsComputerView(match));
        return;
      }
      socket.emit("rpsComputerRejected", { reason: outcome.reason });
      return;
    }

    socket.emit("rpsComputerResult", {
      ...rpsComputerView(match),
      playerChoice: outcome.playerChoice,
      computerChoice: outcome.computerChoice,
      winner: outcome.winner,
    });
  });

  socket.on("submitRPSChoice", async (data) => {
    try {
      const payload = data || {};
      const room = rpsRooms[payload.roomUniqueId];
      const outcome = submitRPSChoice(room, socket.id, payload.choice);

      if (!outcome.ok) {
        if (room && outcome.reason === "time-up") {
          clearComputerMatchClock(room);
          io.to(payload.roomUniqueId).emit("rpsTimeUp", rpsFriendClockPayload(room));
          return;
        }
        socket.emit("rpsChoiceRejected", { reason: outcome.reason });
        return;
      }

      if (outcome.opponentNotice) {
        socket
          .to(payload.roomUniqueId)
          .emit("rpsChoiceSubmitted", outcome.opponentNotice);
        return;
      }

      await finishRPSRound(payload.roomUniqueId, outcome.result);
    } catch (error) {
      console.error("Error handling RPS choice:", error);
    }
  });

  socket.on("nextRPSRound", (data) => {
    const payload = data || {};
    const room = rpsRooms[payload.roomUniqueId];
    const outcome = continueRPSRound(room);
    if (!outcome.ok) {
      if (room && (outcome.reason === "time-up" || room.status === "time-up")) {
        clearComputerMatchClock(room);
        io.to(payload.roomUniqueId).emit("rpsTimeUp", rpsFriendClockPayload(room));
        return;
      }
      socket.emit("rpsChoiceRejected", { reason: outcome.reason });
      return;
    }

    io.to(payload.roomUniqueId).emit("rpsNextRound", rpsFriendClockPayload(room));
  });

  // Request Room Data for RPS
  socket.on("requestRPSRoomData", async ({ roomUniqueId }) => {
    try {
      const roomData = await RPSData.findOne({ roomUniqueId }).lean();
      if (roomData) {
        delete roomData.player1Choice;
        delete roomData.player2Choice;
      }
      socket.emit("roomDataResponse", { roomData });
    } catch (error) {
      console.error("Error requesting RPS room data:", error);
    }
  });
  socket.on("requestNewGameRPS", (data) => {
    const payload = data || {};
    const decision = requestRPSRematch(rpsRooms, payload.roomUniqueId);
    if (!decision.ok) {
      socket.emit("rpsRematchRejected", { reason: decision.reason });
      return;
    }

    console.log("New Game Requested:", payload.roomUniqueId, payload.playerName);

    io.to(payload.roomUniqueId).emit("ConfirmNewGameRPS", {
        isPlayer1: payload.isPlayer1,
        playerName: payload.playerName,
    });
});

socket.on("NewGameResponseRPS", (data) => {
    const payload = data || {};
    const decision = respondRPSRematch(
      rpsRooms,
      payload.roomUniqueId,
      payload.response
    );
    if (!decision.ok) {
      socket.emit("rpsRematchRejected", { reason: decision.reason });
      return;
    }

    console.log("Response:", payload.response);

    if (decision.start) {
        console.log("Starting new game");
        const room = rpsRooms[payload.roomUniqueId];
        renewRPSFriendMatch(room);
        startRPSFriendClock(payload.roomUniqueId, room);
        io.to(payload.roomUniqueId).emit("NewGameRPS", rpsFriendClockPayload(room));
    } else {
        console.log("New game declined");
        socket.to(payload.roomUniqueId).emit("CancelNewGameRPS");
    }
});


  function publishSoloTicTacToe(game) {
    socket.emit("tttComputerState", {
      ok: true,
      board: game.board.slice(),
      result: game.status,
      endsAt: game.endsAt,
      serverNow: Date.now(),
      gameId: game.id,
    });
  }

  function beginSoloTicTacToe(difficulty) {
    const previous = soloTicTacToeGames[socket.id];
    clearComputerMatchClock(previous);

    const game = createSoloTicTacToe(difficulty);
    soloTicTacToeGames[socket.id] = game;
    startComputerMatchClock(game, {
      isCurrent: (current) => soloTicTacToeGames[socket.id] === current,
      onExpire() {
        if (soloTicTacToeGames[socket.id] !== game) return;
        clearComputerMatchClock(game);
        publishSoloTicTacToe(game);
      },
    });
    publishSoloTicTacToe(game);
  }

  socket.on("startTicTacToeComputer", (data) => {
    const difficulty = data && data.difficulty;
    if (!isComputerDifficulty(difficulty)) {
      socket.emit("tttComputerRejected", { reason: "invalid-difficulty" });
      return;
    }

    beginSoloTicTacToe(difficulty);
  });

  socket.on("resetTicTacToeComputer", () => {
    const existing = soloTicTacToeGames[socket.id];
    if (!existing) {
      socket.emit("tttComputerRejected", { reason: "no-game" });
      return;
    }

    beginSoloTicTacToe(existing.difficulty);
  });

  socket.on("leaveTicTacToeComputer", () => {
    clearComputerMatchClock(soloTicTacToeGames[socket.id]);
    delete soloTicTacToeGames[socket.id];
  });

  socket.on("tttComputerMove", (data) => {
    const game = soloTicTacToeGames[socket.id];
    const outcome = playComputerTurn(game, data && data.index);

    if (!outcome.ok) {
      if (game && outcome.reason === "time-up") {
        clearComputerMatchClock(game);
        publishSoloTicTacToe(game);
        return;
      }
      socket.emit("tttComputerRejected", { reason: outcome.reason });
      return;
    }

    if (outcome.result !== "playing") {
      clearComputerMatchClock(game);
    }

    publishSoloTicTacToe(game);
  });

  function friendTicTacToeView(room, result) {
    return {
      board: room.board.slice(),
      result: result || (room.status === "playing" ? "playing" : room.status),
      turn: room.turn,
      endsAt: room.endsAt,
      serverNow: Date.now(),
      gameId: room.id,
      player1: room.player1,
      player2: room.player2,
    };
  }

  function expireFriendTicTacToe(roomUniqueId, room) {
    if (ticTacToeRooms[roomUniqueId] !== room) return;
    if (room.recorded) return;
    if (room.status !== "playing" && room.status !== "time-up") return;
    room.status = "time-up";
    room.recorded = true;
    clearComputerMatchClock(room);
    io.to(roomUniqueId).emit("tttFriendState", friendTicTacToeView(room, "time-up"));
    recordTicTacToeResult(roomUniqueId, "Draw");
  }

  function startFriendTicTacToeClock(roomUniqueId, room) {
    startComputerMatchClock(room, {
      isCurrent: (current) => ticTacToeRooms[roomUniqueId] === current,
      onExpire() {
        expireFriendTicTacToe(roomUniqueId, room);
      },
    });
  }

  function restartFriendTicTacToe(roomUniqueId) {
    const room = ticTacToeRooms[roomUniqueId];
    if (!room || !room.player2SocketId) return null;
    clearComputerMatchClock(room);
    resetFriendTicTacToe(room);
    startFriendTicTacToeClock(roomUniqueId, room);
    io.to(roomUniqueId).emit("tttFriendState", friendTicTacToeView(room, "playing"));
    return room;
  }

  // === Tic Tac Toe Events ===

  // Create Tic Tac Toe Game
  socket.on("createTicTacToeGame", async (data) => {
    try {
      const roomUniqueId = generateRoomId(5);
      ticTacToeRooms[roomUniqueId] = createFriendTicTacToe(
        data.playerName,
        socket.id
      );
      socket.join(roomUniqueId);
      socket.emit("playersConnectingTicTacToe", { roomUniqueId });

      const gameData = new TicTacToeData({
        roomUniqueId,
        player1Name: data.playerName,
      });
      await gameData.save();
    } catch (error) {
      console.error("Error creating Tic Tac Toe game:", error);
    }
  });

  // Join Tic Tac Toe Game
  socket.on("joinTicTacToeGame", async (data) => {
    try {
      const room = ticTacToeRooms[data.roomUniqueId];
      if (room) {
        if (room.capacity === true) {
          room.player2 = data.playerName;
          room.player2SocketId = socket.id;
          room.capacity = false;
          room.status = "playing";
          socket.join(data.roomUniqueId);
          startFriendTicTacToeClock(data.roomUniqueId, room);
          io.to(data.roomUniqueId).emit(
            "playersConnectedTicTacToe",
            friendTicTacToeView(room, "playing")
          );
          await TicTacToeData.findOneAndUpdate(
            { roomUniqueId: data.roomUniqueId },
            { player2Name: data.playerName }
          );
          room.capacity = false;
        } else {
          socket.emit("FullTicTacToe");
        }
      }
    } catch (error) {
      console.error("Error joining Tic Tac Toe game:", error);
    }
  });

  socket.on("tttFriendMove", async (data) => {
    const payload = data || {};
    const room = ticTacToeRooms[payload.roomUniqueId];
    const outcome = applyFriendTicTacToeMove(room, socket.id, payload.index);

    if (!outcome.ok) {
      if (room && outcome.reason === "time-up") {
        expireFriendTicTacToe(payload.roomUniqueId, room);
        return;
      }
      socket.emit("tttFriendRejected", {
        reason: outcome.reason,
        gameId: room && room.id,
      });
      return;
    }

    if (outcome.result !== "playing" && !room.recorded) {
      room.recorded = true;
      clearComputerMatchClock(room);
      const winnerLabel =
        outcome.result === "o-win"
          ? room.player1
          : outcome.result === "x-win"
            ? room.player2
            : "Draw";
      await recordTicTacToeResult(payload.roomUniqueId, winnerLabel);
    }

    io.to(payload.roomUniqueId).emit(
      "tttFriendState",
      friendTicTacToeView(room, outcome.result)
    );
  });

  socket.on("player1Move", () => {});

  socket.on("player2Move", () => {});

  // Announce Tic Tac Toe Winner
  socket.on("announceWinner", async (data) => {
    const { winner, roomUniqueId, count, ok } = data;
    await TicTacToeData.findOneAndUpdate(
      { roomUniqueId },
      { $push: { winner: winner } },
      { new: true }
    );
    socket.to(roomUniqueId).emit("announceWinner", { data })


    // CHECK THIS ***********
    // Update games played and level for both players
    const gameData = await TicTacToeData.findOne({ roomUniqueId });
    if (gameData) {
      const player1 = await User.findOne({ username: gameData.player1Name });
      const player2 = await User.findOne({ username: gameData.player2Name });

      if (player1) {
        updateUserGameCount(player1._id);
      }
      if (player2) {
        updateUserGameCount(player2._id);
      }
    }
  });

  // Announce Tic Tac Toe Draw
  socket.on("announceDraw", async (data) => {
    const { roomUniqueId, count, ok } = data;
    await TicTacToeData.findOneAndUpdate(
      { roomUniqueId },
      { $push: { winner: "Draw" } },
      { new: true }
    );
    socket.to(roomUniqueId).emit("announceDraw", { data });


    // CHECK THIS ***********
    // Update games played and level for both players
    const gameData = await TicTacToeData.findOne({ roomUniqueId });
    if (gameData) {
      const player1 = await User.findOne({ username: gameData.player1Name });
      const player2 = await User.findOne({ username: gameData.player2Name });

      if (player1) {
        updateUserGameCount(player1._id);
      }
      if (player2) {
        updateUserGameCount(player2._id);
      }
    }
  });

  // Request Room Data for Tic Tac Toe
  socket.on("requestTicTacToeRoomData", async ({ roomUniqueId }) => {
    try {
      const roomData = await TicTacToeData.findOne({ roomUniqueId });
      socket.emit("roomDataResponse", { roomData });
    } catch (error) {
      console.error("Error requesting Tic Tac Toe room data:", error);
    }
  });

  socket.on("requestResetGameTicTacToe", (data) => {
    socket.to(data.roomUniqueId).emit("ConfirmResetGameTicTacToe", {
      isplayer1: data.isplayer1,
    });
  });
  // Request of Reseting the game Board

  socket.on("resetResponseTicTacToe", ({ response, roomUniqueId }) => {
    if (response === true) {
      if (!restartFriendTicTacToe(roomUniqueId)) {
        socket.emit("tttFriendRejected", { reason: "no-game" });
      }
    } else {
      socket.to(roomUniqueId).emit("CancelingRequestResetGameTicTacToc");
    }
  });

  socket.on("requestNewGameTicTacToe", (data) => {
    socket.to(data.roomUniqueId).emit("ConfirmNewGameTicTacToe", {
      isplayer1: data.isplayer1,
    });
  });
  socket.on("NewGameResponseTicTacToe", ({ response, roomUniqueId }) => {
    if (response === true) {
      if (!restartFriendTicTacToe(roomUniqueId)) {
        socket.emit("tttFriendRejected", { reason: "no-game" });
      }
    } else {
      socket.to(roomUniqueId).emit("CancelingRequestNewGameTicTacToc");
    }
  });

  // === Chess Events ===

  var isplayer12 = false;
  socket.on("createChessGame", async (data) => {
    console.log("Hi");
    isplayer12 = data.isPlayer1Turn;
    try {
      const roomUniqueId = generateRoomId(5);
      chessRooms[roomUniqueId] = {
        player1: data.playerName,
        capacity: true,
        player1Color: "white",
        player2Color: "black",
        roomUniqueId,
      };
      console.log("rooms");
      console.log(chessRooms[roomUniqueId]);
      socket.join(roomUniqueId);
      socket.emit("playersConnectingChess", { roomUniqueId });

      const gameData = new ChessData({
        roomUniqueId,
        player1Name: data.playerName,
        player1Color: "white",
        player2Color: "black",
      });
      await gameData.save();
    } catch (error) {
      console.error("Error creating Chess game:", error);
    }
  });

  // Join Chess Game
  socket.on("joinChessGame", async (data) => {
    console.log("Joining Button2");
    console.log("data", data);
    try {
      const room = chessRooms[data.roomUniqueId];
      console.log(room);
      if (room) {
        if (room.capacity === true) {
          room.player2 = data.playerName;
          console.log("roooooms");
          console.log(room);
          socket.join(data.roomUniqueId);
          io.to(data.roomUniqueId).emit("playersConnectedChess");
          await ChessData.findOneAndUpdate(
            { roomUniqueId: data.roomUniqueId },
            { player2Name: data.playerName }
          );
          room.capacity = false;

          // CHECK THIS ***********
          // Update games played and level for both players
          const gameData = await ChessData.findOne({ roomUniqueId: data.roomUniqueId });
          if (gameData) {
            const player1 = await User.findOne({ username: gameData.player1Name });
            const player2 = await User.findOne({ username: gameData.player2Name });

            if (player1) {
              updateUserGameCount(player1._id);
            }
            if (player2) {
              updateUserGameCount(player2._id);
            }
          }
        } else {
          socket.emit("FullChess");
        }
      } else {
        // Handle invalid room
        // CHECK THIS ***********
        socket.emit("InvalidChessRoom");
      }
    } catch (error) {
      console.error("Error joining Chess game:", error);
    }
  });

  // Chess Moves (Assuming you have existing logic)
  let currentCode = null;

  socket.on("move", function (data) {
    const move = data.theMove;
    const timer = data.timer;
    const moveObj = data.moveObj;
    console.log("move detected");
    console.log(data);

    io.to(currentCode).emit("newMove", data);
  });
  socket.on("joinGame", function (data) {
    const roomId = data.code;
    currentCode = data.code;
    socket.join(roomId);
    if (!chessRooms[currentCode]) {
      chessRooms[currentCode] = true;
      return;
    }
    socket.emit("startGame");
  });
});

async function finishRPSRound(roomUniqueId, result) {
  const room = rpsRooms[roomUniqueId];
  io.to(roomUniqueId).emit("rpsGameResult", {
    winner: result.winner,
    player1Choice: result.player1Choice,
    player2Choice: result.player2Choice,
    endsAt: room && room.endsAt,
    serverNow: Date.now(),
    gameId: room && room.id,
  });

  await RPSData.findOneAndUpdate(
    { roomUniqueId },
    {
      winner: result.winner,
      player1Choice: result.player1Choice,
      player2Choice: result.player2Choice,
    }
  );

  // Get players' information
  const gameData = await RPSData.findOne({ roomUniqueId });

  if (gameData) {
    const player1 = await User.findOne({
      username: gameData.player1Name,
    });

    const player2 = await User.findOne({
      username: gameData.player2Name,
    });

    if (player1) {
      updateUserGameCount(player1._id);
    }

    if (player2) {
      updateUserGameCount(player2._id);
    }
  }
}

async function recordTicTacToeResult(roomUniqueId, winnerLabel) {
  try {
    await TicTacToeData.findOneAndUpdate(
      { roomUniqueId },
      { $push: { winner: winnerLabel } },
      { new: true }
    );

    const gameData = await TicTacToeData.findOne({ roomUniqueId });
    if (!gameData) return;

    const player1 = await User.findOne({ username: gameData.player1Name });
    const player2 = await User.findOne({ username: gameData.player2Name });
    if (player1) updateUserGameCount(player1._id);
    if (player2) updateUserGameCount(player2._id);
  } catch (error) {
    console.error("Error recording Tic Tac Toe result:", error);
  }
}

// Generate Room ID
function generateRoomId(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Route for serving Chess game with white color
app.get("/white", async (req, res) => {
  const roomUniqueId = req.query.code;
  if (!chessRooms[roomUniqueId]) {
    return res.redirect("/?error=invalidCode");
  }
  res.render("game", {
    color: "white",
  });
});

// Route for serving Chess game with black color
app.get("/black", async (req, res) => {
  const roomUniqueId = req.query.code;
  if (!chessRooms[roomUniqueId]) {
    return res.redirect("/?error=invalidCode");
  }
  res.render("game", {
    color: "black",
  });
});

server.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
