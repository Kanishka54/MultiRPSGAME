console.log("Running Rock Paper Scissors Script");

const socket = io();

let roomUniqueId;
let isPlayer1 = false;
let hasSubmittedChoice = false;
let player1Name = "SAMPLE";
let player2Name = "SAMPLE";
let isPlayer1Turn = false;
let playerName;

function createGame() {
  isPlayer1Turn = true;
  playerName = document.getElementById("playerName").value;
  if (!playerName) {
    alert("Please enter your name");
    return;
  }
  socket.emit("createRPSGame", { playerName });
}

function joinGame() {
  roomUniqueId = document.getElementById("roomUniqueId").value;
  playerName = document.getElementById("playerName").value;
  if (!roomUniqueId || !playerName) {
    alert("Please enter both room code and your name");
    return;
  }
  socket.emit("joinRPSGame", { roomUniqueId, playerName });
  requestRoomData(roomUniqueId);
}

// Insert CSS for tooltips and layout into the DOM
const style = document.createElement("style");
style.textContent = `
  .social-button {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin: 5px;
    background-color: #ffffff;
    border: 1px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    color: #555;
  }

  .social-button:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }

  .tooltip {
    visibility: hidden;
    width: 80px;
    background-color: black;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -40px;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: black transparent transparent transparent;
  }

  .share-menu {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 10px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: -150px;
  }
`;
document.head.appendChild(style);

socket.on("newRPSGame", (data) => {
  roomUniqueId = data.roomUniqueId;
  document.getElementById("initial").style.display = "none";
  document.getElementById("gamePlay").style.display = "block";

  // Create copy button
  let copyButton = document.createElement("button");
  copyButton.innerText = "Copy Code";
  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(roomUniqueId).then(
      () => alert("Code copied successfully!"),
      () => alert("Error in copying code")
    );
  });

  // Create share button and menu
  let shareButton = document.createElement("button");
  shareButton.innerText = "Share";
  shareButton.style.marginLeft = "10px";

  let shareMenuContainer = document.createElement("div");
  shareMenuContainer.id = "shareMenuContainer";
  shareMenuContainer.style.position = "relative";
  shareMenuContainer.style.display = "inline-block";

  let shareMenu = document.createElement("div");
  shareMenu.id = "shareMenu";
  shareMenu.className = "share-menu"; // Use CSS Grid layout
  shareMenu.style.display = "none";
  shareMenu.style.backgroundColor = "white";
  shareMenu.style.boxShadow = "0px 8px 16px 0px rgba(0,0,0,0.2)";
  shareMenu.style.zIndex = "1";
  shareMenu.style.padding = "10px";
  shareMenu.style.borderRadius = "8px";

  // Function to create social buttons with tooltips
  function createSocialButton(iconClass, color, tooltipText, clickHandler) {
    let button = document.createElement("button");
    button.innerHTML = `<i class="${iconClass}" style="color: ${color};"></i>`;
    button.className = "social-button";
    button.addEventListener("click", clickHandler);

    let tooltip = document.createElement("span");
    tooltip.className = "tooltip";
    tooltip.innerText = tooltipText;
    button.appendChild(tooltip);

    return button;
  }

  // Define the social buttons
  let facebookButton = createSocialButton(
    "fab fa-facebook-f",
    "#3b5998",
    "Facebook",
    () => {
      let facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}`;
      window.open(facebookUrl, "_blank");
    }
  );

  let twitterButton = createSocialButton(
    "fab fa-twitter",
    "#1da1f2",
    "Twitter",
    () => {
      let twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}`;
      window.open(twitterUrl, "_blank");
    }
  );

  let whatsappButton = createSocialButton(
    "fab fa-whatsapp",
    "#25d366",
    "WhatsApp",
    () => {
      let whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}`;
      window.open(whatsappUrl, "_blank");
    }
  );

  let redditButton = createSocialButton(
    "fab fa-reddit-alien",
    "#ff4500",
    "Reddit",
    () => {
      let redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}&title=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}`;
      window.open(redditUrl, "_blank");
    }
  );

  let telegramButton = createSocialButton(
    "fab fa-telegram-plane",
    "#0088cc",
    "Telegram",
    () => {
      let telegramUrl = `https://telegram.me/share/url?url=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}&text=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}`;
      window.open(telegramUrl, "_blank");
    }
  );

  let emailButton = createSocialButton(
    "fas fa-envelope",
    "#dd4b39",
    "Email",
    () => {
      let mailUrl = `mailto:?subject=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}&body=${encodeURIComponent(
        `Join my Tic Tac Toe game with this code: ${roomUniqueId}`
      )}`;
      window.location.href = mailUrl;
    }
  );

  // Append the buttons to the share menu
  shareMenu.appendChild(facebookButton);
  shareMenu.appendChild(twitterButton);
  shareMenu.appendChild(whatsappButton);
  shareMenu.appendChild(redditButton);
  shareMenu.appendChild(telegramButton);
  shareMenu.appendChild(emailButton);

  shareMenuContainer.appendChild(shareButton);
  shareMenuContainer.appendChild(shareMenu);

  // Toggle share menu visibility
  shareButton.addEventListener("click", () => {
    shareMenu.style.display =
      shareMenu.style.display === "block" ? "none" : "block";
  });

  // Close the share menu if the user clicks outside of it
  window.onclick = function (event) {
    if (!event.target.matches("#shareMenuContainer button")) {
      shareMenu.style.display = "none";
    }
  };

  const waitingArea = document.getElementById("waitingArea");
  if (waitingArea) {
    waitingArea.innerHTML = `Waiting For Opponent.., Please share code <span style="font-weight: bold; font-style: italic; color: #ff0000">${roomUniqueId}</span>`;
    waitingArea.appendChild(document.createElement("br"));
    waitingArea.appendChild(copyButton);
    waitingArea.appendChild(shareMenuContainer); // Add the share menu container to the DOM
  }
});

