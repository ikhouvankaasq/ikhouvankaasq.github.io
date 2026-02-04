const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// Logica grid blijft bestaan voor collision, maar we tekenen er NIET mee.
const TILE_SIZE = 8; 
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
        // Dit canvas houdt de 'vaste' vorm van je land bij als vector
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        this.reset();
    }

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 14; 
        this.color = '#ff4757'; 
        this.speed = 4;
        this.angle = 0;
        this.turnSpeed = 0.08;
        this.trail = []; 
        this.isOutside = false;
        
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        resetGrid();

        // Teken de begin-cirkel (Vector)
        this.landCtx.fillStyle = this.color;
        this.landCtx.beginPath();
        this.landCtx.arc(this.x, this.y, 60, 0, Math.PI * 2);
        this.landCtx.fill();

        // Vul grid voor collision
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        for (let x = -10; x <= 10; x++) {
            for (let y = -10; y <= 10; y++) {
                if (Math.sqrt(x*x + y*y) <= 8) this.setTerritory(startGX + x, startGY + y, 1);
            }
        }
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) territory[gx][gy] = val;
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
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
            
            // Check self-hit
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const dist = Math.hypot(this.x - this.trail[i].x, this.y - this.trail[i].y);
                    if (dist < 8) return this.die();
                }
            }
        } else if (territory[gx][gy] === 1 && this.isOutside) {
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // --- DE SMOOTH FIX ---
        // 1. Teken de veroverde vorm als een SOLIDE PAD op de buffer
        this.landCtx.fillStyle = this.color;
        this.landCtx.beginPath();
        // We beginnen bij het punt waar je je territorium verliet
        this.landCtx.moveTo(this.trail[0].x, this.trail[0].y);
        
        // Teken lijnen langs je hele trail
        for (let i = 1; i < this.trail.length; i++) {
            this.landCtx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        
        // Sluit het pad af naar je huidige positie
        this.landCtx.lineTo(this.x, this.y);
        this.landCtx.fill(); // Dit vult de hele binnenkant vloeiend op

        // 2. Grid updaten (voor de logica)
        this.trail.forEach(t => {
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) this.setTerritory(t.gx+i, t.gy+j, 1);
        });
        this.fillGridLogic();
    }

    fillGridLogic() {
        // Flood fill om het grid bij te werken (onzichtbaar)
        let checkGrid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(false));
        let queue = [[0,0]];
        checkGrid[0][0] = true;

        while (queue.length > 0) {
            let [x, y] = queue.shift();
            const neighbors = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]];
            for (let [nx, ny] of neighbors) {
                if (nx>=0 && nx<gridWidth && ny>=0 && ny<gridHeight && !checkGrid[nx][ny] && territory[nx][ny]===0) {
                    checkGrid[nx][ny] = true;
                    queue.push([nx, ny]);
                }
            }
        }
        for (let x=0; x<gridWidth; x++) {
            for (let y=0; y<gridHeight; y++) {
                if (!checkGrid[x][y]) territory[x][y] = 1;
            }
        }
    }

    draw() {
        // Teken land met 3D schaduw
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowOffsetY = 5;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // Teken trail
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Teken speler (Vierkant zoals screenshot)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#ff2e43";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();

        // Naam
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.strokeText("Henk", this.x, this.y - 25);
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
        player.reset();
    }
}

const player = new Player();

window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => { mousePos.x = e.clientX; mousePos.y = e.clientY; lastInputMethod = 'mouse'; });

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f0f9ff"; // Paper.io lichte achtergrond
    ctx.fillRect(0,0, canvas.width, canvas.height);
    
    // Raster
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
