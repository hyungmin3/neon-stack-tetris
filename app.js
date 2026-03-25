(() => {
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const PREVIEW_GRID_SIZE = 4;
  const BASE_DROP_INTERVAL = 1000;
  const MIN_DROP_INTERVAL = 140;
  const SOFT_DROP_INTERVAL = 55;
  const STORAGE_KEY = "neon-stack-best-score";
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const COLORS = {
    I: "#70e1ff",
    O: "#ffd166",
    T: "#c77dff",
    S: "#7bd88f",
    Z: "#ff6b6b",
    J: "#6cb8ff",
    L: "#ff9f43"
  };

  const TETROMINOS = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  };

  const canvas = document.getElementById("game-board");
  const context = canvas.getContext("2d");
  const scoreValue = document.getElementById("score-value");
  const bestScoreValue = document.getElementById("best-score-value");
  const linesValue = document.getElementById("lines-value");
  const levelValue = document.getElementById("level-value");
  const statusValue = document.getElementById("status-value");
  const pauseButton = document.getElementById("pause-button");
  const restartButton = document.getElementById("restart-button");
  const overlay = document.getElementById("board-overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayCopy = document.getElementById("overlay-copy");
  const overlayButton = document.getElementById("overlay-button");
  const previewCells = Array.from(document.querySelectorAll("[data-preview-cell]"));
  const touchButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    board: createBoard(),
    activePiece: null,
    nextPiece: null,
    score: 0,
    linesCleared: 0,
    level: 1,
    bestScore: loadBestScore(),
    isPaused: false,
    isGameOver: false,
    softDropHeld: false,
    inputQueue: []
  };

  let bag = [];
  let gravityAccumulator = 0;
  let lastFrameTime = 0;

  function createBoard() {
    return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function rotateMatrix(matrix) {
    return matrix[0].map((_, columnIndex) =>
      matrix.map((row) => row[columnIndex]).reverse()
    );
  }

  function getTopPadding(matrix) {
    let padding = 0;

    while (padding < matrix.length && matrix[padding].every((cell) => cell === 0)) {
      padding += 1;
    }

    return padding;
  }

  function shuffle(values) {
    const items = values.slice();

    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }

    return items;
  }

  function refillBag() {
    bag = shuffle(Object.keys(TETROMINOS));
  }

  function drawPieceType() {
    if (!bag.length) {
      refillBag();
    }

    return bag.pop();
  }

  function createPiece(type) {
    const matrix = cloneMatrix(TETROMINOS[type]);

    return {
      type,
      rotation: 0,
      matrix,
      x: Math.floor((BOARD_WIDTH - matrix[0].length) / 2),
      y: -getTopPadding(matrix)
    };
  }

  function getDropInterval() {
    return Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL - (state.level - 1) * 80);
  }

  function loadBestScore() {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      const parsedValue = Number.parseInt(rawValue || "0", 10);
      return Number.isFinite(parsedValue) ? parsedValue : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBestScore() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(state.bestScore));
    } catch (error) {
      return;
    }
  }

  function syncBestScore() {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore();
    }
  }

  function addScore(points) {
    state.score += points;
    syncBestScore();
  }

  function resetGame() {
    bag = [];
    gravityAccumulator = 0;
    state.board = createBoard();
    state.score = 0;
    state.linesCleared = 0;
    state.level = 1;
    state.isPaused = false;
    state.isGameOver = false;
    state.softDropHeld = false;
    state.inputQueue.length = 0;
    state.activePiece = createPiece(drawPieceType());
    state.nextPiece = createPiece(drawPieceType());
    render();
  }

  function hasCollision(piece, offsetX, offsetY, matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) {
          continue;
        }

        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;

        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return true;
        }

        if (boardY >= 0 && state.board[boardY][boardX]) {
          return true;
        }
      }
    }

    return false;
  }

  function movePiece(offsetX, offsetY) {
    if (hasCollision(state.activePiece, offsetX, offsetY, state.activePiece.matrix)) {
      return false;
    }

    state.activePiece.x += offsetX;
    state.activePiece.y += offsetY;
    return true;
  }

  function rotatePiece() {
    if (state.activePiece.type === "O") {
      return true;
    }

    const rotatedMatrix = rotateMatrix(state.activePiece.matrix);
    const kickOffsets = [0, -1, 1, -2, 2];

    for (const offset of kickOffsets) {
      if (!hasCollision(state.activePiece, offset, 0, rotatedMatrix)) {
        state.activePiece.x += offset;
        state.activePiece.matrix = rotatedMatrix;
        state.activePiece.rotation = (state.activePiece.rotation + 1) % 4;
        return true;
      }
    }

    return false;
  }

  function mergePiece(piece) {
    let overflowed = false;

    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) {
          continue;
        }

        const boardX = piece.x + x;
        const boardY = piece.y + y;

        if (boardY < 0) {
          overflowed = true;
          continue;
        }

        state.board[boardY][boardX] = piece.type;
      }
    }

    return overflowed;
  }

  function clearCompletedLines() {
    let clearedLines = 0;
    const remainingRows = [];

    for (const row of state.board) {
      if (row.every((cell) => cell !== null)) {
        clearedLines += 1;
      } else {
        remainingRows.push(row.slice());
      }
    }

    while (remainingRows.length < BOARD_HEIGHT) {
      remainingRows.unshift(Array(BOARD_WIDTH).fill(null));
    }

    state.board = remainingRows;
    return clearedLines;
  }

  function applyLineClearScore(clearedLines) {
    if (!clearedLines) {
      return;
    }

    state.score += LINE_SCORES[clearedLines] * state.level;
    state.linesCleared += clearedLines;
    state.level = Math.floor(state.linesCleared / 10) + 1;
    syncBestScore();
  }

  function spawnNextPiece() {
    state.activePiece = state.nextPiece;
    state.activePiece.x = Math.floor((BOARD_WIDTH - state.activePiece.matrix[0].length) / 2);
    state.activePiece.y = -getTopPadding(state.activePiece.matrix);
    state.activePiece.rotation = 0;
    state.nextPiece = createPiece(drawPieceType());

    if (hasCollision(state.activePiece, 0, 0, state.activePiece.matrix)) {
      state.isGameOver = true;
      state.softDropHeld = false;
      syncBestScore();
    }
  }

  function lockPiece() {
    const overflowed = mergePiece(state.activePiece);

    if (overflowed) {
      state.isGameOver = true;
      state.softDropHeld = false;
      syncBestScore();
      return;
    }

    const clearedLines = clearCompletedLines();
    applyLineClearScore(clearedLines);
    spawnNextPiece();
  }

  function attemptSoftDrop() {
    if (movePiece(0, 1)) {
      addScore(1);
      return;
    }

    lockPiece();
    gravityAccumulator = 0;
  }

  function applyGravityStep() {
    if (movePiece(0, 1)) {
      return;
    }

    lockPiece();
    gravityAccumulator = 0;
  }

  function hardDrop() {
    let distance = 0;

    while (movePiece(0, 1)) {
      distance += 1;
    }

    if (distance > 0) {
      addScore(distance * 2);
    }

    lockPiece();
    gravityAccumulator = 0;
  }

  function enqueueAction(action) {
    state.inputQueue.push(action);
  }

  function togglePause() {
    if (state.isGameOver) {
      return;
    }

    state.isPaused = !state.isPaused;
    state.softDropHeld = false;
    gravityAccumulator = 0;
  }

  function flushInputQueue() {
    while (state.inputQueue.length > 0) {
      const action = state.inputQueue.shift();

      if (action === "restart") {
        resetGame();
        continue;
      }

      if (action === "togglePause") {
        togglePause();
        continue;
      }

      if (state.isPaused || state.isGameOver) {
        continue;
      }

      switch (action) {
        case "moveLeft":
          movePiece(-1, 0);
          break;
        case "moveRight":
          movePiece(1, 0);
          break;
        case "rotateClockwise":
          rotatePiece();
          break;
        case "softDrop":
          attemptSoftDrop();
          break;
        case "hardDrop":
          hardDrop();
          break;
        default:
          break;
      }
    }
  }

  function update(deltaTime) {
    flushInputQueue();

    if (state.isPaused || state.isGameOver) {
      return;
    }

    const activeDropInterval = state.softDropHeld ? SOFT_DROP_INTERVAL : getDropInterval();
    gravityAccumulator += deltaTime;

    while (gravityAccumulator >= activeDropInterval && !state.isPaused && !state.isGameOver) {
      gravityAccumulator -= activeDropInterval;
      applyGravityStep();
    }
  }

  function getGhostOffset() {
    let offset = 0;

    while (!hasCollision(state.activePiece, 0, offset + 1, state.activePiece.matrix)) {
      offset += 1;
    }

    return offset;
  }

  function syncCanvasResolution() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 640;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = Math.round(width * devicePixelRatio);
    const displayHeight = Math.round(height * devicePixelRatio);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    return { width, height };
  }

  function drawBoardBackground(width, height) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(6, 17, 28, 0.96)");
    gradient.addColorStop(1, "rgba(10, 28, 43, 0.98)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255, 255, 255, 0.03)";
    context.fillRect(0, 0, width, height * 0.16);
  }

  function drawGrid(width, height, cellWidth, cellHeight) {
    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.06)";
    context.lineWidth = 1;

    for (let x = 0; x <= BOARD_WIDTH; x += 1) {
      context.beginPath();
      context.moveTo(x * cellWidth + 0.5, 0);
      context.lineTo(x * cellWidth + 0.5, height);
      context.stroke();
    }

    for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
      context.beginPath();
      context.moveTo(0, y * cellHeight + 0.5);
      context.lineTo(width, y * cellHeight + 0.5);
      context.stroke();
    }

    context.restore();
  }

  function drawCell(column, row, cellWidth, cellHeight, color, alpha) {
    const insetX = Math.max(2, cellWidth * 0.08);
    const insetY = Math.max(2, cellHeight * 0.08);
    const x = column * cellWidth + insetX;
    const y = row * cellHeight + insetY;
    const width = cellWidth - insetX * 2;
    const height = cellHeight - insetY * 2;
    const radius = Math.max(4, Math.min(width, height) * 0.12);

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    fillRoundedRect(x, y, width, height, radius);
    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    fillRoundedRect(x, y, width, Math.max(4, height * 0.22), radius);
    context.strokeStyle = "rgba(255, 255, 255, 0.2)";
    context.lineWidth = 1;
    strokeRoundedRect(x, y, width, height, radius);
    context.restore();
  }

  function drawRoundedRectPath(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.arcTo(x + width, y, x + width, y + safeRadius, safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.arcTo(x + width, y + height, x + width - safeRadius, y + height, safeRadius);
    context.lineTo(x + safeRadius, y + height);
    context.arcTo(x, y + height, x, y + height - safeRadius, safeRadius);
    context.lineTo(x, y + safeRadius);
    context.arcTo(x, y, x + safeRadius, y, safeRadius);
    context.closePath();
  }

  function fillRoundedRect(x, y, width, height, radius) {
    drawRoundedRectPath(x, y, width, height, radius);
    context.fill();
  }

  function strokeRoundedRect(x, y, width, height, radius) {
    drawRoundedRectPath(x, y, width, height, radius);
    context.stroke();
  }

  function drawBoardPieces(cellWidth, cellHeight) {
    for (let row = 0; row < state.board.length; row += 1) {
      for (let column = 0; column < state.board[row].length; column += 1) {
        const cell = state.board[row][column];

        if (!cell) {
          continue;
        }

        drawCell(column, row, cellWidth, cellHeight, COLORS[cell], 1);
      }
    }
  }

  function drawPiece(piece, cellWidth, cellHeight, color, alpha) {
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) {
          continue;
        }

        const row = piece.y + y;

        if (row < 0) {
          continue;
        }

        drawCell(piece.x + x, row, cellWidth, cellHeight, color, alpha);
      }
    }
  }

  function drawGhostPiece(cellWidth, cellHeight) {
    const ghostOffset = getGhostOffset();

    if (ghostOffset === 0) {
      return;
    }

    drawPiece(
      { ...state.activePiece, y: state.activePiece.y + ghostOffset },
      cellWidth,
      cellHeight,
      COLORS[state.activePiece.type],
      0.22
    );
  }

  function updatePreviewGrid() {
    previewCells.forEach((cell) => {
      cell.dataset.filled = "false";
      cell.style.removeProperty("--preview-color");
    });

    if (!state.nextPiece) {
      return;
    }

    const matrix = state.nextPiece.matrix;
    const offsetX = Math.floor((PREVIEW_GRID_SIZE - matrix[0].length) / 2);
    const offsetY = Math.floor((PREVIEW_GRID_SIZE - matrix.length) / 2);

    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) {
          continue;
        }

        const cellIndex = (y + offsetY) * PREVIEW_GRID_SIZE + (x + offsetX);
        const cell = previewCells[cellIndex];

        if (!cell) {
          continue;
        }

        cell.dataset.filled = "true";
        cell.style.setProperty("--preview-color", COLORS[state.nextPiece.type]);
      }
    }
  }

  function updateStatusUi() {
    scoreValue.textContent = state.score.toLocaleString();
    bestScoreValue.textContent = state.bestScore.toLocaleString();
    linesValue.textContent = state.linesCleared.toLocaleString();
    levelValue.textContent = state.level.toLocaleString();

    if (state.isGameOver) {
      statusValue.textContent = "Game Over";
      overlay.hidden = false;
      overlayTitle.textContent = "Game Over";
      overlayCopy.textContent = "The stack hit the ceiling. Restart and chase a new best score.";
      overlayButton.textContent = "Restart";
      pauseButton.textContent = "Pause";
    } else if (state.isPaused) {
      statusValue.textContent = "Paused";
      overlay.hidden = false;
      overlayTitle.textContent = "Paused";
      overlayCopy.textContent = "Take a breath, then jump back in.";
      overlayButton.textContent = "Resume";
      pauseButton.textContent = "Resume";
    } else {
      statusValue.textContent = "Running";
      overlay.hidden = true;
      pauseButton.textContent = "Pause";
    }

    updatePreviewGrid();
    updateTouchButtonState();
  }

  function render() {
    const { width, height } = syncCanvasResolution();
    const cellWidth = width / BOARD_WIDTH;
    const cellHeight = height / BOARD_HEIGHT;

    context.clearRect(0, 0, width, height);
    drawBoardBackground(width, height);
    drawGrid(width, height, cellWidth, cellHeight);
    drawBoardPieces(cellWidth, cellHeight);

    if (state.activePiece) {
      drawGhostPiece(cellWidth, cellHeight);
      drawPiece(state.activePiece, cellWidth, cellHeight, COLORS[state.activePiece.type], 1);
    }

    updateStatusUi();
  }

  function updateTouchButtonState() {
    touchButtons.forEach((button) => {
      if (button.dataset.action === "softDrop") {
        button.classList.toggle("is-active", state.softDropHeld && !state.isPaused && !state.isGameOver);
      }
    });
  }

  function frame(timestamp) {
    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    const deltaTime = Math.min(timestamp - lastFrameTime, 48);
    lastFrameTime = timestamp;
    update(deltaTime);
    render();
    window.requestAnimationFrame(frame);
  }

  function handleKeyboard(event) {
    const blockedCodes = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
      "KeyP",
      "KeyR",
      "KeyX"
    ];

    if (blockedCodes.includes(event.code)) {
      event.preventDefault();
    }

    switch (event.code) {
      case "ArrowLeft":
        enqueueAction("moveLeft");
        break;
      case "ArrowRight":
        enqueueAction("moveRight");
        break;
      case "ArrowUp":
      case "KeyX":
        if (!event.repeat) {
          enqueueAction("rotateClockwise");
        }
        break;
      case "ArrowDown":
        if (!state.softDropHeld) {
          enqueueAction("softDrop");
        }
        state.softDropHeld = true;
        break;
      case "Space":
        if (!event.repeat) {
          enqueueAction("hardDrop");
        }
        break;
      case "KeyP":
        if (!event.repeat) {
          enqueueAction("togglePause");
        }
        break;
      case "KeyR":
        if (!event.repeat) {
          enqueueAction("restart");
        }
        break;
      default:
        break;
    }
  }

  function handleKeyUp(event) {
    if (event.code === "ArrowDown") {
      state.softDropHeld = false;
    }
  }

  function bindTouchControls() {
    touchButtons.forEach((button) => {
      const action = button.dataset.action;

      if (action === "softDrop") {
        const releaseSoftDrop = () => {
          state.softDropHeld = false;
          button.classList.remove("is-active");
        };

        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();

          if (state.isPaused || state.isGameOver) {
            return;
          }

          state.softDropHeld = true;
          enqueueAction("softDrop");
          button.classList.add("is-active");
        });

        button.addEventListener("pointerup", releaseSoftDrop);
        button.addEventListener("pointercancel", releaseSoftDrop);
        button.addEventListener("pointerleave", releaseSoftDrop);
        return;
      }

      const releaseButton = () => {
        button.classList.remove("is-active");
      };

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        enqueueAction(action);
        button.classList.add("is-active");
      });

      button.addEventListener("pointerup", releaseButton);
      button.addEventListener("pointercancel", releaseButton);
      button.addEventListener("pointerleave", releaseButton);
    });
  }

  function bindUiActions() {
    pauseButton.addEventListener("click", () => enqueueAction("togglePause"));
    restartButton.addEventListener("click", () => enqueueAction("restart"));
    overlayButton.addEventListener("click", () => {
      if (state.isGameOver) {
        enqueueAction("restart");
      } else {
        enqueueAction("togglePause");
      }
    });

    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("keyup", handleKeyUp);

    window.addEventListener("blur", () => {
      state.softDropHeld = false;

      if (!state.isGameOver) {
        state.isPaused = true;
      }
    });

    window.addEventListener("resize", render);
  }

  resetGame();
  bindUiActions();
  bindTouchControls();
  window.requestAnimationFrame(frame);
})();
