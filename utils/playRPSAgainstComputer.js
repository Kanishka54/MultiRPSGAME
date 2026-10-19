const getRPSWinner = require("./determineRPSWinner");
const { VALID_RPS_CHOICES } = require("./submitRPSChoice");

function playRPSAgainstComputer(choice, random = Math.random) {
  if (!VALID_RPS_CHOICES.includes(choice)) {
    return { ok: false, reason: "invalid-choice" };
  }

  const index = Math.floor(random() * VALID_RPS_CHOICES.length);
  const computerChoice = VALID_RPS_CHOICES[index];

  return {
    ok: true,
    playerChoice: choice,
    computerChoice,
    winner: getRPSWinner(choice, computerChoice),
  };
}

module.exports = playRPSAgainstComputer;
