const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Logica grid (alleen voor berekeningen, niet voor het oog)
const TILE_SIZE = 6; 
let gridWidth, gridHeight, territory; 

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

        // Start basis (onzichtbaar grid vullen)
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const radius = 12;
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                if (Math.sqrt(x*x + y*y) <= radius) territory[startGX + x][startGY + y] = 1;
            }
        }
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
        overlay.querySelector('h1').innerText = "GAME OVER";
        startBtn.innerText = "RESTART";
    }

    update() {
        if (!gameRunning) return;

        // Input
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
                this.angle += angleDiff * 0.15;
            }
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        if (territory[gx][gy] === 0) {
            // Self-collision
            if (this.isOutside && this.trail.length > 10) {
                if (this.trail.some((p, i) => i < this.trail.length - 15 && Math.abs(p.gx - gx) < 2 && Math.abs(p.gy - gy) < 2)) return this.die();
            }
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
        } else if (territory[gx][gy] === 1 && this.isOutside) {
            this.finishCapture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    finishCapture() {
        this.trail.forEach(t => {
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) {
                let nx = t.gx+i, ny = t.gy+j;
                if(nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) territory[nx][ny] = 1;
            }
        });
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
        // --- DE MAGIE: BLOB RENDERING ---
        // We tekenen alles eerst "zacht" en maken het dan hard met een filter
        ctx.save();
        ctx.filter = "blur(3px) contrast(300%)"; // DIT VERWIJDERT ALLE PIXELS
        ctx.fillStyle = this.color;

        ctx.beginPath();
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    // We tekenen cirkels ipv vierkantjes voor maximale smoothness
                    ctx.moveTo(x * TILE_SIZE, y * TILE_SIZE);
                    ctx.arc(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE * 0.9, 0, Math.PI * 2);
                }
            }
        }
        ctx.fill();
        ctx.restore();

        // --- TRAIL (SMOOTH LINE) ---
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
            ctx.stroke();
        }

        // --- PLAYER ---
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Oogje
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(this.angle)*5, this.y + Math.sin(this.angle)*5, 3, 0, Math.PI*2);
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
    mousePos.x = e.clientX; mousePos.y = e.clientY;
    lastInputMethod = 'mouse';
});

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
    player.reset();
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid achtergrond (super licht)
    ctx.strokeStyle = '#f8f8f8';
    for(let i=0; i<canvas.width; i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,canvas.height);ctx.stroke();}
    for(let i=0; i<canvas.height; i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(canvas.width,i);ctx.stroke();}

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
