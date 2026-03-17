const teamData = [
  {
    team: "Team 1",
    name: "Krembil Research Institute",
    address: "60 Leonard Ave, Toronto, ON M5T 0S8",
    route:
      "Head east toward Spadina or University, continue south through downtown, then east on Front Street to Union Station.",
    walkTime: "35-45 min",
  },
  {
    team: "Team 2",
    name: "John P. Robarts Research Library",
    address: "130 St George St, Toronto, ON M5S 0C2",
    route:
      "Cut southeast through the U of T and Queen's Park area, continue south on University Avenue, then east on Front Street to Union Station.",
    walkTime: "40-50 min",
  },
  {
    team: "Team 3",
    name: "Coronation Park",
    address: "711 Lake Shore Blvd W, Toronto, ON M5V 1A7",
    route:
      "Follow the waterfront east via Queens Quay or the waterfront trail, then head north into Union Station.",
    walkTime: "30-40 min",
  },
  {
    team: "Team 4",
    name: "Regent Park",
    address: "620 Dundas St E, Toronto, ON M5A 3S4",
    route:
      "Walk west along Dundas Street or Queen Street into downtown, then head south to Front Street and continue to Union Station.",
    walkTime: "40-50 min",
  },
  {
    team: "Team 5",
    name: "Wellesley-Magill Park",
    address: "125 Homewood Ave, Toronto, ON M4Y 0A6",
    route:
      "Head southwest toward Yonge Street or Bay Street, walk south through downtown, then continue along Front Street to Union Station.",
    walkTime: "45-60 min",
  },
];

const defaultChallenges = [
  "Movie Trailer Shot: Film a 10-second dramatic trailer for your team's race to Union.",
  "Toronto Meme: Recreate a meme using something you find on the street.",
  "Stranger Cameo: Get a stranger to say your team name on video.",
  "Landmark Proof: Take a creative photo with a recognizable Toronto landmark.",
  "Chaotic Commercial: Film a fake ad for a random everyday object.",
];

const speedPointsMap = {
  1: 40,
  2: 32,
  3: 24,
  4: 16,
  5: 8,
};

const storageKeys = {
  challenges: "race-to-union-challenges",
  scores: "race-to-union-scores",
};

const teamGrid = document.querySelector("#team-grid");
const challengeList = document.querySelector("#challenge-list");
const scoreboardBody = document.querySelector("#scoreboard-body");
const teamCardTemplate = document.querySelector("#team-card-template");
const challengeItemTemplate = document.querySelector("#challenge-item-template");
const scoreRowTemplate = document.querySelector("#score-row-template");
const resetScoresButton = document.querySelector("#reset-scores");
const resetChallengesButton = document.querySelector("#reset-challenges");

function readStoredJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function renderTeams() {
  teamData.forEach((teamInfo) => {
    const fragment = teamCardTemplate.content.cloneNode(true);
    fragment.querySelector(".team-badge").textContent = teamInfo.team;
    fragment.querySelector(".walk-time").textContent = teamInfo.walkTime;
    fragment.querySelector("h3").textContent = teamInfo.name;
    fragment.querySelector(".team-address").textContent = teamInfo.address;
    fragment.querySelector(".team-route").textContent = teamInfo.route;
    teamGrid.appendChild(fragment);
  });
}

function renderChallenges() {
  const challengeValues = readStoredJson(storageKeys.challenges, defaultChallenges);

  challengeValues.forEach((challenge, index) => {
    const fragment = challengeItemTemplate.content.cloneNode(true);
    const label = fragment.querySelector(".challenge-label");
    const textarea = fragment.querySelector("textarea");

    label.textContent = `Challenge ${index + 1}`;
    textarea.value = challenge;
    textarea.dataset.index = String(index);
    textarea.addEventListener("input", handleChallengeChange);

    challengeList.appendChild(fragment);
  });
}

function createDefaultScoreState() {
  return teamData.map((teamInfo) => ({
    team: teamInfo.team,
    rank: "",
    challengesCompleted: 0,
    creativity: 0,
  }));
}

function getScoreState() {
  const state = readStoredJson(storageKeys.scores, createDefaultScoreState());

  if (!Array.isArray(state) || state.length !== teamData.length) {
    return createDefaultScoreState();
  }

  return state;
}

function calculateScore(rowState) {
  const parsedRank = Number(rowState.rank);
  const speedPoints = speedPointsMap[parsedRank] || 0;
  const challengeCount = Math.max(0, Math.min(5, Number(rowState.challengesCompleted) || 0));
  const challengePoints = challengeCount * 8;
  const creativity = Math.max(0, Math.min(20, Number(rowState.creativity) || 0));
  const total = speedPoints + challengePoints + creativity;

  return { speedPoints, challengeCount, challengePoints, creativity, total };
}

function saveScoreState(state) {
  window.localStorage.setItem(storageKeys.scores, JSON.stringify(state));
}

function renderScoreboard() {
  const scoreState = getScoreState();
  scoreboardBody.innerHTML = "";

  scoreState.forEach((rowState, index) => {
    const fragment = scoreRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    const rankSelect = fragment.querySelector(".arrival-rank");
    const challengeInput = fragment.querySelector(".challenge-count");
    const creativityInput = fragment.querySelector(".creativity-score");

    const teamNameCell = fragment.querySelector(".team-name-cell");
    const speedCell = fragment.querySelector(".speed-points");
    const challengePointsCell = fragment.querySelector(".challenge-points");
    const totalCell = fragment.querySelector(".total-points");

    teamNameCell.textContent = rowState.team;
    rankSelect.value = rowState.rank;
    challengeInput.value = rowState.challengesCompleted;
    creativityInput.value = rowState.creativity;

    const syncRow = () => {
      const currentState = getScoreState();
      currentState[index] = {
        team: rowState.team,
        rank: rankSelect.value,
        challengesCompleted: challengeInput.value,
        creativity: creativityInput.value,
      };

      saveScoreState(currentState);
      const result = calculateScore(currentState[index]);
      speedCell.textContent = String(result.speedPoints);
      challengeInput.value = String(result.challengeCount);
      creativityInput.value = String(result.creativity);
      challengePointsCell.textContent = String(result.challengePoints);
      totalCell.textContent = String(result.total);
    };

    rankSelect.addEventListener("change", syncRow);
    challengeInput.addEventListener("input", syncRow);
    creativityInput.addEventListener("input", syncRow);

    const initialResult = calculateScore(rowState);
    speedCell.textContent = String(initialResult.speedPoints);
    challengePointsCell.textContent = String(initialResult.challengePoints);
    totalCell.textContent = String(initialResult.total);

    scoreboardBody.appendChild(row);
  });
}

function handleChallengeChange(event) {
  const index = Number(event.target.dataset.index);
  const challengeValues = readStoredJson(storageKeys.challenges, defaultChallenges);
  challengeValues[index] = event.target.value;
  window.localStorage.setItem(storageKeys.challenges, JSON.stringify(challengeValues));
}

function resetChallenges() {
  window.localStorage.setItem(storageKeys.challenges, JSON.stringify(defaultChallenges));
  challengeList.innerHTML = "";
  renderChallenges();
}

function resetScores() {
  saveScoreState(createDefaultScoreState());
  renderScoreboard();
}

resetChallengesButton.addEventListener("click", resetChallenges);
resetScoresButton.addEventListener("click", resetScores);

renderTeams();
renderChallenges();
renderScoreboard();
