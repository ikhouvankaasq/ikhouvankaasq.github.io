const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

// --- INSTELLINGEN ---
const TILE_SIZE = 10;       // Grootte van de logische blokjes
const PLAYER_SPEED = 3;     // Constante snelheid
const TURN_SPEED = 0.08;    // Hoe snel je draait (smoothness)
const PLAYER_SIZE = 16;     // Dikte van de speler/lijn

const COLOR_PLAYER = '#ff4757'; // Hoofdkleur
const COLOR_TRAIL = '#ff6b81';  // Trail kleur (iets lichter)
const COLOR_BG = '#f0f9ff';     // Achtergrond

// --- GAME STATE ---
let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Grid Logic (Onzichtbaar, voor berekeningen)
let gridWidth = 0;
let gridHeight = 0;
let territory = []; // 2D Array: 0 = leeg, 1 = van jou

// --- INITIALISATIE ---

function initGrid() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);
    
    // Maak het logische grid aan
    territory = new Array(gridWidth);
    for (let x = 0; x < gridWidth; x++) {
        territory[x] = new Uint8Array(gridHeight).fill(0);
    }
}

// Herschaal logica bij window resize
window.addEventListener('resize', () => {
    initGrid();
    if(gameRunning && player) player.reset();
});

// --- SPELER KLASSE ---

class Player {
    constructor() {
        // Offscreen canvas: hier tekenen we het 'vaste' land op.
        // Dit voorkomt dat we elke frame alles opnieuw moeten berekenen.
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        
        this.reset();
    }

