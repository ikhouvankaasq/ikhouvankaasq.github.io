const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
const keys = {};

const TILE_SIZE = 10; // Iets groter voor stabiliteit
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
        this.size = 16; 
        this.color = '#ff4757'; 
        this.speed = 4.5;
        this.angle = 0;
        this.trail = []; 
        this.isOutside = false;
        
        resetGrid();

        // Startbasis markeren in grid
        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);
        for (let i = -6; i <= 6; i++) {
            for (let j = -6; j <= 6; j++) {
                if (Math.sqrt(i*i + j*j) <= 6) this.setTile(gx + i, gy + j, 1);
            }
        }
    }

    setTile(gx, gy, val) {
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) territory[gx][gy] = val;
    }

    update() {
        if (!gameRunning) return;

        // Mouse follow logic
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - this.y;
        if (Math.sqrt(dx*dx + dy*dy) > 10) {
            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.15;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        const gx = Math.floor(this.x / TILE_SIZE);
        const gy = Math.floor(this.y / TILE_SIZE);

        if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return this.die();

        if (territory[gx][gy] === 0) {
            this.isOutside = true;
            this.trail.push({ x: this.x, y: this.y, gx, gy });
            
            // Self-collision
            if (this.trail.length > 20) {
                for (let i = 0; i < this.trail.length - 15; i++) {
                    if (Math.hypot(this.x - this.trail[i].x, this.y - this.trail[i].y) < 8) return this.die();
                }
            }
        } else if (territory[gx][gy] === 1 && this.isOutside) {
            this.capture();
        }
    }

    capture() {
        // Trail omzetten naar territorium
        this.trail.forEach(p => {
            for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) this.setTile(p.gx+i, p.gy+j, 1);
        });

        // Binnenkant vullen met flood fill
        let check = Array(gridWidth).fill().map(() => Array(gridHeight).fill(false));
        let queue = [[0,0]];
        check[0][0] = true;

        while(queue.length > 0) {
            let [x, y] = queue.shift();
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
                let nx = x+dx, ny = y+dy;
                if(nx>=0 && nx<gridWidth && ny>=0 && ny<gridHeight && !check[nx][ny] && territory[nx][ny]===0) {
                    check[nx][ny] = true;
                    queue.push([nx, ny]);
                }
            });
        }

        for(let x=0; x<gridWidth; x++) {
            for(let y=0; y<gridHeight; y++) {
                if(!check[x][y]) territory[x][y] = 1;
            }
        }

        this.isOutside = false;
        this.trail = [];
    }

    draw() {
        // --- DE ULTIEME SMOOTH LAND TEKENMETHODE ---
        ctx.save();
        ctx.fillStyle = this.color;
        
        // Gebruik een schaduw voor het 3D effect van de foto
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowOffsetY = 5;

        // We tekenen nu het land door alle grid-tiles die '1' zijn te combineren
        // De 'magic' is om de tiles iets te laten overlappen zodat er NOOIT kieren zijn.
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                if (territory[x][y] === 1) {
                    // Teken tiles met 1 pixel overlap om kieren te voorkomen
                    ctx.fillRect(x * TILE_SIZE - 0.5, y * TILE_SIZE - 0.5, TILE_SIZE + 1, TILE_SIZE + 1);
                }
            }
        }
        ctx.restore();

        // Trail tekenen (vloeiende lijn)
        if (this.trail.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            this.trail.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Speler (Het ruitje/vierkantje)
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
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.strokeText("Henk", this.x, this.y - 25);
        ctx.fillText("Henk", this.x, this.y - 25);
    }

    die() {
        gameRunning = false;
        overlay.style.display = 'flex';
        this.reset();
    }
}

const player = new Player();

window.addEventListener('mousemove', (e) => { mousePos.x = e.clientX; mousePos.y = e.clientY; });
startBtn.addEventListener('click', () => { overlay.style.display = 'none'; gameRunning = true; });

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f0f9ff"; 
    ctx.fillRect(0,0, canvas.width, canvas.height);
    
    // Grid lijntjes op achtergrond
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    player.update();
    player.draw();
    requestAnimationFrame(loop);
}
loop();
