const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

// We gebruiken een kleine tile size voor nauwkeurige logica, 
// maar we tekenen het "slim" zodat het er niet blokkerig uitziet.
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
        this.reset();
    }

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 15; // Iets groter blokje zoals op de foto
        this.color = '#ff4757'; 
        this.speed = 4;
        this.angle = 0;
        this.turnSpeed = 0.08;
        this.trail = []; 
        this.isOutside = false;
        
        // BASIS INSTELLINGEN (De perfecte cirkel)
        this.baseRadius = 60; // Grootte van de start cirkel
        
        resetGrid();

        // We vullen het grid wel voor de logica (zodat je niet dood gaat in je basis)
        // Maar we tekenen het straks anders.
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const gridRad = Math.ceil(this.baseRadius / TILE_SIZE);
        
        for (let x = -gridRad; x <= gridRad; x++) {
            for (let y = -gridRad; y <= gridRad; y++) {
                // Check of dit punt binnen de cirkel valt
                if (Math.sqrt(x*x + y*y) * TILE_SIZE <= this.baseRadius) {
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
                this.angle += angleDiff * 0.15;
            }
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        // --- LOGICA ---
        const tile = this.getTerritory(gx, gy);

        if (tile === 0) {
            // Self-collision op trail
            if (this.isOutside && this.trail.length > 10) {
                // Check of we onze eigen trail raken
                const hit = this.trail.some((p, i) => i < this.trail.length - 10 && Math.abs(p.gx - gx) < 2 && Math.abs(p.gy - gy) < 2);
                if (hit) return this.die();
            }
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
        } else if (tile === 1 && this.isOutside) {
            this.finishCapture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    finishCapture() {
        // Maak trail iets dikker bij het opslaan om gaatjes te voorkomen
        this.trail.forEach(t => {
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) {
                this.setTerritory(t.gx+i, t.gy+j, 1);
            }
        });
        this.fillTerritory();
    }

    fillTerritory() {
        // Standaard Flood Fill algoritme
        let checkGrid = Array(gridWidth).fill().map(() => Array(gridHeight).fill(false));
        let queue = [];
        
        // Scan de randen
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

        // Alles wat niet bereikbaar was vanaf de rand, is nu van jou
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (!checkGrid[x][y]) territory[x][y] = 1;
            }
        }
    }

    draw() {
        // --- 1. TEKEN HET LAND (VEROVERD GEBIED) ---
        ctx.save();
        ctx.fillStyle = this.color;
        
        // SCHADUW EFFECT (Zoals op je screenshot bij het blauwe vlak)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 4; // Dit geeft dat 3D randje onderaan

        ctx.beginPath();
        // We tekenen hier alleen het land dat BUITEN de start-cirkel valt
        // Anders krijgen we lelijke randjes bij de cirkel.
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radiusSq = (this.baseRadius - 2) * (this.baseRadius - 2); // Klein beetje kleiner

        for (let x = 0; x < gridWidth; x++) {
             // Optimalisatie: Teken hele kolommen in één keer
            let startY = null;
            for (let y = 0; y < gridHeight; y++) {
                // Check: is dit land EN ligt het ver genoeg buiten het centrum?
                // We gebruiken simpele afstandsformule om te checken of we in de basis-cirkel zitten
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                const distSq = (px - centerX)**2 + (py - centerY)**2;
                
                const isBase = distSq < radiusSq;

                if (territory[x][y] === 1 && !isBase) {
                    if (startY === null) startY = y;
                } else {
                    if (startY !== null) {
                        ctx.rect(x * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE + 0.5, (y - startY) * TILE_SIZE + 0.5);
                        startY = null;
                    }
                }
            }
            if (startY !== null) {
                ctx.rect(x * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE + 0.5, (gridHeight - startY) * TILE_SIZE + 0.5);
            }
        }
        ctx.fill();
        ctx.restore();

        // --- 2. TEKEN DE BASIS (PERFECTE CIRKEL) ---
        // Dit is de fix voor de "pixels". We tekenen gewoon een vector cirkel eroverheen!
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 4;
        
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, this.baseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- 3. TEKEN DE TRAIL (LIJN) ---
        // Gebruikt dikke lijnen en 'round' joints voor smooth bochten
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color; // Zelfde kleur als land voor naadloze overgang
            ctx.globalAlpha = 0.6; // Iets doorzichtig zoals op screenshot
            ctx.lineWidth = this.size; // Even dik als de speler
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // --- 4. TEKEN DE SPELER (VIERKANT/DIAMANT) ---
        // Op je screenshot is de speler een ruitje (gedraaid vierkant)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle); // Draai mee met de richting
        ctx.fillStyle = "#ff2e43"; // Iets donkerder rood voor contrast
        
        // Teken schaduw
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        
        // Teken vierkant (gecentreerd)
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        // Reset
        ctx.restore();
        
        // Naam label (zoals "Henk" op je foto)
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.textAlign = "center";
        ctx.strokeText("Player", this.x, this.y - 20);
        ctx.fillText("Player", this.x, this.y - 20);
    }
}

const player = new Player();

// Input
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
    
    // Achtergrond kleur (zoals Paper.io lichtgroen/blauw)
    ctx.fillStyle = "#e0f7fa";
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // Raster lijntjes (heel licht)
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,canvas.height);ctx.stroke();}
    for(let i=0; i<canvas.height; i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(canvas.width,i);ctx.stroke();}

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
