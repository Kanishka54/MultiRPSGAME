function getRPSWinner(p1, p2) {
  if (p1 === p2) {
    return "draw";
  }

  if (
    (p1 === "Paper" && p2 === "Rock") ||
    (p1 === "Rock" && p2 === "Scissors") ||
    (p1 === "Scissors" && p2 === "Paper")
  ) {
    return "player1";
  }

  return "player2";
}

module.exports = getRPSWinner;