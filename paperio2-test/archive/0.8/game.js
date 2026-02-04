const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

const TILE_SIZE = 8; // Iets kleiner voor meer detail
let gridWidth, gridHeight;
let territory = []; 

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
        this.size = 12;
        this.color = '#ff4757';
        this.speed = 4;
        this.angle = 0;
        this.turnSpeed = 0.08;
        this.trail = []; // Slaat nu exacte coördinaten op voor soepele lijn
        this.isOutside = false;

        // Start basis
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        for (let x = -8; x <= 8; x++) {
            for (let y = -8; y <= 8; y++) {
                if (Math.sqrt(x*x + y*y) <= 8) {
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

        // Besturing
        if (lastInputMethod === 'keyboard') {
            if (keys['a'] || keys['arrowleft']) this.angle -= this.turnSpeed;
            if (keys['d'] || keys['arrowright']) this.angle += this.turnSpeed;
        } else {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            if (Math.sqrt(dx*dx + dy*dy) > 25) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * 0.1;
            }
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);
        const tile = this.getTerritory(gx, gy);

        if (tile === 0) {
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
        } else if (tile === 1 && this.isOutside) {
            this.finishCapture();
            this.isOutside = false;
            this.trail = [];
        }

        // Grenzen
        if (this.x < 0) this.x = 0; if (this.x > canvas.width) this.x = canvas.width;
        if (this.y < 0) this.y = 0; if (this.y > canvas.height) this.y = canvas.height;
    }

    finishCapture() {
        // 1. Zet de trail om naar territory
        this.trail.forEach(t => this.setTerritory(t.gx, t.gy, 1));

        // 2. Inkleuren (Flood Fill algoritme)
        // We vullen alles wat NIET territory is en de rand niet kan raken
        this.fillTerritory();
    }

    fillTerritory() {
        let checkGrid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(false));
        let queue = [];

        // Vind alle 'lege' cellen aan de rand en markeer ze als "buiten"
        for (let x = 0; x < gridWidth; x++) {
            if (territory[x][0] === 0) queue.push([x, 0]);
            if (territory[x][gridHeight - 1] === 0) queue.push([x, gridHeight - 1]);
        }
        for (let y = 0; y < gridHeight; y++) {
            if (territory[0][y] === 0) queue.push([0, y]);
            if (territory[gridWidth - 1][y] === 0) queue.push([gridWidth - 1, y]);
        }

        while (queue.length > 0) {
            let [x, y] = queue.shift();
            if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight || checkGrid[x][y] || territory[x][y] === 1) continue;
            
            checkGrid[x][y] = true;
            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        // Alles wat niet territory is en NIET gemarkeerd is als buiten, moet gevuld worden
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (!checkGrid[x][y]) {
                    territory[x][y] = 1;
                }
            }
        }
    }

    draw() {
        // Teken Territory (Land)
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.4;
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE + 1, TILE_SIZE + 1);
                }
            }
        }
        ctx.globalAlpha = 1.0;

        // Teken Trail (Lijn) - Nu weer soepel!
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // Teken Player
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Oogje
        ctx.fillStyle = "white";
        const eyeX = this.x + Math.cos(this.angle) * 5;
        const eyeY = this.y + Math.sin(this.angle) * 5;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

const player = new Player();

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
    resize(); // Reset grid en canvas
    player.reset();
});

function drawGrid() {
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function loop() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
