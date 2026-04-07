const cells      = document.querySelectorAll('.cell');
const statusEl   = document.getElementById('status');
const resetBtn   = document.getElementById('reset-btn');
const scoreXEl   = document.getElementById('score-x');
const scoreOEl   = document.getElementById('score-o');
const scoreDEl   = document.getElementById('score-d');
const dotX       = document.getElementById('dot-x');
const dotO       = document.getElementById('dot-o');
const labelX     = document.getElementById('label-x');
const labelO     = document.getElementById('label-o');
const diffBar    = document.getElementById('diff-bar');
const mode2pBtn  = document.getElementById('mode-2p');
const modeBotBtn = document.getElementById('mode-bot');
const diffEasy   = document.getElementById('diff-easy');
const diffHard   = document.getElementById('diff-hard');

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

let board       = Array(9).fill('');
let current     = 'X';
let gameOver    = false;
let botMode     = false;
let botDiff     = 'easy';
let botThinking = false;
let scores      = { X: 0, O: 0, D: 0 };

// =====================
//   Mode & Difficulty
// =====================

mode2pBtn.addEventListener('click', () => {
  if (!botMode) return;
  botMode = false;
  mode2pBtn.classList.add('active');
  modeBotBtn.classList.remove('active');
  diffBar.style.display = 'none';
  labelX.textContent = 'Player X';
  labelO.textContent = 'Player O';
  scores = { X: 0, O: 0, D: 0 };
  updateScoreDisplay();
  resetGame();
});

modeBotBtn.addEventListener('click', () => {
  if (botMode) return;
  botMode = true;
  modeBotBtn.classList.add('active');
  mode2pBtn.classList.remove('active');
  diffBar.style.display = 'flex';
  labelX.textContent = 'You (X)';
  labelO.textContent = 'Bot (O)';
  scores = { X: 0, O: 0, D: 0 };
  updateScoreDisplay();
  resetGame();
});

diffEasy.addEventListener('click', () => {
  if (botDiff === 'easy') return;
  botDiff = 'easy';
  diffEasy.classList.add('active', 'easy');
  diffHard.classList.remove('active', 'hard');
  resetGame();
});

diffHard.addEventListener('click', () => {
  if (botDiff === 'hard') return;
  botDiff = 'hard';
  diffHard.classList.add('active', 'hard');
  diffEasy.classList.remove('active', 'easy');
  resetGame();
});

// =====================
//     Core Logic
// =====================

function checkWinner(b) {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { winner: b[a], combo: [a, c, d] };
    }
  }
  if (b.every(v => v)) return { draw: true };
  return null;
}

function updateDots() {
  dotX.className = 'dot' + (current === 'X' && !gameOver ? ' active-x' : '');
  dotO.className = 'dot' + (current === 'O' && !gameOver ? ' active-o' : '');
}

function updateScoreDisplay() {
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDEl.textContent = scores.D;
}

function placeMarker(idx, player) {
  board[idx] = player;
  cells[idx].innerHTML = '<span class="mark">' + player + '</span>';
  cells[idx].classList.add('taken', player.toLowerCase());
}

function endGame(result) {
  gameOver = true;
  if (result.draw) {
    statusEl.textContent = "It's a draw!";
    statusEl.className = 'status draw';
    scores.D++;
  } else {
    const w = result.winner;
    const label = botMode
      ? (w === 'X' ? 'You win! 🎉' : 'Bot wins!')
      : ('Player ' + w + ' wins!');
    statusEl.textContent = label;
    statusEl.className = 'status winner';
    result.combo.forEach(i => cells[i].classList.add('winning'));
    scores[w]++;
  }
  updateScoreDisplay();
  dotX.className = 'dot';
  dotO.className = 'dot';
}

function handleClick(e) {
  const idx = parseInt(e.currentTarget.dataset.index);
  if (board[idx] || gameOver || botThinking) return;
  if (botMode && current === 'O') return;

  placeMarker(idx, current);
  const result = checkWinner(board);
  if (result) { endGame(result); return; }

  current = current === 'X' ? 'O' : 'X';
  statusEl.className = 'status';

  if (botMode && current === 'O' && !gameOver) {
    doBotMove();
  } else {
    statusEl.textContent = botMode
      ? 'Your turn (X)'
      : ('Player ' + current + "'s turn");
    updateDots();
  }
}

function resetGame() {
  board = Array(9).fill('');
  current = 'X';
  gameOver = false;
  botThinking = false;
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.className = 'cell';
  });
  statusEl.textContent = botMode ? 'Your turn (X)' : "Player X's turn";
  statusEl.className = 'status';
  updateDots();
}

// =====================
//       Bot AI
// =====================

function doBotMove() {
  botThinking = true;
  statusEl.innerHTML =
    'Bot thinking<span class="thinking-dots">' +
    '<span>.</span><span>.</span><span>.</span></span>';
  statusEl.className = 'status thinking';
  dotX.className = 'dot';
  dotO.className = 'dot active-o';

  const delay = botDiff === 'easy' ? 450 : 650;
  setTimeout(() => {
    if (gameOver) { botThinking = false; return; }
    const idx = botDiff === 'easy' ? easyMove() : minimaxMove();
    placeMarker(idx, 'O');
    botThinking = false;
    const result = checkWinner(board);
    if (result) { endGame(result); return; }
    current = 'X';
    statusEl.textContent = 'Your turn (X)';
    statusEl.className = 'status';
    updateDots();
  }, delay);
}

function easyMove() {
  // 30% chance smart move, rest random
  if (Math.random() < 0.3) {
    const smart = smartMove();
    if (smart !== -1) return smart;
  }
  const empty = board.reduce((acc, v, i) => {
    if (!v) acc.push(i);
    return acc;
  }, []);
  return empty[Math.floor(Math.random() * empty.length)];
}

function smartMove() {
  // Win if possible
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const r = checkWinner(board);
      board[i] = '';
      if (r && r.winner === 'O') return i;
    }
  }
  // Block player win
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'X';
      const r = checkWinner(board);
      board[i] = '';
      if (r && r.winner === 'X') return i;
    }
  }
  return -1;
}

function minimaxMove() {
  let best = -Infinity;
  let bestIdx = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, 0, false);
      board[i] = '';
      if (score > best) { best = score; bestIdx = i; }
    }
  }
  return bestIdx;
}

function minimax(b, depth, isMax) {
  const result = checkWinner(b);
  if (result) {
    if (result.draw)           return 0;
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
  }
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = 'O';
        best = Math.max(best, minimax(b, depth + 1, false));
        b[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = 'X';
        best = Math.min(best, minimax(b, depth + 1, true));
        b[i] = '';
      }
    }
    return best;
  }
}

// =====================
//      Init
// =====================

cells.forEach(cell => cell.addEventListener('click', handleClick));
resetBtn.addEventListener('click', resetGame);
updateDots();