function requestRoomData(roomUniqueId) {
  socket.emit("requestRPSRoomData", { roomUniqueId });
}

socket.on("playersConnectedRPS", (data) => {
  requestRoomData(roomUniqueId);
  document.getElementById("initial").style.display = "none";
  document.getElementById("gamePlay").style.display = "block";
  document.getElementById("waitingArea").style.display = "none";
  document.getElementById("gameArea").style.display = "block";
  if (isPlayer1Turn) {
    document.getElementById("ch1").innerText = "You";
    document.getElementById("ch2").innerText = "Opponent";
  } else {
    document.getElementById("ch1").innerText = "You";
    document.getElementById("ch2").innerText = "Opponent";
  }
});

socket.on("rpsChoiceSubmitted", () => {
  const opponentState = document.getElementById("opponentState");
  if (opponentState) {
    opponentState.innerText = "Opponent Made A Choice";
  }
});

socket.on("rpsChoiceRejected", () => {
  hasSubmittedChoice = false;
  document.getElementById("player1Choice").innerHTML = `
        <button onclick="sendChoice('Rock')">Rock</button>
        <button onclick="sendChoice('Paper')">Paper</button>
        <button onclick="sendChoice('Scissors')">Scissors</button>
    `;
});

socket.on("rpsGameResult", (data) => {
    const myChoice = isPlayer1Turn ? data.player1Choice : data.player2Choice;
    const opponentChoice = isPlayer1Turn ? data.player2Choice : data.player1Choice;
    let winnerMessage;

    if (data.winner === "draw") {
        winnerMessage = "It's a draw";
    } else if (data.winner === "player1") {
        winnerMessage = isPlayer1Turn ? "You Win" : "You Lose";
    } else {
        winnerMessage = isPlayer1Turn ? "You Lose" : "You Win";
    }

    displayPlayerChoice(myChoice);
    revealOpponentChoice(opponentChoice);

    document.getElementById("winnerText").innerText = winnerMessage;

    document.getElementById("initial").style.display = "none";
    document.getElementById("gamePlay").style.display = "block";
    document.getElementById("waitingArea").style.display = "none";
    document.getElementById("gameArea").style.display = "block";
    document.getElementById("winnerArea").style.display = "block";
    document.getElementById("player1Choice").style.display = "block";
});