    reset() {
        // Sync offscreen canvas met scherm
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        this.landCtx.lineJoin = 'round';
        this.landCtx.lineCap = 'round';

        // Positie & Beweging
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.angle = 0; // Starthoek
        this.trail = []; // Array van coördinaten {x, y}
        this.isOutside = false;

        // Grid resetten
        for (let x = 0; x < gridWidth; x++) territory[x].fill(0);

        // START CIRKEL MAKEN
        // 1. Logisch grid vullen
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const radius = 6; 
        
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                if (Math.sqrt(x*x + y*y) <= radius) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // 2. Visueel tekenen op het landCanvas
        this.landCtx.fillStyle = COLOR_PLAYER;
        this.landCtx.beginPath();
        this.landCtx.arc(this.x, this.y, radius * TILE_SIZE, 0, Math.PI * 2);
        this.landCtx.fill();
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            territory[gx][gy] = val;
        }
    }

    update() {
        if (!gameRunning) return;

        // --- 1. INPUT & SMOOTH TURNING ---
        if (lastInputMethod === 'keyboard') {
            if (keys['a'] || keys['arrowleft']) this.angle -= TURN_SPEED;
            if (keys['d'] || keys['arrowright']) this.angle += TURN_SPEED;
        } else {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            // Alleen draaien als muis ver genoeg weg is (voorkomt trillen)
            if (Math.sqrt(dx*dx + dy*dy) > 10) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                // Zorg voor kortste draairichting (-PI tot PI)
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                // Interpoleer naar doel (smooth turning)
                this.angle += angleDiff * 0.15;
            }
        }

        // --- 2. BEWEGING (Constant Speed) ---
        this.x += Math.cos(this.angle) * PLAYER_SPEED;
        this.y += Math.sin(this.angle) * PLAYER_SPEED;

        // Grid coördinaten berekenen
        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        // --- 3. COLLISION: MUUR ---
        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) {
            return this.die();
        }

        const tileVal = territory[gx][gy];

        // --- 4. LOGICA: BUITEN OF BINNEN? ---
        if (tileVal === 0) {
            // We zijn op vreemd terrein -> Trail uitbreiden
            this.isOutside = true;
            
            // Optimalisatie: Voeg punt alleen toe als het ver genoeg is van het vorige punt
            // Dit houdt de lijn mooi strak en bespaart geheugen.
            const lastPoint = this.trail[this.trail.length - 1];
            if (!lastPoint || Math.hypot(this.x - lastPoint.x, this.y - lastPoint.y) > 2) {
                this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
            }

            // --- 5. COLLISION: SELF-HIT (STAART) ---
            // We checken de trail array, maar slaan de laatste 20 punten over (zodat je niet je eigen nek raakt)
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 20; i++) {
                    const t = this.trail[i];
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    // Als afstand kleiner is dan straal speler -> botsing
                    if (dist < PLAYER_SIZE / 2) return this.die();
                }
            }

        } else if (tileVal === 1 && this.isOutside) {
            // We komen terug op eigen land -> VEROVEREN
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // --- STAP 1: VISUELE VULLING (POLYGON FILL) ---
        // We tekenen de vorm van de trail direct op het vaste landCanvas.
        // Dit zorgt voor de vloeiende, ronde Paper.io 2 look.
        
        this.landCtx.fillStyle = COLOR_PLAYER;
        this.landCtx.beginPath();
        if (this.trail.length > 0) {
            this.landCtx.moveTo(this.trail[0].x, this.trail[0].y);
            // Teken lijnen door alle punten (Path Interpolation)
            for (let p of this.trail) this.landCtx.lineTo(p.x, p.y);
        }
        this.landCtx.lineTo(this.x, this.y); // Sluit af naar speler
        this.landCtx.closePath();
        this.landCtx.fill(); // Vult de vorm in
        
        // We tekenen de rand ook even dik, voor ronde hoeken
        this.landCtx.strokeStyle = COLOR_PLAYER;
        this.landCtx.lineWidth = PLAYER_SIZE; 
        this.landCtx.stroke();

        // --- STAP 2: LOGISCHE VULLING (GRID) ---
        // Nu moeten we het logische grid updaten zodat we weten welk gebied van ons is.
        
        // A. Markeer de trail zelf als territory
        this.trail.forEach(t => {
            // 3x3 rondom het punt markeren om gaatjes te dichten
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) this.setTerritory(t.gx+i, t.gy+j, 1);
            }
        });

        // B. Vul de gaten (Flood Fill algoritme)
        // Alles wat niet bereikbaar is vanaf (0,0) is 'gevangen' en wordt van jou.
        const visited = new Uint8Array(gridWidth * gridHeight);
        const stack = [0]; 
        visited[0] = 1;

        while (stack.length > 0) {
            const idx = stack.pop();
            const x = idx % gridWidth;
            const y = Math.floor(idx / gridWidth);

            const neighbors = [{x:x+1,y:y}, {x:x-1,y:y}, {x:x,y:y+1}, {x:x,y:y-1}];
            for (let n of neighbors) {
                if (n.x >= 0 && n.x < gridWidth && n.y >= 0 && n.y < gridHeight) {
                    const nIdx = n.y * gridWidth + n.x;
                    if (territory[n.x][n.y] === 0 && visited[nIdx] === 0) {
                        visited[nIdx] = 1;
                        stack.push(nIdx);
                    }
                }
            }
        }

        // C. Update Logic & Visueel (voor de binnenkant)
        this.landCtx.beginPath(); // Voorbereiden voor extra vulling
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const idx = y * gridWidth + x;
                // Als het niet bezocht is en nog niet van mij was -> Nieuw veroverd!
                if (visited[idx] === 0 && territory[x][y] === 0) {
                    territory[x][y] = 1;
                    // Teken rechthoekjes over de gaten heen.
                    // Omdat we Stap 1 (Polygon Fill) al deden, zie je de blokkerige randjes niet!
                    // Die zitten verstopt onder de dikke polygon rand.
                    this.landCtx.rect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE+1, TILE_SIZE+1);
                }
            }
        }
        this.landCtx.fill();
    }

    draw() {
        // 1. Teken het vaste land (met schaduw)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowOffsetY = 4;
        ctx.shadowBlur = 10;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // 2. Teken de Trail (Path Interpolation)
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = PLAYER_SIZE;
            ctx.strokeStyle = COLOR_TRAIL; // Iets andere kleur voor trail

            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) ctx.lineTo(p.x, p.y);
            ctx.lineTo(this.x, this.y); // Verbind trail met kop
            
            ctx.stroke();
        }

        // 3. Teken de "Head" (Speler Kop)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = "#ff2e43"; // Donkerder rood voor contrast
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 5;
        
        // Teken een vierkant (Paper.io stijl)
        ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        
        ctx.restore();

        // 4. Naam Label
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
    }
}

// --- MAIN LOOP & EVENTS ---

initGrid();
const player = new Player();

// Input Listeners
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

startBtn.addEventListener('click', () => {
    initGrid();
    player.reset();
    overlay.style.display = 'none';
    gameRunning = true;
});

function loop() {
    // Schoonmaken
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Achtergrond
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Raster (Subtiel)
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
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

// Start loop
loop();
