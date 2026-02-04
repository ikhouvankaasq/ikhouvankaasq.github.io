const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// LOGICA GRID (Gebruikt voor botsingen, niet voor tekenen!)
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
        // Maak een apart 'buffer' canvas voor het land. 
        // Dit werkt als een laag in Photoshop.
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
        
        // Synchroniseer buffer grootte met scherm
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;

        resetGrid();

        // 1. TEKEN DE BASIS OP DE BUFFER (Perfecte cirkel)
        const radius = 60;
        this.landCtx.fillStyle = this.color;
        this.landCtx.beginPath();
        this.landCtx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        this.landCtx.fill();

        // 2. VUL HET LOGISCHE GRID (Zodat je niet dood gaat in je basis)
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const gridRad = Math.ceil(radius / TILE_SIZE);
        
        for (let x = -gridRad; x <= gridRad; x++) {
            for (let y = -gridRad; y <= gridRad; y++) {
                if (Math.sqrt(x*x + y*y) * TILE_SIZE <= radius) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) territory[gx][gy] = val;
    }

    getTerritory(gx, gy) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) return territory[gx][gy];
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

        // --- INPUT ---
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

        // Check grenzen
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.die();

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);
        const tile = this.getTerritory(gx, gy);

        // --- GAMEPLAY LOGICA ---
        if (tile === 0) {
            // Buiten je gebied
            if (this.isOutside && this.trail.length > 10) {
                // Botsing met eigen staart
                const hit = this.trail.some((p, i) => i < this.trail.length - 10 && Math.abs(p.gx - gx) < 2 && Math.abs(p.gy - gy) < 2);
                if (hit) return this.die();
            }
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
        } else if (tile === 1 && this.isOutside) {
            // Terug in eigen gebied -> CLAIMEN
            this.finishCapture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    finishCapture() {
        // 1. UPDATE VISUALS (De Buffer)
        // We tekenen de vorm van de trail direct op het buffer canvas.
        // Dit zorgt voor de scherpe, vloeiende randen.
        this.landCtx.fillStyle = this.color;
        this.landCtx.beginPath();
        if (this.trail.length > 0) {
            this.landCtx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                this.landCtx.lineTo(this.trail[i].x, this.trail[i].y);
            }
        }
        this.landCtx.closePath();
        this.landCtx.fill(); 

        // Soms dekt de polygoon niet alles (binnenkant), dus we vullen ook 
        // de gaten op basis van het grid, maar tekenen ze op de buffer.
        
        // 2. UPDATE LOGICA (Flood Fill)
        // Maak trail in grid 'veilig'
        this.trail.forEach(t => {
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) this.setTerritory(t.gx+i, t.gy+j, 1);
        });

        // Flood fill om de binnenkant te vinden
        let checkGrid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(false));
        let queue = [];
        
        // Scan randen
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

        // Vul alles wat veroverd is
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (!checkGrid[x][y] && territory[x][y] === 0) {
                    territory[x][y] = 1;
                    // Teken deze interne pixels ook op de buffer voor de zekerheid
                    // We tekenen ze iets groter om naden te voorkomen
                    this.landCtx.fillRect(x * TILE_SIZE - 1, y * TILE_SIZE - 1, TILE_SIZE + 2, TILE_SIZE + 2);
                }
            }
        }
    }

    draw() {
        // 1. TEKEN HET LAND (Het plaatje uit het geheugen)
        // Hier passen we de schaduw toe op het HELE eiland in 1 keer.
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 4; // Het 3D effect
        
        // We tekenen gewoon het buffer canvas! Geen loops, geen blokjes berekenen.
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // 2. TEKEN DE TRAIL
        if (this.trail.length > 1) {
            ctx.strokeStyle = 'rgba(255, 71, 87, 0.5)'; // Semi-transparant rood
            ctx.lineWidth = this.size; 
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
            ctx.stroke();
        }

        // 3. TEKEN DE SPELER (Roterend blokje)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = "#ff2e43"; // Iets donkerder rood
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
        
        // Naam
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeText("Henk", this.x, this.y - 25);
        ctx.fillText("Henk", this.x, this.y - 25);
    }
}

const player = new Player();

// INPUT HANDLING
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
    
    // Achtergrond (Schoon Paper.io blauw/wit)
    ctx.fillStyle = "#e0f7fa";
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // Raster lijntjes (Heel subtiel)
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,canvas.height);ctx.stroke();}
    for(let i=0; i<canvas.height; i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(canvas.width,i);ctx.stroke();}

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
