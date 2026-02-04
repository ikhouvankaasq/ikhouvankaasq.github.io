const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

const TILE_SIZE = 10; 
let gridWidth, gridHeight;
let territory = []; 

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);
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
        this.trail = []; 
        this.isOutside = false;
        
        resetGrid();

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

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
        overlay.querySelector('h1').innerText = "GAME OVER";
        startBtn.innerText = "RESTART";
    }

    update() {
        if (!gameRunning) return;

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
            if (this.isOutside && this.trail.length > 10) {
                const hit = this.trail.some((p, index) => 
                    index < this.trail.length - 10 && p.gx === gx && p.gy === gy
                );
                if (hit) { this.die(); return; }
            }
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
        } else if (tile === 1 && this.isOutside) {
            this.finishCapture();
            this.isOutside = false;
            this.trail = [];
        }

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.die();
    }

    finishCapture() {
        this.trail.forEach(t => this.setTerritory(t.gx, t.gy, 1));
        this.fillTerritory();
    }

    fillTerritory() {
        let checkGrid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(false));
        let queue = [];
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
            queue.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
        }
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (!checkGrid[x][y]) territory[x][y] = 1;
            }
        }
    }

    draw() {
        // --- VLOEIEND LAND TEKENEN ---
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        
        // Gebruik 'marching squares' idee: teken alleen als het een territory tegel is
        // Om de pixels weg te halen, vullen we de hele grid-tegel maar met een kleine 'blur' of overlap
        ctx.beginPath();
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    // Teken kleine cirkeltjes ipv vierkantjes voor een 'organic' feel aan de randen
                    ctx.rect(x * TILE_SIZE - 1, y * TILE_SIZE - 1, TILE_SIZE + 2, TILE_SIZE + 2);
                }
            }
        }
        ctx.fill();
        ctx.restore();

        // --- DE RAND VAN HET LAND (VLOEIENDE LIJN) ---
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        // Hier tekenen we optioneel een extra rand om het land heen voor de looks

        // --- TRAIL (LIJN ACHTER JE) ---
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // --- PLAYER ---
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
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
    player.reset();
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Grid achtergrond
    ctx.strokeStyle = '#f5f5f5';
    for(let i=0; i<canvas.width; i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,canvas.height);ctx.stroke();}
    for(let i=0; i<canvas.height; i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(canvas.width,i);ctx.stroke();}
    
    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
