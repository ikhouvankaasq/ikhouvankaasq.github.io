const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

// --- INSTELLINGEN ---
const CONFIG = {
    tileSize: 10,       // Grootte van de logische blokjes
    speed: 3.5,         // Snelheid van de speler
    turnSpeed: 0.09,    // Draaisnelheid
    playerSize: 18,     // Dikte van de speler/lijn
    minTrailDist: 5,    // MINIMALE afstand voor een nieuw punt (voorkomt blobs!)
    colors: {
        player: '#ff4757',
        trail: '#ff6b81',
        bg: '#f0f9ff'
    }
};

// --- VARIABELEN ---
let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Grid Logic (Onzichtbaar, voor botsingen)
let gridWidth, gridHeight;
let territory = []; // 2D array

// --- SPELER KLASSE ---
class Player {
    constructor() {
        // Offscreen canvas voor het vaste land (optimalisatie + smooth look)
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        
        // Initialiseren (maar nog niet resetten tot de game start)
        this.x = 0;
        this.y = 0;
        this.trail = [];
    }

    reset() {
        // Canvas grootte syncen
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        this.landCtx.lineJoin = 'round'; // Zorgt voor ronde hoeken
        this.landCtx.lineCap = 'round';  // Zorgt voor ronde uiteindes

        // Speler stats
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.angle = 0;
        this.trail = []; 
        this.isOutside = false;

        // Grid leegmaken
        initGridData();

        // Start Cirkel Maken (Vector + Grid)
        this.createStartZone();
    }

