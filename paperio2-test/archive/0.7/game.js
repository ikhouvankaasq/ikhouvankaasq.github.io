const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Grid instellingen
const TILE_SIZE = 10; // Hoe kleiner, hoe vloeiender (maar zwaarder)
let gridWidth, gridHeight;
let territory = []; // Een 2D array van de hele kaart

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);
    resetGrid();
}

function resetGrid() {
    territory = Array(gridWidth).fill().map(() => Array(gridHeight).fill(0));
}

window.addEventListener('resize', resize);
resize();

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 10;
        this.color = '#ff4757';
        this.speed = 3.5;
        this.angle = 0;
        this.turnSpeed = 0.08;
        this.trail = [];
        this.isOutside = false;

        // Maak een start-cirkel van land
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        for (let x = -5; x <= 5; x++) {
            for (let y = -5; y <= 5; y++) {
                if (Math.sqrt(x*x + y*y) <= 5) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            territory[gx][gy] = val;
        }
    }

    getTerritory(gx, gy) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            return territory[gx][gy];
        }
        return -1;
    }

    update() {
        if (!gameRunning) return;

        // --- STURING ---
        if (lastInputMethod === 'keyboard') {
            if (keys['a'] || keys['arrowleft']) this.angle -= this.turnSpeed;
            if (keys['d'] || keys['arrowright']) this.angle += this.turnSpeed;
        } else {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            if (Math.sqrt(dx*dx + dy*dy) > 20) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * 0.1;
            }
        }

        // --- BEWEGING ---
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        const currentTile = this.getTerritory(gx, gy);

        if (currentTile === 0) {
            // We zijn buiten ons land
            this.isOutside = true;
            this.trail.push({ x: gx, y: gy });
            // TODO: Check hier of je je eigen trail raakt (death logic)
        } else if (currentTile === 1 && this.isOutside) {
            // We zijn weer terug in ons land!
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }

        // Grenzen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    capture() {
        // 1. Maak de trail onderdeel van het territory
        this.trail.forEach(t => this.setTerritory(t.x, t.y, 1));
        
        // 2. Flood fill of simpelere logica: we vullen alles in wat omsloten is.
        // Voor een simpele versie: scan per rij en vul tussen de trailpunten.
        // (Echte flood fill is complexer, dit is een versimpelde versie)
        this.fillEnclosed();
    }

    fillEnclosed() {
        // Een simpele bounding box fill voor nu
        if (this.trail.length < 3) return;
        
        const xs = this.trail.map(p => p.x);
        const ys = this.trail.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        for (let y = minY; y <= maxY; y++) {
            let inside = false;
            for (let x = minX; x <= maxX; x++) {
                if (this.getTerritory(x, y) === 1) {
                    // We scannen en vullen (zeer basic)
                    this.setTerritory(x, y, 1);
                }
            }
        }
    }

    draw() {
        // Teken Territory
        ctx.fillStyle = this.color + "66"; // Transparant land
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        // Teken Trail
        if (this.trail.length > 0) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x * TILE_SIZE, this.trail[0].y * TILE_SIZE);
            this.trail.forEach(t => ctx.lineTo(t.x * TILE_SIZE, t.y * TILE_SIZE));
            ctx.stroke();
        }

        // Teken Player
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const player = new Player();

// --- INPUTS ---
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['a','d','arrowleft','arrowright'].includes(e.key.toLowerCase())) lastInputMethod = 'keyboard';
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    lastInputMethod = 'mouse';
});

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
    resetGrid();
    player.reset();
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
