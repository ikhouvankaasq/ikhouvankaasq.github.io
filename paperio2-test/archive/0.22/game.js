const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

// --- INSTELLINGEN ---
const TILE_SIZE = 10;       // Iets groter voor betere performance
const PLAYER_SPEED = 3.5;   // Iets rustiger beweging
const TURN_SPEED = 0.07;
const COLOR_PLAYER = '#ff4757';
const COLOR_TRAIL = '#ff6b81'; // Iets lichter rood voor de staart

// --- GAME STATE ---
let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Grid logic (voor botsingen)
let gridWidth = 0;
let gridHeight = 0;
let territory = []; // 0 = leeg, 1 = van jou

// --- INIT FUNCTIES ---

function initGrid() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);
    
    // Maak grid leeg
    territory = new Array(gridWidth);
    for (let x = 0; x < gridWidth; x++) {
        territory[x] = new Uint8Array(gridHeight).fill(0);
    }
}

// Event listener voor schermgrootte
window.addEventListener('resize', () => {
    initGrid();
    if(gameRunning && player) player.reset();
});

// --- SPELER CLASS ---

class Player {
    constructor() {
        // We gebruiken een 2e canvas om het land 'vast' op te tekenen.
        // Dit zorgt dat we niet elke frame alles opnieuw hoeven te berekenen.
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.trail = [];
    }

    reset() {
        // Canvas grootte updaten
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        this.landCtx.lineJoin = 'round';
        this.landCtx.lineCap = 'round';

        // Reset waarden
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 20; // Speler grootte (visueel)
        this.angle = 0;
        this.trail = [];
        this.isOutside = false;

        // Grid Logic Reset
        for (let x = 0; x < gridWidth; x++) territory[x].fill(0);

        // 1. LOGICA: Vul de start-cirkel in het grid
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const radiusVal = 6; // Straal in blokjes
        
        for (let x = -radiusVal; x <= radiusVal; x++) {
            for (let y = -radiusVal; y <= radiusVal; y++) {
                if (Math.sqrt(x*x + y*y) <= radiusVal) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // 2. VISUEEL: Teken een mooie ronde cirkel op het landCanvas
        this.landCtx.clearRect(0, 0, canvas.width, canvas.height);
        this.landCtx.fillStyle = COLOR_PLAYER;
        this.landCtx.beginPath();
        this.landCtx.arc(this.x, this.y, radiusVal * TILE_SIZE, 0, Math.PI * 2);
        this.landCtx.fill();
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
            if (Math.sqrt(dx*dx + dy*dy) > 20) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * 0.12; // Iets soepeler draaien
            }
        }

        // --- BEWEGING ---
        this.x += Math.cos(this.angle) * PLAYER_SPEED;
        this.y += Math.sin(this.angle) * PLAYER_SPEED;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        // Dood door muur
        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        const tileVal = territory[gx][gy];

        if (tileVal === 0) {
            // Buiten land -> Trail maken
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });

