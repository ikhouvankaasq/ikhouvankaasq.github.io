const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

// Instellingen
const TILE_SIZE = 8;
const PLAYER_SPEED = 4;
const TURN_SPEED = 0.08;

// Game State
let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Grid Variabelen
let gridWidth = 0;
let gridHeight = 0;
let territory = []; // Het logische grid (0 = vrij, 1 = speler)

// --- GRID & RESIZE LOGICA ---

function initGrid() {
    // Stel canvas in op schermgrootte
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Bereken grid afmetingen
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);

    // Maak een leeg grid aan (array van arrays)
    territory = new Array(gridWidth);
    for (let x = 0; x < gridWidth; x++) {
        territory[x] = new Uint8Array(gridHeight).fill(0);
    }
}

// Luister naar scherm aanpassingen
window.addEventListener('resize', () => {
    initGrid();
    if (gameRunning && player) {
        // Als we midden in een spel zitten, resetten we de speler om crashes te voorkomen
        // (In een perfecte versie zou je de territory schalen, maar dat is complex)
        player.reset();
    }
});

// --- SPELER KLASSE ---

class Player {
    constructor() {
        // Buffer canvas voor het tekenen van het land (zonder gaten)
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        
        // Standaard waarden (worden overschreven in reset)
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.trail = [];
    }

    reset() {
        // Update buffer grootte
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;

        // Reset posities
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 14;
        this.color = '#ff4757';
        this.angle = 0;
        this.trail = [];
        this.isOutside = false;

        // Grid helemaal leegmaken
        for (let x = 0; x < gridWidth; x++) {
            territory[x].fill(0);
        }

        // Startcirkel maken in het grid
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const radius = 8; // straal in blokjes

        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                if (Math.sqrt(x*x + y*y) <= radius) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // Teken het land direct
        this.redrawLand();
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            territory[gx][gy] = val;
        }
    }

    update() {
        if (!gameRunning) return;

        // --- BESTURING ---
        if (lastInputMethod === 'keyboard') {
            if (keys['a'] || keys['arrowleft']) this.angle -= TURN_SPEED;
            if (keys['d'] || keys['arrowright']) this.angle += TURN_SPEED;
        } else {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            // Alleen draaien als de muis ver genoeg weg is (voorkomt trillen)
            if (Math.sqrt(dx*dx + dy*dy) > 20) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * 0.15;
            }
        }

        // --- BEWEGING ---
        this.x += Math.cos(this.angle) * PLAYER_SPEED;
        this.y += Math.sin(this.angle) * PLAYER_SPEED;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        // Check: Buiten scherm?
        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) {
            return this.die();
        }

        const tileVal = territory[gx][gy];

        // --- LOGICA ---
        if (tileVal === 0) {
            // Op neutraal terrein -> Trail maken
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });

            // Check botsing met eigen staart
            if (this.trail.length > 20) {
                // Checken tegen alle punten behalve de allerlaatste paar
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const t = this.trail[i];
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist < this.size / 2) {
                        return this.die();
                    }
                }
            }

        } else if (tileVal === 1 && this.isOutside) {
            // Terug op eigen terrein -> VEROVEREN
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // 1. Markeer trail als territory
        // We maken de trail iets dikker in het grid om gaatjes te voorkomen
        this.trail.forEach(t => {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    this.setTerritory(t.gx + i, t.gy + j, 1);
                }
            }
        });

        // 2. Vul de gaten (Flood Fill algoritme)
        this.fillHoles();

        // 3. Teken het land opnieuw (dit fixt de visuele glitches)
        this.redrawLand();
    }

    fillHoles() {
        // We gebruiken een Flood Fill vanaf (0,0).
        // Alles wat we vanaf daar kunnen bereiken is "Buiten".
        // Alles wat we NIET kunnen bereiken, zit dus gevangen in jouw cirkel -> "Binnen".

        // Maak een array om bij te houden wat bezocht is
        const visited = new Uint8Array(gridWidth * gridHeight); // standaard alles 0
        const stack = [0]; // Begin linksboven (index 0)
        visited[0] = 1;

        while (stack.length > 0) {
            const index = stack.pop();
            const x = index % gridWidth;
            const y = Math.floor(index / gridWidth);

            // Bekijk 4 buren
            const neighbors = [
                {nx: x+1, ny: y}, {nx: x-1, ny: y},
                {nx: x, ny: y+1}, {nx: x, ny: y-1}
            ];

            for (let n of neighbors) {
                if (n.nx >= 0 && n.nx < gridWidth && n.ny >= 0 && n.ny < gridHeight) {
                    // Is dit blokje GEEN territory?
                    if (territory[n.nx][n.ny] === 0) {
                        const nIndex = n.ny * gridWidth + n.nx;
                        if (visited[nIndex] === 0) {
                            visited[nIndex] = 1; // Markeer als bezocht
                            stack.push(nIndex);
                        }
                    }
                }
            }
        }

        // Loop over het hele grid. Alles wat NIET bezocht is (en dus 0 was), wordt nu van jou.
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const index = y * gridWidth + x;
                if (visited[index] === 0 && territory[x][y] === 0) {
                    territory[x][y] = 1;
                }
            }
        }
    }

    redrawLand() {
        // Wis buffer
        this.landCtx.clearRect(0, 0, this.landCanvas.width, this.landCanvas.height);
        this.landCtx.fillStyle = this.color;
        this.landCtx.beginPath();

        // Teken elk blokje dat van jou is
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    // +0.6 zorgt voor overlap tegen witte lijntjes
                    this.landCtx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE + 0.6, TILE_SIZE + 0.6);
                }
            }
        }
        this.landCtx.fill();
    }

    draw() {
        // 1. Teken het land (vanuit buffer)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowOffsetY = 4;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // 2. Teken de trail (als je buiten bent)
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.6;
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (const p of this.trail) ctx.lineTo(p.x, p.y);
            ctx.lineTo(this.x, this.y); // Verbind met speler
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // 3. Teken de speler
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#ff2e43";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();

        // 4. Naam
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 3;
        ctx.strokeText("Henk", this.x, this.y - 25);
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
    }
}

// --- INITIALISATIE ---

// 1. Eerst grid aanmaken
initGrid();

// 2. Dan speler aanmaken
const player = new Player();

// 3. Event Listeners
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    lastInputMethod = 'keyboard';
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    lastInputMethod = 'mouse';
});

// 4. Start Knop
startBtn.addEventListener('click', () => {
    initGrid();      // Zeker weten dat grid klopt
    player.reset();  // Speler resetten en land tekenen
    overlay.style.display = 'none';
    gameRunning = true;
});

// --- GAME LOOP ---

function loop() {
    // Scherm wissen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Achtergrond
    ctx.fillStyle = "#f0f9ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Raster tekenen (subtiel)
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
    for (let i = 0; i < canvas.height; i += 40) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
    ctx.stroke();

    // Speler updaten en tekenen
    if (player) {
        player.update();
        player.draw();
    }

    requestAnimationFrame(loop);
}

// Start de loop
loop();