    createStartZone() {
        const r = 6; // Radius in tiles
        const startGX = Math.floor(this.x / CONFIG.tileSize);
        const startGY = Math.floor(this.y / CONFIG.tileSize);

        // 1. Grid vullen (Logica)
        for (let x = -r; x <= r; x++) {
            for (let y = -r; y <= r; y++) {
                if (Math.sqrt(x*x + y*y) <= r) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // 2. Canvas tekenen (Visueel)
        this.landCtx.fillStyle = CONFIG.colors.player;
        this.landCtx.beginPath();
        this.landCtx.arc(this.x, this.y, r * CONFIG.tileSize, 0, Math.PI * 2);
        this.landCtx.fill();
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            territory[gx][gy] = val;
        }
    }

    update() {
        if (!gameRunning) return;

        // 1. Besturing & Draaien
        if (lastInputMethod === 'keyboard') {
            if (keys['a'] || keys['arrowleft']) this.angle -= CONFIG.turnSpeed;
            if (keys['d'] || keys['arrowright']) this.angle += CONFIG.turnSpeed;
        } else {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            if (Math.hypot(dx, dy) > 10) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * 0.15; // Smooth turn factor
            }
        }

        // 2. Bewegen
        this.x += Math.cos(this.angle) * CONFIG.speed;
        this.y += Math.sin(this.angle) * CONFIG.speed;

        // 3. Grid Check
        const gx = Math.floor(this.x / CONFIG.tileSize);
        const gy = Math.floor(this.y / CONFIG.tileSize);

        // Buiten scherm?
        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        const onTerritory = territory[gx][gy] === 1;

        // 4. Trail Logica
        if (!onTerritory) {
            this.isOutside = true;
            
            // CRUCIAAL: Voeg punt alleen toe als we genoeg bewogen hebben
            // Dit voorkomt het 'blob' effect van opgestapelde punten.
            const lastP = this.trail[this.trail.length - 1];
            if (!lastP || Math.hypot(this.x - lastP.x, this.y - lastP.y) > CONFIG.minTrailDist) {
                this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
            }

            // Self-Collision Check (Niet tegen eigen staart botsen)
            // We checken alles behalve de laatste 15 punten (zodat je niet direct sterft bij een draai)
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const t = this.trail[i];
                    if (Math.hypot(this.x - t.x, this.y - t.y) < CONFIG.playerSize / 2) {
                        return this.die();
                    }
                }
            }
        } else if (onTerritory && this.isOutside) {
            // We zijn terug! Veroveren.
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // STAP 1: Visueel vullen (De "Smooth" methode)
        // We tekenen de vorm van de trail + terugweg naar land op het landCanvas
        this.landCtx.fillStyle = CONFIG.colors.player;
        this.landCtx.strokeStyle = CONFIG.colors.player;
        this.landCtx.lineWidth = CONFIG.playerSize; // Zorg dat randen dik en rond zijn

        this.landCtx.beginPath();
        // Start bij het begin van de trail (waar je het land verliet)
        if (this.trail.length > 0) {
            this.landCtx.moveTo(this.trail[0].x, this.trail[0].y);
            // Trek lijnen door alle punten
            for (let p of this.trail) this.landCtx.lineTo(p.x, p.y);
        }
        // Sluit af naar huidige positie
        this.landCtx.lineTo(this.x, this.y);
        this.landCtx.closePath(); 
        
        this.landCtx.fill();   // Vult de binnenkant
        this.landCtx.stroke(); // Maakt de randen rond en zacht

        // STAP 2: Logisch vullen (Grid updaten voor botsingen)
        // Markeer trail als land
        this.trail.forEach(t => {
            // 3x3 kwast om gaten te dichten
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) this.setTerritory(t.gx+i, t.gy+j, 1);
        });

        // Flood Fill om de gaten ("Captured Area") te vinden
        this.fillHoles();
    }

    fillHoles() {
        // Flood fill vanaf (0,0). Alles wat NIET bereikt wordt, is ingesloten.
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

        // Alles wat niet bezocht is, wordt van ons
        // We tekenen hier ook extra blokjes op het canvas voor de zekerheid (vult kleine gaatjes)
        this.landCtx.beginPath();
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const idx = y * gridWidth + x;
                if (visited[idx] === 0 && territory[x][y] === 0) {
                    territory[x][y] = 1;
                    // Teken blokje op buffer (valt meestal weg onder de vector fill, maar fixt gaten)
                    this.landCtx.rect(x*CONFIG.tileSize, y*CONFIG.tileSize, CONFIG.tileSize, CONFIG.tileSize);
                }
            }
        }
        this.landCtx.fill();
    }

    draw() {
        // 1. Teken Land (Buffer)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowOffsetY = 4;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // 2. Teken Trail (Het pad achter je)
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = CONFIG.playerSize;
            ctx.strokeStyle = CONFIG.colors.trail;

            // Begin bij eerste punt
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            
            // Verbind alle punten met lijnen (geen losse bolletjes!)
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            // Verbind laatste punt met speler
            ctx.lineTo(this.x, this.y);
            
            ctx.stroke();
        }

        // 3. Teken Speler Kop (Vierkant)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = "#ff2e43"; // Iets donkerder rood voor contrast
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.shadowBlur = 5;
        
        // Teken vierkant gecentreerd
        const s = CONFIG.playerSize;
        ctx.fillRect(-s/2, -s/2, s, s);
        
        ctx.restore();

        // Naam
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2;
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
    }
}

// --- INITIALISATIE ---

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / CONFIG.tileSize);
    gridHeight = Math.ceil(canvas.height / CONFIG.tileSize);
    
    // Als we resizen tijdens het spel, herstarten we voor de veiligheid
    if (gameRunning) {
        player.reset();
    }
}

function initGridData() {
    territory = new Array(gridWidth);
    for (let x = 0; x < gridWidth; x++) {
        territory[x] = new Uint8Array(gridHeight).fill(0);
    }
}

// Volgorde is belangrijk!
resize();
window.addEventListener('resize', resize);

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
    resize(); // Zeker weten dat gridmaat klopt
    player.reset();
    overlay.style.display = 'none';
    gameRunning = true;
});

// Game Loop
function loop() {
    // Wis scherm
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Achtergrond
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Raster (subtiel)
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

loop();