            // Check staart botsing
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const t = this.trail[i];
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist < this.size / 2) return this.die();
                }
            }

        } else if (tileVal === 1 && this.isOutside) {
            // Terug op land -> Veroveren!
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // Dit is de magie voor het "Smooth" effect.
        // We tekenen de Trail permanent op het landCanvas.
        
        // 1. Grid Logic Update (zodat botsingen kloppen)
        const newTiles = []; // Hou bij welke blokjes nieuw zijn
        
        // Zet trail om in grid punten
        this.trail.forEach(t => {
            // We maken de trail in het grid iets dikker (3x3) zodat er geen gaten zijn
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    let nx = t.gx+i, ny = t.gy+j;
                    if(nx >=0 && nx < gridWidth && ny >=0 && ny < gridHeight && territory[nx][ny] === 0) {
                        territory[nx][ny] = 1;
                        newTiles.push({x: nx, y: ny});
                    }
                }
            }
        });

        // Vul gaten (Flood Fill) en vang de gevulde blokjes op
        const filledTiles = this.fillHolesLogic(); 
        
        // 2. VISUELE UPDATE (Smooth)
        
        // A. Teken de trail als een vloeiend pad (dit maakt de randen rond)
        this.landCtx.fillStyle = COLOR_PLAYER;
        this.landCtx.strokeStyle = COLOR_PLAYER;
        this.landCtx.lineWidth = this.size + 2; // Iets dikker dan speler voor overlap
        
        this.landCtx.beginPath();
        if (this.trail.length > 0) {
            this.landCtx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) this.landCtx.lineTo(p.x, p.y);
            this.landCtx.lineTo(this.x, this.y);
        }
        this.landCtx.stroke(); // De rand
        this.landCtx.fill();   // De inhoud van de lus (soms pakt dit al veel)

        // B. Teken de 'gaten' die gevuld zijn.
        // Omdat de trail rond is, kunnen we de binnenkant blokkerig vullen; 
        // de trail verbergt de randjes!
        this.landCtx.beginPath();
        for(let t of filledTiles) {
            // We tekenen overlappende rects voor een solide massa
            this.landCtx.rect(t.x * TILE_SIZE, t.y * TILE_SIZE, TILE_SIZE+1, TILE_SIZE+1);
        }
        this.landCtx.fill();
    }

    fillHolesLogic() {
        // Flood fill algoritme om te zien wat 'buiten' is.
        // Alles wat NIET bereikt wordt, is 'binnen' (veroverd).
        const visited = new Uint8Array(gridWidth * gridHeight);
        const stack = [0]; 
        visited[0] = 1;

        while (stack.length > 0) {
            const index = stack.pop();
            const x = index % gridWidth;
            const y = Math.floor(index / gridWidth);

            const neighbors = [
                {nx: x+1, ny: y}, {nx: x-1, ny: y},
                {nx: x, ny: y+1}, {nx: x, ny: y-1}
            ];

            for (let n of neighbors) {
                if (n.nx >= 0 && n.nx < gridWidth && n.ny >= 0 && n.ny < gridHeight) {
                    const idx = n.ny * gridWidth + n.nx;
                    if (territory[n.nx][n.ny] === 0 && visited[idx] === 0) {
                        visited[idx] = 1;
                        stack.push(idx);
                    }
                }
            }
        }

        // Verzamel alle nieuw veroverde tegels
        const captured = [];
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const index = y * gridWidth + x;
                if (visited[index] === 0 && territory[x][y] === 0) {
                    territory[x][y] = 1; // Nu is het van ons
                    captured.push({x, y});
                }
            }
        }
        return captured;
    }

    draw() {
        // 1. Teken het land (dit is nu een plaatje, supersnel)
        ctx.save();
        // Schaduw voor diepte (Paper.io stijl)
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // 2. Teken de trail als we buiten zijn
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = this.size;
            ctx.strokeStyle = COLOR_TRAIL; // Iets andere kleur voor trail
            
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) ctx.lineTo(p.x, p.y);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }

        // 3. Teken de speler (Rood blokje)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = "#ff2e43";
        // Speler schaduw
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 5;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        ctx.restore();

        // 4. Naam
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText("Henk", this.x, this.y - 30);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
    }
}

// --- MAIN LOOP ---

initGrid();
const player = new Player();

// Input
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; lastInputMethod = 'keyboard'; });
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => { mousePos.x = e.clientX; mousePos.y = e.clientY; lastInputMethod = 'mouse'; });

// Start knop fix
startBtn.addEventListener('click', () => {
    initGrid();
    player.reset();
    overlay.style.display = 'none';
    gameRunning = true;
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Achtergrond
    ctx.fillStyle = "#e0f7fa"; // Paper.io lichtblauwe tint
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Raster
    ctx.strokeStyle = "rgba(0,0,0,0.03)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
    for (let i = 0; i < canvas.height; i += 40) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
    ctx.stroke();

    if (player) {
        player.update();
        player.draw();
    }
    requestAnimationFrame(loop);
}

loop();
