// ラクロス戦術ボード アプリケーション

class LacrosseTacticsBoard {
    constructor() {
        // Canvas elements
        this.fieldCanvas = document.getElementById('field-canvas');
        this.drawingCanvas = document.getElementById('drawing-canvas');
        this.fieldCtx = this.fieldCanvas.getContext('2d');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.playersContainer = document.getElementById('players-container');
        this.fieldContainer = document.getElementById('field-container');

        // State
        this.currentTool = 'select';
        this.currentColor = '#ffffff';
        this.lineWidth = 3;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.startX = 0;
        this.startY = 0;
        this.players = [];
        this.playerIdCounter = 0;
        this.selectedPlayer = null;
        this.draggedElement = null;
        this.drawingHistory = [];
        this.currentPath = [];

        // Waypoint animation state
        this.waypoints = {}; // { playerId: [{x, y}, ...] }
        this.selectedPlayerForWaypoint = null;
        this.isAnimating = false;
        this.originalPositions = {}; // Store starting positions for reset

        // Ball state
        this.ballCarrier = null; // Player ID that has the ball
        this.ballElement = null; // Reference to ball element

        // Initialize
        this.init();
    }

    init() {
        this.setupCanvas();
        this.drawField();
        this.bindEvents();
        this.addInitialPlayers();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.drawField();
            this.redrawAll();
        });
    }

    setupCanvas() {
        const container = this.fieldContainer;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Set canvas size
        this.fieldCanvas.width = rect.width * dpr;
        this.fieldCanvas.height = rect.height * dpr;
        this.drawingCanvas.width = rect.width * dpr;
        this.drawingCanvas.height = rect.height * dpr;

        // Scale context
        this.fieldCtx.scale(dpr, dpr);
        this.drawingCtx.scale(dpr, dpr);

        // Store dimensions
        this.width = rect.width;
        this.height = rect.height;
    }

    drawField() {
        const ctx = this.fieldCtx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Field background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#2d5a27');
        gradient.addColorStop(0.5, '#3d7a37');
        gradient.addColorStop(1, '#2d5a27');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Field lines style
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Field dimensions
        const margin = w * 0.03;
        const fieldWidth = w - margin * 2;
        const fieldHeight = h - margin * 2;
        const centerX = w / 2;
        const centerY = h / 2;

        // Outer boundary (End lines and Sidelines)
        ctx.strokeRect(margin, margin, fieldWidth, fieldHeight);

        // Center line
        ctx.beginPath();
        ctx.moveTo(centerX, margin);
        ctx.lineTo(centerX, h - margin);
        ctx.stroke();

        // Center X (フェイスオフ位置)
        const xSize = h * 0.03;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - xSize, centerY - xSize);
        ctx.lineTo(centerX + xSize, centerY + xSize);
        ctx.moveTo(centerX + xSize, centerY - xSize);
        ctx.lineTo(centerX - xSize, centerY + xSize);
        ctx.stroke();

        // Wing lines (ウィングライン) - センターライン付近の横線
        ctx.lineWidth = 2;
        const wingLineLength = w * 0.06;

        // Upper wing line (上側)
        ctx.beginPath();
        ctx.moveTo(centerX - wingLineLength, margin + h * 0.15);
        ctx.lineTo(centerX + wingLineLength, margin + h * 0.15);
        ctx.stroke();

        // Lower wing line (下側)
        ctx.beginPath();
        ctx.moveTo(centerX - wingLineLength, h - margin - h * 0.15);
        ctx.lineTo(centerX + wingLineLength, h - margin - h * 0.15);
        ctx.stroke();

        // ゴール位置（エンドラインから15ヤード = フィールドの約14%）
        const goalLineDistance = fieldWidth * 0.14;
        const leftGoalX = margin + goalLineDistance;
        const rightGoalX = w - margin - goalLineDistance;

        // Crease (クリース) - ゴール前の円形エリア
        const creaseRadius = h * 0.07;
        ctx.lineWidth = 2;

        // Left crease (full circle)
        ctx.beginPath();
        ctx.arc(leftGoalX, centerY, creaseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Right crease (full circle)
        ctx.beginPath();
        ctx.arc(rightGoalX, centerY, creaseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Goals (ゴール) - V型
        const goalArmLength = h * 0.04;
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = 3;

        // Left goal (V pointing left - toward endline)
        ctx.beginPath();
        ctx.moveTo(leftGoalX + goalArmLength * 0.5, centerY - goalArmLength);
        ctx.lineTo(leftGoalX - goalArmLength * 0.3, centerY);
        ctx.lineTo(leftGoalX + goalArmLength * 0.5, centerY + goalArmLength);
        ctx.stroke();

        // Right goal (V pointing right - toward endline)
        ctx.beginPath();
        ctx.moveTo(rightGoalX - goalArmLength * 0.5, centerY - goalArmLength);
        ctx.lineTo(rightGoalX + goalArmLength * 0.3, centerY);
        ctx.lineTo(rightGoalX - goalArmLength * 0.5, centerY + goalArmLength);
        ctx.stroke();

        // AT Lines (ATライン / 制限ライン)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 5]);

        const atLineX = fieldWidth * 0.35;

        // Left AT line (vertical dashed)
        ctx.beginPath();
        ctx.moveTo(margin + atLineX, margin);
        ctx.lineTo(margin + atLineX, h - margin);
        ctx.stroke();

        // Right AT line (vertical dashed)
        ctx.beginPath();
        ctx.moveTo(w - margin - atLineX, margin);
        ctx.lineTo(w - margin - atLineX, h - margin);
        ctx.stroke();

        ctx.setLineDash([]);

        // AT Lines horizontal (ATライン横線) - サイドラインから制限ラインまで
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;

        // Left side AT lines (左側：サイドラインから左の制限ラインまで)
        // Upper left
        ctx.beginPath();
        ctx.moveTo(margin, margin + h * 0.15);
        ctx.lineTo(margin + atLineX, margin + h * 0.15);
        ctx.stroke();

        // Lower left
        ctx.beginPath();
        ctx.moveTo(margin, h - margin - h * 0.15);
        ctx.lineTo(margin + atLineX, h - margin - h * 0.15);
        ctx.stroke();

        // Right side AT lines (右側：サイドラインから右の制限ラインまで)
        // Upper right
        ctx.beginPath();
        ctx.moveTo(w - margin, margin + h * 0.15);
        ctx.lineTo(w - margin - atLineX, margin + h * 0.15);
        ctx.stroke();

        // Lower right
        ctx.beginPath();
        ctx.moveTo(w - margin, h - margin - h * 0.15);
        ctx.lineTo(w - margin - atLineX, h - margin - h * 0.15);
        ctx.stroke();
    }

    bindEvents() {
        // Tool buttons
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCursor();
            });
        });

        // Action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleAction(btn.dataset.action);
            });
        });

        // Color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
            });
        });

        // Line width
        const lineWidthSlider = document.getElementById('line-width');
        const lineWidthValue = document.getElementById('line-width-value');
        lineWidthSlider.addEventListener('input', (e) => {
            this.lineWidth = parseInt(e.target.value);
            lineWidthValue.textContent = `${this.lineWidth}px`;
        });

        // Drawing canvas events
        this.drawingCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.drawingCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.drawingCanvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        // Touch events
        this.drawingCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.drawingCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.drawingCanvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    updateCursor() {
        const canvas = this.drawingCanvas;
        switch (this.currentTool) {
            case 'select':
                canvas.style.cursor = 'default';
                break;
            case 'pen':
                canvas.style.cursor = 'crosshair';
                break;
            case 'arrow':
                canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                canvas.style.cursor = 'cell';
                break;
            case 'waypoint':
                canvas.style.cursor = 'pointer';
                break;
            case 'pass':
                canvas.style.cursor = 'pointer';
                break;
            case 'delete':
                canvas.style.cursor = 'not-allowed';
                break;
        }
    }

    handleAction(action) {
        switch (action) {
            case 'add-attack-blue':
                this.addPlayer('attack-blue');
                break;
            case 'add-midfield-blue':
                this.addPlayer('midfield-blue');
                break;
            case 'add-defense-blue':
                this.addPlayer('defense-blue');
                break;
            case 'add-ssdm-blue':
                this.addPlayer('ssdm-blue');
                break;
            case 'add-goalie-blue':
                this.addPlayer('goalie-blue');
                break;
            case 'add-fo-blue':
                this.addPlayer('fo-blue');
                break;
            case 'add-attack-red':
                this.addPlayer('attack-red');
                break;
            case 'add-midfield-red':
                this.addPlayer('midfield-red');
                break;
            case 'add-defense-red':
                this.addPlayer('defense-red');
                break;
            case 'add-ssdm-red':
                this.addPlayer('ssdm-red');
                break;
            case 'add-goalie-red':
                this.addPlayer('goalie-red');
                break;
            case 'add-fo-red':
                this.addPlayer('fo-red');
                break;
            case 'add-ball':
                this.addBall();
                break;
            case 'undo':
                this.undo();
                break;
            case 'clear':
                this.clearAll();
                break;
            case 'play-animation':
                this.playAnimation();
                break;
            case 'clear-paths':
                this.clearPaths();
                break;
            case 'reset-positions':
                this.resetPositions();
                break;
        }
    }

    addPlayer(type) {
        const id = ++this.playerIdCounter;
        const player = document.createElement('div');
        player.className = `player ${type}`;
        player.dataset.id = id;

        // Determine label
        let label = '';
        if (type.startsWith('attack')) label = 'AT';
        else if (type.startsWith('midfield')) label = 'MD';
        else if (type.startsWith('defense')) label = 'D';
        else if (type.startsWith('ssdm')) label = 'SD';
        else if (type.startsWith('goalie')) label = 'G';
        else if (type.startsWith('fo')) label = 'FO';

        player.textContent = label;

        // Random position near center
        const x = this.width * (0.4 + Math.random() * 0.2);
        const y = this.height * (0.3 + Math.random() * 0.4);

        player.style.left = `${x}px`;
        player.style.top = `${y}px`;

        // Make draggable
        this.makeDraggable(player);

        this.playersContainer.appendChild(player);
        this.players.push({ id, type, element: player, x, y });
    }

    addBall() {
        // Remove existing ball if any
        if (this.ballElement) {
            this.ballElement.remove();
        }

        const ball = document.createElement('div');
        ball.className = 'ball';

        const x = this.width * 0.5;
        const y = this.height * 0.5;

        ball.style.left = `${x}px`;
        ball.style.top = `${y}px`;

        this.makeDraggable(ball);
        this.playersContainer.appendChild(ball);
        this.ballElement = ball;
        this.ballCarrier = null;
    }

    giveBallToPlayer(playerId) {
        this.ballCarrier = playerId;
        this.updateBallPosition();
    }

    updateBallPosition() {
        if (!this.ballCarrier || !this.ballElement) return;

        const player = this.playersContainer.querySelector(`[data-id="${this.ballCarrier}"]`);
        if (!player) {
            this.ballCarrier = null;
            return;
        }

        const playerLeft = parseFloat(player.style.left);
        const playerTop = parseFloat(player.style.top);
        const playerWidth = player.offsetWidth;
        const playerHeight = player.offsetHeight;

        // Position ball at bottom-right of player
        this.ballElement.style.left = `${playerLeft + playerWidth * 0.6}px`;
        this.ballElement.style.top = `${playerTop + playerHeight * 0.6}px`;
    }

    makeDraggable(element) {
        let offsetX, offsetY;
        let isDragging = false;

        const onStart = (clientX, clientY) => {
            if (this.currentTool !== 'select') return;

            isDragging = true;
            element.style.zIndex = '100';

            const rect = this.fieldContainer.getBoundingClientRect();
            const elemRect = element.getBoundingClientRect();
            offsetX = clientX - (elemRect.left + elemRect.width / 2);
            offsetY = clientY - (elemRect.top + elemRect.height / 2);
        };

        const onMove = (clientX, clientY) => {
            if (!isDragging) return;

            const rect = this.fieldContainer.getBoundingClientRect();
            let x = clientX - rect.left - offsetX;
            let y = clientY - rect.top - offsetY;

            // Constrain to field
            x = Math.max(0, Math.min(x, this.width));
            y = Math.max(0, Math.min(y, this.height));

            element.style.left = `${x}px`;
            element.style.top = `${y}px`;

            // Update ball position if this player has the ball
            if (element.dataset.id && this.ballCarrier === element.dataset.id) {
                this.updateBallPosition();
            }
        };

        const onEnd = () => {
            isDragging = false;
            element.style.zIndex = '';
        };

        // Mouse events
        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Waypoint mode: select player for waypoint editing
            if (this.currentTool === 'waypoint') {
                // Shift+click = add pass waypoint to selected player
                if (e.shiftKey && this.selectedPlayerForWaypoint && element.dataset.id !== this.selectedPlayerForWaypoint) {
                    // Add pass from selected player to this player
                    this.addPassWaypoint(this.selectedPlayerForWaypoint, element.dataset.id);
                    return;
                }

                // Remove highlight from previously selected player
                if (this.selectedPlayerForWaypoint) {
                    const prevPlayer = this.playersContainer.querySelector(`[data-id="${this.selectedPlayerForWaypoint}"]`);
                    if (prevPlayer) prevPlayer.style.boxShadow = '';
                }

                // Set this player as selected
                this.selectedPlayerForWaypoint = element.dataset.id;
                element.style.boxShadow = '0 0 15px 5px rgba(255, 255, 0, 0.8)';
                this.drawWaypoints();
                return;
            }

            // Delete mode: click to delete player
            if (this.currentTool === 'delete' && element.classList.contains('player')) {
                this.deletePlayer(element);
                return;
            }

            // Pass mode: click a player to add pass waypoint from selected player
            if (this.currentTool === 'pass') {
                if (this.selectedPlayerForWaypoint && element.dataset.id !== this.selectedPlayerForWaypoint) {
                    this.addPassWaypoint(this.selectedPlayerForWaypoint, element.dataset.id);
                } else {
                    // Select player first
                    if (this.selectedPlayerForWaypoint) {
                        const prevPlayer = this.playersContainer.querySelector(`[data-id="${this.selectedPlayerForWaypoint}"]`);
                        if (prevPlayer) prevPlayer.style.boxShadow = '';
                    }
                    this.selectedPlayerForWaypoint = element.dataset.id;
                    element.style.boxShadow = '0 0 15px 5px rgba(255, 140, 0, 0.8)';
                    this.drawWaypoints();
                }
                return;
            }

            onStart(e.clientX, e.clientY);

            const moveHandler = (e) => onMove(e.clientX, e.clientY);
            const upHandler = () => {
                onEnd();
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });

        // Touch events
        let touchStartTime = 0;
        let touchMoved = false;

        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            touchStartTime = Date.now();
            touchMoved = false;

            // Waypoint mode: select player for waypoint editing
            if (this.currentTool === 'waypoint' && element.classList.contains('player')) {
                if (this.selectedPlayerForWaypoint) {
                    const prevPlayer = this.playersContainer.querySelector(`[data-id="${this.selectedPlayerForWaypoint}"]`);
                    if (prevPlayer) prevPlayer.style.boxShadow = '';
                }
                this.selectedPlayerForWaypoint = element.dataset.id;
                element.style.boxShadow = '0 0 15px 5px rgba(255, 255, 0, 0.8)';
                this.drawWaypoints();
                return;
            }

            // Delete mode: tap to delete player
            if (this.currentTool === 'delete' && element.classList.contains('player')) {
                this.deletePlayer(element);
                return;
            }

            // Pass mode: tap player to add pass waypoint (touch-friendly)
            if (this.currentTool === 'pass' && element.classList.contains('player')) {
                if (this.selectedPlayerForWaypoint && element.dataset.id !== this.selectedPlayerForWaypoint) {
                    this.addPassWaypoint(this.selectedPlayerForWaypoint, element.dataset.id);
                } else {
                    if (this.selectedPlayerForWaypoint) {
                        const prevPlayer = this.playersContainer.querySelector(`[data-id="${this.selectedPlayerForWaypoint}"]`);
                        if (prevPlayer) prevPlayer.style.boxShadow = '';
                    }
                    this.selectedPlayerForWaypoint = element.dataset.id;
                    element.style.boxShadow = '0 0 15px 5px rgba(255, 140, 0, 0.8)';
                    this.drawWaypoints();
                }
                return;
            }

            const touch = e.touches[0];
            onStart(touch.clientX, touch.clientY);
        });

        element.addEventListener('touchmove', (e) => {
            e.preventDefault();
            touchMoved = true;
            const touch = e.touches[0];
            onMove(touch.clientX, touch.clientY);
        });

        element.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;

            // Long press (>500ms) without moving = give ball to player
            if (touchDuration > 500 && !touchMoved && element.classList.contains('player')) {
                if (this.ballElement) {
                    this.giveBallToPlayer(element.dataset.id);
                }
            }

            onEnd();
        });

        // Right-click to delete
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deletePlayer(element);
        });

        // Double-click to give ball to player
        if (element.classList.contains('player')) {
            element.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.ballElement) {
                    this.giveBallToPlayer(element.dataset.id);
                }
            });
        }
    }

    deletePlayer(element) {
        // Remove from DOM
        element.remove();

        // Remove from players array if it's a player
        const playerId = element.dataset.id;
        if (playerId) {
            this.players = this.players.filter(p => p.id !== parseInt(playerId));
        }
    }

    addInitialPlayers() {
        // ユーザーが指定した初期配置

        // === 左サイド（青チーム守備エリア） ===
        // ゴーリー（青）
        this.addPlayerAtPosition('goalie-blue', this.width * 0.16, this.height * 0.50);

        // ディフェンス（青）と アタック（赤）- 横に並べる
        // 上段
        this.addPlayerAtPosition('defense-blue', this.width * 0.26, this.height * 0.20);
        this.addPlayerAtPosition('attack-red', this.width * 0.31, this.height * 0.20);
        // 中段
        this.addPlayerAtPosition('defense-blue', this.width * 0.26, this.height * 0.50);
        this.addPlayerAtPosition('attack-red', this.width * 0.31, this.height * 0.50);
        // 下段
        this.addPlayerAtPosition('defense-blue', this.width * 0.26, this.height * 0.80);
        this.addPlayerAtPosition('attack-red', this.width * 0.31, this.height * 0.80);

        // === 中央エリア ===
        // ミッドフィールダー（青）- 3人（縦20%/50%/80%、横は中央55%、他65%）
        this.addPlayerAtPosition('midfield-blue', this.width * 0.65, this.height * 0.20);
        this.addPlayerAtPosition('midfield-blue', this.width * 0.55, this.height * 0.50);
        this.addPlayerAtPosition('midfield-blue', this.width * 0.65, this.height * 0.80);

        // SSDM（赤）- 2人（横72%、縦22%/73%）
        this.addPlayerAtPosition('ssdm-red', this.width * 0.72, this.height * 0.22);
        this.addPlayerAtPosition('ssdm-red', this.width * 0.72, this.height * 0.73);

        // ディフェンス（赤）- 中央のMDの隣
        this.addPlayerAtPosition('defense-red', this.width * 0.62, this.height * 0.50);

        // === 右サイド（赤チーム守備エリア） ===
        // ゴーリー（赤）
        this.addPlayerAtPosition('goalie-red', this.width * 0.84, this.height * 0.50);

        // ディフェンス（赤）- 3人（ATの前に配置）
        this.addPlayerAtPosition('defense-red', this.width * 0.80, this.height * 0.30);
        this.addPlayerAtPosition('defense-red', this.width * 0.75, this.height * 0.50);
        this.addPlayerAtPosition('defense-red', this.width * 0.80, this.height * 0.70);

        // アタック（青）- 3人（上下は縦30%/70%・横90%、中央は縦50%・横70%）
        this.addPlayerAtPosition('attack-blue', this.width * 0.90, this.height * 0.30);
        this.addPlayerAtPosition('attack-blue', this.width * 0.70, this.height * 0.50);
        this.addPlayerAtPosition('attack-blue', this.width * 0.90, this.height * 0.70);
    }

    addPlayerAtPosition(type, x, y) {
        const id = ++this.playerIdCounter;
        const player = document.createElement('div');
        player.className = `player ${type}`;
        player.dataset.id = id;

        let label = '';
        if (type.startsWith('attack')) label = 'AT';
        else if (type.startsWith('midfield')) label = 'MD';
        else if (type.startsWith('defense')) label = 'D';
        else if (type.startsWith('ssdm')) label = 'SD';
        else if (type.startsWith('goalie')) label = 'G';
        else if (type.startsWith('fo')) label = 'FO';

        player.textContent = label;
        player.style.left = `${x}px`;
        player.style.top = `${y}px`;

        this.makeDraggable(player);
        this.playersContainer.appendChild(player);
        this.players.push({ id, type, element: player, x, y });
    }

    getCanvasCoords(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseDown(e) {
        if (this.currentTool === 'select') return;

        const coords = this.getCanvasCoords(e);

        // Waypoint mode: add waypoint for selected player
        if (this.currentTool === 'waypoint' && this.selectedPlayerForWaypoint) {
            this.addWaypoint(this.selectedPlayerForWaypoint, coords.x, coords.y);
            return;
        }

        this.isDrawing = true;
        this.startX = coords.x;
        this.startY = coords.y;
        this.lastX = coords.x;
        this.lastY = coords.y;

        if (this.currentTool === 'pen') {
            this.currentPath = [{ x: coords.x, y: coords.y }];
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoords(e);

        if (this.currentTool === 'pen') {
            this.drawLine(this.lastX, this.lastY, coords.x, coords.y);
            this.currentPath.push({ x: coords.x, y: coords.y });
            this.lastX = coords.x;
            this.lastY = coords.y;
        } else if (this.currentTool === 'arrow') {
            // Preview arrow
            this.redrawAll();
            this.drawArrow(this.startX, this.startY, coords.x, coords.y, true);
        } else if (this.currentTool === 'eraser') {
            this.erase(coords.x, coords.y);
        }
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoords(e);
        this.isDrawing = false;

        if (this.currentTool === 'pen' && this.currentPath.length > 1) {
            this.drawingHistory.push({
                type: 'path',
                points: [...this.currentPath],
                color: this.currentColor,
                lineWidth: this.lineWidth
            });
            this.currentPath = [];
        } else if (this.currentTool === 'arrow') {
            this.drawingHistory.push({
                type: 'arrow',
                startX: this.startX,
                startY: this.startY,
                endX: coords.x,
                endY: coords.y,
                color: this.currentColor,
                lineWidth: this.lineWidth
            });
            this.redrawAll();
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseUp(mouseEvent);
    }

    drawLine(x1, y1, x2, y2) {
        const ctx = this.drawingCtx;
        ctx.beginPath();
        ctx.strokeStyle = this.currentColor;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    drawArrow(x1, y1, x2, y2, isPreview = false) {
        const ctx = this.drawingCtx;
        const headLength = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.beginPath();
        ctx.strokeStyle = isPreview ? 'rgba(255, 255, 255, 0.5)' : this.currentColor;
        ctx.fillStyle = isPreview ? 'rgba(255, 255, 255, 0.5)' : this.currentColor;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Line
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    erase(x, y) {
        const ctx = this.drawingCtx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, this.lineWidth * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    redrawAll() {
        // Clear drawing canvas
        this.drawingCtx.clearRect(0, 0, this.width, this.height);

        // Redraw all history items
        this.drawingHistory.forEach(item => {
            if (item.type === 'path') {
                this.drawingCtx.beginPath();
                this.drawingCtx.strokeStyle = item.color;
                this.drawingCtx.lineWidth = item.lineWidth;
                this.drawingCtx.lineCap = 'round';
                this.drawingCtx.lineJoin = 'round';

                item.points.forEach((point, index) => {
                    if (index === 0) {
                        this.drawingCtx.moveTo(point.x, point.y);
                    } else {
                        this.drawingCtx.lineTo(point.x, point.y);
                    }
                });
                this.drawingCtx.stroke();
            } else if (item.type === 'arrow') {
                const savedColor = this.currentColor;
                this.currentColor = item.color;
                const savedWidth = this.lineWidth;
                this.lineWidth = item.lineWidth;
                this.drawArrow(item.startX, item.startY, item.endX, item.endY);
                this.currentColor = savedColor;
                this.lineWidth = savedWidth;
            }
        });
    }

    undo() {
        if (this.drawingHistory.length > 0) {
            this.drawingHistory.pop();
            this.redrawAll();
        }
    }

    clearAll() {
        // Clear drawings
        this.drawingHistory = [];
        this.drawingCtx.clearRect(0, 0, this.width, this.height);

        // Remove all players
        this.playersContainer.innerHTML = '';
        this.players = [];
        this.playerIdCounter = 0;

        // Clear waypoints
        this.waypoints = {};
        this.selectedPlayerForWaypoint = null;

        // Add initial players again
        this.addInitialPlayers();
    }

    // ========== Waypoint Animation Methods ==========

    drawWaypoints() {
        // Clear and redraw the drawing canvas
        this.redrawAll();

        const ctx = this.drawingCtx;

        // Draw waypoints for each player
        Object.keys(this.waypoints).forEach(playerId => {
            const points = this.waypoints[playerId];
            if (points.length === 0) return;

            // Find the player element
            const player = this.playersContainer.querySelector(`[data-id="${playerId}"]`);
            if (!player) return;

            const playerRect = player.getBoundingClientRect();
            const containerRect = this.fieldContainer.getBoundingClientRect();
            const startX = playerRect.left - containerRect.left + playerRect.width / 2;
            const startY = playerRect.top - containerRect.top + playerRect.height / 2;

            // Draw path line (dashed)
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.moveTo(startX, startY);

            points.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw waypoint markers
            points.forEach((point, index) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);

                // Pass waypoints are orange, move waypoints are yellow
                if (point.type === 'pass') {
                    ctx.fillStyle = 'rgba(255, 140, 0, 0.9)';
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
                }
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw number or P for pass
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (point.type === 'pass') {
                    ctx.fillText('P', point.x, point.y);
                } else {
                    ctx.fillText(index + 1, point.x, point.y);
                }
            });
        });

        // Highlight selected player for waypoint
        if (this.selectedPlayerForWaypoint) {
            const player = this.playersContainer.querySelector(`[data-id="${this.selectedPlayerForWaypoint}"]`);
            if (player) {
                player.style.boxShadow = '0 0 15px 5px rgba(255, 255, 0, 0.8)';
            }
        }
    }

    addWaypoint(playerId, x, y, type = 'move') {
        if (!this.waypoints[playerId]) {
            this.waypoints[playerId] = [];
        }
        // type can be 'move' or 'pass'
        this.waypoints[playerId].push({ x, y, type });
        this.drawWaypoints();
    }

    addPassWaypoint(fromPlayerId, toPlayerId) {
        // Get target player position
        const toPlayer = this.playersContainer.querySelector(`[data-id="${toPlayerId}"]`);
        if (!toPlayer) return;

        const toPlayerLeft = parseFloat(toPlayer.style.left);
        const toPlayerTop = parseFloat(toPlayer.style.top);
        const toPlayerWidth = toPlayer.offsetWidth;
        const toPlayerHeight = toPlayer.offsetHeight;

        const targetX = toPlayerLeft + toPlayerWidth / 2;
        const targetY = toPlayerTop + toPlayerHeight / 2;

        // Add pass waypoint to the ball carrier
        if (!this.waypoints[fromPlayerId]) {
            this.waypoints[fromPlayerId] = [];
        }
        this.waypoints[fromPlayerId].push({ x: targetX, y: targetY, type: 'pass', toPlayerId });
        this.drawWaypoints();
    }

    async playAnimation() {
        if (this.isAnimating) return;
        if (Object.keys(this.waypoints).length === 0) return;

        this.isAnimating = true;

        // Store original positions for reset (only if not already stored)
        Object.keys(this.waypoints).forEach(playerId => {
            if (!this.originalPositions[playerId]) {
                const player = this.playersContainer.querySelector(`[data-id="${playerId}"]`);
                if (player) {
                    this.originalPositions[playerId] = {
                        left: player.style.left,
                        top: player.style.top
                    };
                }
            }
        });

        // Find max waypoint count
        let maxWaypoints = 0;
        Object.values(this.waypoints).forEach(points => {
            if (points.length > maxWaypoints) maxWaypoints = points.length;
        });

        // Animate through each waypoint step
        for (let step = 0; step < maxWaypoints; step++) {
            const animationPromises = [];
            const passActions = []; // Store pass actions to execute after movement

            Object.keys(this.waypoints).forEach(playerId => {
                const points = this.waypoints[playerId];
                if (step >= points.length) return;

                const player = this.playersContainer.querySelector(`[data-id="${playerId}"]`);
                if (!player) return;

                const target = points[step];

                if (target.type === 'pass') {
                    // Pass the ball - animate ball to target position and transfer carrier
                    passActions.push({
                        fromPlayerId: playerId,
                        toPlayerId: target.toPlayerId,
                        targetX: target.x,
                        targetY: target.y
                    });
                } else {
                    // Normal movement
                    const promise = this.animatePlayerTo(player, target.x, target.y);
                    animationPromises.push(promise);
                }
            });

            await Promise.all(animationPromises);

            // Execute pass animations
            for (const pass of passActions) {
                await this.animateBallPass(pass.targetX, pass.targetY, pass.toPlayerId);
            }

            await this.sleep(100); // Brief pause between waypoints
        }

        this.isAnimating = false;
    }

    async animateBallPass(targetX, targetY, toPlayerId) {
        if (!this.ballElement) return;

        return new Promise(resolve => {
            const duration = 300; // Fast pass
            const startTime = performance.now();

            const startLeft = parseFloat(this.ballElement.style.left);
            const startTop = parseFloat(this.ballElement.style.top);
            const ballWidth = this.ballElement.offsetWidth;
            const ballHeight = this.ballElement.offsetHeight;

            const endLeft = targetX - ballWidth / 2;
            const endTop = targetY - ballHeight / 2;

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Linear animation for pass
                const currentLeft = startLeft + (endLeft - startLeft) * progress;
                const currentTop = startTop + (endTop - startTop) * progress;

                this.ballElement.style.left = currentLeft + 'px';
                this.ballElement.style.top = currentTop + 'px';

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Transfer ball to new player
                    this.ballCarrier = toPlayerId;
                    this.updateBallPosition();
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    animatePlayerTo(player, targetX, targetY) {
        return new Promise(resolve => {
            const duration = 500; // ms
            const startTime = performance.now();

            const startLeft = parseFloat(player.style.left);
            const startTop = parseFloat(player.style.top);
            const playerWidth = player.offsetWidth;
            const playerHeight = player.offsetHeight;

            // Target is center position, convert to top-left
            const endLeft = targetX - playerWidth / 2;
            const endTop = targetY - playerHeight / 2;

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease-out animation
                const easeOut = 1 - Math.pow(1 - progress, 3);

                const currentLeft = startLeft + (endLeft - startLeft) * easeOut;
                const currentTop = startTop + (endTop - startTop) * easeOut;

                player.style.left = currentLeft + 'px';
                player.style.top = currentTop + 'px';

                // Update ball position if this player has the ball
                if (player.dataset.id && this.ballCarrier === player.dataset.id) {
                    this.updateBallPosition();
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearPaths() {
        this.waypoints = {};
        this.selectedPlayerForWaypoint = null;
        this.originalPositions = {};

        // Remove highlight from all players
        this.playersContainer.querySelectorAll('.player').forEach(player => {
            player.style.boxShadow = '';
        });

        this.redrawAll();
    }

    async resetPositions() {
        if (this.isAnimating) return;
        if (Object.keys(this.originalPositions).length === 0) return;

        this.isAnimating = true;

        const animationPromises = [];

        Object.keys(this.originalPositions).forEach(playerId => {
            const player = this.playersContainer.querySelector(`[data-id="${playerId}"]`);
            if (!player) return;

            const original = this.originalPositions[playerId];
            const targetX = parseFloat(original.left) + player.offsetWidth / 2;
            const targetY = parseFloat(original.top) + player.offsetHeight / 2;

            const promise = this.animatePlayerTo(player, targetX, targetY);
            animationPromises.push(promise);
        });

        await Promise.all(animationPromises);

        // Clear original positions after reset
        this.originalPositions = {};
        this.isAnimating = false;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        new LacrosseTacticsBoard();
    } catch (e) {
        console.error('初期化エラー:', e);
        document.body.innerHTML = '<div style="color:white;padding:20px;text-align:center;">' +
            '<h2>エラーが発生しました</h2><p>' + e.message + '</p></div>';
    }
});
