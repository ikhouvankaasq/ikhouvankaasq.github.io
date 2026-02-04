const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse';
const keys = {};

const TILE_SIZE = 8; 
let gridWidth, gridHeight, territory; 

// Functie om alles klaar te zetten qua afmetingen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);
    
    // Als we resizen, moeten we het grid opnieuw initialiseren om crashes te voorkomen
    resetGrid();
    if (gameRunning && typeof player !== 'undefined') {
        player.reset();
    }
}

// Maak het grid (de array) leeg en klaar voor gebruik
function resetGrid() {
    if (!gridWidth || !gridHeight) return;
    territory = new Array(gridWidth).fill(0).map(() => new Array(gridHeight).fill(0));
}

class Player {
    constructor() {
        // Dit canvas is een verborgen "buffer" waarop we het land tekenen
        this.landCanvas = document.createElement('canvas');
        this.landCtx = this.landCanvas.getContext('2d');
        
        // Initialiseer de speler, maar nog niet tekenen tot resize() klaar is
        this.x = 0;
        this.y = 0;
        this.reset();
    }

    reset() {
        // Startpositie in het midden
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 14; 
        this.color = '#ff4757'; 
        this.speed = 4;
        this.angle = 0;
        this.turnSpeed = 0.08;
        this.trail = []; 
        this.isOutside = false;
        
        // Zorg dat het buffer-canvas even groot is als het scherm
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        
        // Grid leegmaken
        resetGrid();

        // 1. Vul het LOGISCHE grid (de array) met een start cirkel
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const radiusInTiles = 8; 

        for (let x = -radiusInTiles; x <= radiusInTiles; x++) {
            for (let y = -radiusInTiles; y <= radiusInTiles; y++) {
                if (Math.sqrt(x*x + y*y) <= radiusInTiles) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // 2. Teken het land op basis van het grid (lost de visuele bugs op)
        this.redrawLand();
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            territory[gx][gy] = val;
        }
    }

    update() {
        if (!gameRunning) return;

        // Besturing (Keyboard of Muis)
        if (lastInputMethod === 'keyboard') {
            if (keys['a'] || keys['arrowleft']) this.angle -= this.turnSpeed;
            if (keys['d'] || keys['arrowright']) this.angle += this.turnSpeed;
        } else {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            if (Math.sqrt(dx*dx + dy*dy) > 20) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                // Zorg voor de kortste draairichting
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * 0.15;
            }
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);
        
        // Buiten het scherm = dood
        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        // Logica voor trail en territorium
        if (territory[gx][gy] === 0) {
            // Op vijandig terrein
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
            
            // Check of je je eigen staart raakt
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const t = this.trail[i];
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist < this.size / 2) return this.die();
                }
            }
        } else if (territory[gx][gy] === 1 && this.isOutside) {
            // Terug op eigen terrein: Veroveren!
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // 1. Zet de trail om in 'territory' in het grid
        this.trail.forEach(t => {
            // Iets dikker maken (3x3) om gaatjes te voorkomen
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    this.setTerritory(t.gx+i, t.gy+j, 1);
                }
            }
        });

        // 2. Vul de gaten (Flood Fill algoritme)
        this.fillGridLogic();

        // 3. Teken het hele land opnieuw (dit fixt de witte lijnen!)
        this.redrawLand();
    }

    fillGridLogic() {
        // We gebruiken Flood Fill vanaf (0,0) om te kijken wat 'buiten' is.
        // Alles wat niet bereikt wordt, hoort bij de speler (is omsingeld).
        
        let visited = new Uint8Array(gridWidth * gridHeight); // 0=niet bezocht, 1=bezocht
        let stack = [0]; // Begin linksboven
        visited[0] = 1;

        while (stack.length > 0) {
            let index = stack.pop();
            let x = index % gridWidth;
            let y = Math.floor(index / gridWidth);

            // Check 4 buren
            const neighbors = [
                {nx: x+1, ny: y}, {nx: x-1, ny: y},
                {nx: x, ny: y+1}, {nx: x, ny: y-1}
            ];

            for (let n of neighbors) {
                if (n.nx >= 0 && n.nx < gridWidth && n.ny >= 0 && n.ny < gridHeight) {
                    let nIndex = n.ny * gridWidth + n.nx;
                    // Als het geen territorium is en nog niet bezocht
                    if (territory[n.nx][n.ny] === 0 && visited[nIndex] === 0) {
                        visited[nIndex] = 1;
                        stack.push(nIndex);
                    }
                }
            }
        }

        // Alles wat NIET bezocht is door de flood fill, is nu van de speler
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                let index = y * gridWidth + x;
                if (visited[index] === 0) {
                    territory[x][y] = 1;
                }
            }
        }
    }

    redrawLand() {
        // Wis het buffer canvas
        this.landCtx.clearRect(0, 0, this.landCanvas.width, this.landCanvas.height);
        this.landCtx.fillStyle = this.color;
        
        // Teken alle blokjes die '1' zijn in het grid
        this.landCtx.beginPath();
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    // +0.6 zorgt voor overlap zodat je geen lijntjes ziet tussen blokjes
                    this.landCtx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE + 0.6, TILE_SIZE + 0.6);
                }
            }
        }
        this.landCtx.fill();
    }

    draw() {
        // Teken het opgeslagen land canvas
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowOffsetY = 5;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // Teken de trail als je buiten bent
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) ctx.lineTo(p.x, p.y);
            ctx.lineTo(this.x, this.y); // Verbind met speler
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Teken de speler (rode blokje)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#ff2e43";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();

        // Naam label
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 3;
        ctx.strokeText("Henk", this.x, this.y - 25);
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
    }
}

// 1. Eerst resizen en grid aanmaken
window.addEventListener('resize', resize);
resize(); 

// 2. Dan pas de speler aanmaken (nu bestaat het grid zeker)
const player = new Player();

// Input handlers
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
    overlay.style.display = 'none';
    player.reset();
    gameRunning = true;
});

function loop() {
    // Scherm wissen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Achtergrond
    ctx.fillStyle = "#f0f9ff"; 
    ctx.fillRect(0,0, canvas.width, canvas.height);
    
    // Grid lijntjes achtergrond
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); }
    for(let i=0; i<canvas.height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); }
    ctx.stroke();

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