socket.on("roomDataResponse", (data) => {
  const { roomData } = data;
  if (roomData) {
    player1Name = roomData.player1Name;
    player2Name = roomData.player2Name;
    console.log("Room Data:", roomData);
  } else {
    console.error("Room data not found");
  }
});

function roomCapapcity() {
  alert("Room is Full");
}
socket.on("FullRPS", () => {
  roomCapapcity();
});

function sendChoice(choice) {
  if (hasSubmittedChoice) return;
  hasSubmittedChoice = true;
  socket.emit("submitRPSChoice", { choice: choice, roomUniqueId });
  displayPlayerChoice(choice);
}

function displayPlayerChoice(choice) {
  const playerChoiceButton = document.createElement("button");
  playerChoiceButton.style.display = "block";
  playerChoiceButton.innerText = choice;
  document.getElementById("player1Choice").innerHTML = "";
  document.getElementById("player1Choice").appendChild(playerChoiceButton);
}

function revealOpponentChoice(choice) {
  const opponentArea = document.getElementById("player2Choice");
  opponentArea.innerHTML = "";
  const opponentButton = document.createElement("button");
  opponentButton.id = "opponentButton";
  opponentButton.style.display = "block";
  opponentButton.innerText = choice;
  opponentArea.appendChild(opponentButton);
}
const newGameBtn = document.getElementById("new-game");

newGameBtn.addEventListener("click", () => {
    socket.emit("requestNewGameRPS", {
        roomUniqueId,
        isPlayer1,
        playerName
    });
});

socket.on("ConfirmNewGameRPS", (data) => {

    if (data.playerName === playerName) return;

    const answer = confirm(`${data.playerName} wants to play again.`);

    socket.emit("NewGameResponseRPS", {
        response: answer,
        roomUniqueId
    });
});

socket.on("NewGameRPS", () => {
    hasSubmittedChoice = false;

    document.getElementById("player1Choice").innerHTML = `
        <button onclick="sendChoice('Rock')">Rock</button>
        <button onclick="sendChoice('Paper')">Paper</button>
        <button onclick="sendChoice('Scissors')">Scissors</button>
    `;

    document.getElementById("player2Choice").innerHTML =
        '<p id="opponentState">Waiting For Opponent....</p>';

    document.getElementById("winnerText").innerText = "";
    document.getElementById("winnerArea").style.display = "none";
}); 
socket.on("CancelNewGameRPS", () => {
    alert("Opponent declined the new game request.");
});

function resetRPSToLobby() {
  hasSubmittedChoice = false;
  isPlayer1Turn = false;
  roomUniqueId = undefined;

  document.getElementById("initial").style.display = "block";
  document.getElementById("gamePlay").style.display = "none";
  document.getElementById("waitingArea").innerHTML = "";
  document.getElementById("gameArea").style.display = "none";
  document.getElementById("winnerArea").style.display = "none";
  document.getElementById("winnerText").innerText = "";
  document.getElementById("player1Choice").innerHTML = `
        <button onclick="sendChoice('Rock')">Rock</button>
        <button onclick="sendChoice('Paper')">Paper</button>
        <button onclick="sendChoice('Scissors')">Scissors</button>
    `;
  document.getElementById("player2Choice").innerHTML =
    '<p id="opponentState">Waiting For Opponent....</p>';
}

socket.on("rpsOpponentLeft", () => {
  resetRPSToLobby();
  alert("Your opponent disconnected. Please create or join a new game.");
});

socket.on("rpsRematchRejected", () => {
  const gamePlay = document.getElementById("gamePlay");
  if (gamePlay && gamePlay.style.display !== "none") {
    resetRPSToLobby();
  }
});