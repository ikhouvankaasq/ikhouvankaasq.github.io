// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;

// Resize canvas to fit screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 20;
        this.color = '#ff4757';
        this.speed = 4;
        this.dx = this.speed; // Current horizontal velocity
        this.dy = 0;          // Current vertical velocity
        this.trail = [];
    }

    update() {
        if (!gameRunning) return;

        // Save trail
        this.trail.push({ x: this.x + this.size/2, y: this.y + this.size/2 });

        // Move
        this.x += this.dx;
        this.y += this.dy;

        // Screen wrap or boundary check
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        // Draw Trail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        this.trail.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw Player
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.shadowBlur = 0;
    }
}

const player = new Player();

// Input Handling
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Prevent 180-degree turns (can't go left if moving right)
    if ((key === 'w' || key === 'arrowup') && player.dy === 0) {
        player.dx = 0; player.dy = -player.speed;
    }
    if ((key === 's' || key === 'arrowdown') && player.dy === 0) {
        player.dx = 0; player.dy = player.speed;
    }
    if ((key === 'a' || key === 'arrowleft') && player.dx === 0) {
        player.dx = -player.speed; player.dy = 0;
    }
    if ((key === 'd' || key === 'arrowright') && player.dx === 0) {
        player.dx = player.speed; player.dy = 0;
    }
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    drawGrid();

    player.update();
    player.draw();

    requestAnimationFrame(loop);
}

function drawGrid() {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
});

loop();
