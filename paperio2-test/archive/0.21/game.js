Het probleem in je screenshot (witte lijnen door je land en gaten die niet vullen) komt doordat de **visuele weergave** en de **spel-logica** niet synchroon lopen.

In je oude code probeerde je een vector-vorm (het pad van je speler) op het canvas te tekenen en te vullen. Maar `ctx.fill()` vult alleen de vorm van het *pad* zelf, niet het grote gat (de "void") dat je zojuist hebt omsingeld. Daardoor bleven de binnenkanten leeg en kreeg je overlap-fouten (de witte lijnen).

**De Oplossing:**
We moeten de weergave baseren op de `territory` grid. Dit grid "weet" namelijk precies welke blokjes van jou zijn (ook de omsingelde gaten dankzij je Flood Fill algoritme).

Ik heb de `capture()` functie aangepast zodat hij na het veroveren het hele land-canvas opnieuw tekent op basis van het grid. Dit zorgt voor een solide, kloppend stuk land zonder glitches.

Hier is de volledig gecorrigeerde `game.js`:

```javascript
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

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gridWidth = Math.ceil(canvas.width / TILE_SIZE);
    gridHeight = Math.ceil(canvas.height / TILE_SIZE);
    // Als we resizen tijdens het spel, resetten we het grid liever niet hard om progressie te houden,
    // maar voor nu is een reset veiliger om crashes te voorkomen.
    if(gameRunning) resetGrid(); 
}

function resetGrid() {
    territory = Array(gridWidth).fill().map(() => Array(gridHeight).fill(0));
}

window.addEventListener('resize', resize);
resize();

class Player {
    constructor() {
        // Dit canvas houdt de 'vaste' vorm van je land bij
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
        
        // Canvas grootte matcht scherm
        this.landCanvas.width = canvas.width;
        this.landCanvas.height = canvas.height;
        
        resetGrid();

        // 1. Vul het LOGISCHE grid (de array) met een start cirkel
        const startGX = Math.floor(this.x / TILE_SIZE);
        const startGY = Math.floor(this.y / TILE_SIZE);
        const radiusInTiles = 8; // Ongeveer 64px radius

        for (let x = -radiusInTiles; x <= radiusInTiles; x++) {
            for (let y = -radiusInTiles; y <= radiusInTiles; y++) {
                // Simpele cirkel formule
                if (Math.sqrt(x*x + y*y) <= radiusInTiles) {
                    this.setTerritory(startGX + x, startGY + y, 1);
                }
            }
        }

        // 2. Teken nu het VISUELE land op basis van dat grid
        this.redrawLand();
    }

    setTerritory(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
            territory[gx][gy] = val;
        }
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
        
        // Buiten speelveld = dood
        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        // Logica voor trail en territory
        if (territory[gx][gy] === 0) {
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx: gx, gy: gy });
            
            // Check self-hit (staart botsing)
            if (this.trail.length > 20) {
                // Checken tegen oudere punten van de trail
                for (let i = 0; i < this.trail.length - 15; i++) {
                    const t = this.trail[i];
                    const dist = Math.hypot(this.x - t.x, this.y - t.y);
                    if (dist < 8) return this.die();
                }
            }
        } else if (territory[gx][gy] === 1 && this.isOutside) {
            // We zijn terug op eigen land: Capture!
            this.capture();
            this.isOutside = false;
            this.trail = [];
        }
    }

    capture() {
        // 1. Zet de trail om in territory (logica)
        this.trail.forEach(t => {
            // We maken de trail iets dikker in het grid om gaten te voorkomen
            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    this.setTerritory(t.gx+i, t.gy+j, 1);
                }
            }
        });

        // 2. Vul de gaten (Flood Fill algoritme)
        this.fillGridLogic();

        // 3. FIX: Teken het land opnieuw op basis van het bijgewerkte grid
        // Dit lost de witte lijnen en de lege gaten op.
        this.redrawLand();
    }

    fillGridLogic() {
        // Flood fill om te bepalen wat "buiten" is. Alles wat niet bereikbaar is vanaf (0,0) is veroverd.
        // We maken een tijdelijk grid om te checken wat 'buiten' is.
        let visited = new Uint8Array(gridWidth * gridHeight); // 0 = unvisited, 1 = visited
        
        // Stack voor flood fill (sneller dan recursie)
        let stack = [0]; // Begin bij index 0 (linksboven, x=0, y=0)
        visited[0] = 1;

        while (stack.length > 0) {
            let index = stack.pop();
            let x = index % gridWidth;
            let y = Math.floor(index / gridWidth);

            const neighbors = [
                {nx: x+1, ny: y}, {nx: x-1, ny: y},
                {nx: x, ny: y+1}, {nx: x, ny: y-1}
            ];

            for (let n of neighbors) {
                if (n.nx >= 0 && n.nx < gridWidth && n.ny >= 0 && n.ny < gridHeight) {
                    let nIndex = n.ny * gridWidth + n.nx;
                    // Als het geen territory is en nog niet bezocht
                    if (territory[n.nx][n.ny] === 0 && visited[nIndex] === 0) {
                        visited[nIndex] = 1;
                        stack.push(nIndex);
                    }
                }
            }
        }

        // Alles wat NIET bezocht is door de flood fill vanaf de rand, is nu territory.
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
        // Wis het canvas
        this.landCtx.clearRect(0, 0, this.landCanvas.width, this.landCanvas.height);
        this.landCtx.fillStyle = this.color;

        // Teken elk blokje dat '1' is in het grid
        // Tip: We tekenen blokjes iets groter (TILE_SIZE + 0.5) om haarfijne lijntjes (aliasing) te voorkomen.
        this.landCtx.beginPath();
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    this.landCtx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE + 0.6, TILE_SIZE + 0.6);
                }
            }
        }
        this.landCtx.fill();
    }

    draw() {
        // Teken land met schaduw
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowOffsetY = 5;
        ctx.drawImage(this.landCanvas, 0, 0);
        ctx.restore();

        // Teken trail (alleen als je buiten bent)
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.5; // Trail is iets doorzichtig
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let p of this.trail) ctx.lineTo(p.x, p.y);
            // Verbind de trail met de speler voor vloeiendheid
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Teken speler (Vierkant zoals screenshot)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#ff2e43"; // Iets donkerder rood voor contrast
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();

        // Naam
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeText("Henk", this.x, this.y - 25);
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
        // Geef even tijd voordat we resetten of laat scherm staan
    }
}

const player = new Player();

// Input handlers
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', (e) => { 
    mousePos.x = e.clientX; 
    mousePos.y = e.clientY; 
    lastInputMethod = 'mouse'; 
});

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    player.reset(); // Reset bij start
    gameRunning = true;
});

function loop() {
    // Achtergrond wissen en tekenen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f0f9ff"; 
    ctx.fillRect(0,0, canvas.width, canvas.height);
    
    // Raster tekenen (achtergrond papier effect)
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
```
