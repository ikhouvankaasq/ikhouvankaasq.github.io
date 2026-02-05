const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

// --- INSTELLINGEN ---
const CONFIG = {
    tileSize: 10,       
    speed: 3.5,         
    turnSpeed: 0.09,    
    playerSize: 18,     
    minTrailDist: 5,    
    colors: {
        player: '#ff4757',
        trail: '#ff6b81',
        bg: '#f0f9ff'
    }
};

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

let gridWidth, gridHeight;
let territory = []; 

// --- SPELER KLASSE ---
class Player {
    constructor() {
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        this.x = 0;
        this.y = 0;
        this.trail = [];
    }

    reset() {
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.angle = 0;
        this.trail = []; 
        this.isOutside = false;

        initGridData();
        this.createStartZone();
    }

    createStartZone() {
        const r = 6; 
        const startGX = Math.floor(this.x / CONFIG.tileSize);
        const startGY = Math.floor(this.y / CONFIG.tileSize);

        // 1. Grid vullen
        for (let x = -r; x <= r; x++) {
            for (let y = -r; y <= r; y++) {
                if (Math.sqrt(x*x + y*y) <= r) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // 2. Visueel tekenen (Cirkel)
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

        // Input
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
                this.angle += angleDiff * 0.15; 
            }
        }

        // Beweging
        this.x += Math.cos(this.angle) * CONFIG.speed;
        this.y += Math.sin(this.angle) * CONFIG.speed;

        const gx = Math.floor(this.x / CONFIG.tileSize);
        const gy = Math.floor(this.y / CONFIG.tileSize);

        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        const onTerritory = territory[gx][gy] === 1;

        if (!onTerritory) {
            this.isOutside = true;
            
            const lastP = this.trail[this.trail.length - 1];
            if (!lastP || Math.hypot(this.x - lastP.x, this.y - lastP.y) > CONFIG.minTrailDist) {
                this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
            }

            // Self-Collision
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const t = this.trail[i];
                    if (Math.hypot(this.x - t.x, this.y - t.y) < CONFIG.playerSize / 2) {
                        return this.die();
                    }
                }
            }
        } else if (onTerritory && this.isOutside) {
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // --- STAP 1: LOGICA (Grid updaten) ---
        
        // Markeer trail als land
        this.trail.forEach(t => {
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) this.setTerritory(t.gx+i, t.gy+j, 1);
        });

        // Zoek de gaten (Flood Fill Logic)
        const filledPoints = this.calculateHoles();

        // --- STAP 2: VISUEEL (De 'Smooth' Fix) ---
        // Om lelijke randjes te voorkomen, tekenen we in lagen:
        
        this.landCtx.fillStyle = CONFIG.colors.player;

        // A. Vul eerst de diepe gaten (Overlappende vierkanten)
        // Dit zorgt voor de 'body' van het nieuwe land.
        this.landCtx.beginPath();
        for (let p of filledPoints) {
            // We tekenen iets groter (+1 px rondom) zodat ze in elkaar smelten
            this.landCtx.rect(
                p.x * CONFIG.tileSize - 1, 
                p.y * CONFIG.tileSize - 1, 
                CONFIG.tileSize + 2, 
                CONFIG.tileSize + 2
            );
        }
        this.landCtx.fill();

        // B. Teken de Trail als 'Solid' (Cirkels + Fill)
        // Dit bedekt de randen van de vierkanten hierboven.
        
        this.landCtx.beginPath();
        if (this.trail.length > 0) {
            this.landCtx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) this.landCtx.lineTo(p.x, p.y);
            this.landCtx.lineTo(this.x, this.y);
        }
        this.landCtx.fill(); // Vult de kern van de slang

        // C. De "Liquid Stroke" truc:
        // In plaats van ctx.stroke() te gebruiken (wat lijntjes geeft), 
        // tekenen we cirkels op elk punt. Dit maakt het boterzacht.
        const radius = CONFIG.playerSize / 2;
        for (let p of this.trail) {
            this.landCtx.beginPath();
            this.landCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            this.landCtx.fill();
        }
        // Ook eentje op de speler positie
        this.landCtx.beginPath();
        this.landCtx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        this.landCtx.fill();
    }

    calculateHoles() {
        // Flood fill logic die berekent welke tiles gevuld moeten worden
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

        const newLand = [];
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const idx = y * gridWidth + x;
                if (visited[idx] === 0 && territory[x][y] === 0) {
                    territory[x][y] = 1;
                    newLand.push({x, y});
                }
            }
        }
        return newLand;
    }

    draw() {
        // Land
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowOffsetY = 4;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // Trail (wanneer je buiten bent)
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = CONFIG.playerSize;
            ctx.strokeStyle = CONFIG.colors.trail;
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }

        // Speler Kop
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#ff2e43"; 
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.shadowBlur = 5;
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

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / CONFIG.tileSize);
    gridHeight = Math.ceil(canvas.height / CONFIG.tileSize);
    if (gameRunning) player.reset();
}

function initGridData() {
    territory = new Array(gridWidth);
    for (let x = 0; x < gridWidth; x++) {
        territory[x] = new Uint8Array(gridHeight).fill(0);
    }
}

resize();
window.addEventListener('resize', resize);

const player = new Player();

window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; lastInputMethod = 'keyboard'; });
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => { mousePos.x = e.clientX; mousePos.y = e.clientY; lastInputMethod = 'mouse'; });

startBtn.addEventListener('click', () => {
    resize();
    player.reset();
    overlay.style.display = 'none';
    gameRunning = true;
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
