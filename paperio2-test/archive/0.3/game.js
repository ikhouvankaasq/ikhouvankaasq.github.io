const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
        this.size = 20;
        this.color = '#ff4757';
        this.speed = 4;
        this.dx = this.speed; // Starts moving Right
        this.dy = 0;
        this.trail = [];
    }

    update() {
        if (!gameRunning) return;

        // Add trail point
        this.trail.push({ x: this.x + this.size/2, y: this.y + this.size/2 });

        this.x += this.dx;
        this.y += this.dy;

        // Simple Wall Bounce (until we add death logic)
        if (this.x < 0 || this.x > canvas.width - this.size) this.dx *= -1;
        if (this.y < 0 || this.y > canvas.height - this.size) this.dy *= -1;
    }

    draw() {
        // Draw Trail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        this.trail.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw Player Head
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

const player = new Player();

// --- THE FIXES ---

// 1. Improved Key Listener
window.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    const key = e.key; // Case sensitive check is safer
    
    // Up: W or ArrowUp
    if ((key === 'w' || key === 'W' || key === 'ArrowUp') && player.dy === 0) {
        player.dx = 0; player.dy = -player.speed;
    }
    // Down: S or ArrowDown
    if ((key === 's' || key === 'S' || key === 'ArrowDown') && player.dy === 0) {
        player.dx = 0; player.dy = player.speed;
    }
    // Left: A or ArrowLeft
    if ((key === 'a' || key === 'A' || key === 'ArrowLeft') && player.dx === 0) {
        player.dx = -player.speed; player.dy = 0;
    }
    // Right: D or ArrowRight
    if ((key === 'd' || key === 'D' || key === 'ArrowRight') && player.dx === 0) {
        player.dx = player.speed; player.dy = 0;
    }
});

// 2. Start Button Fix
startBtn.addEventListener('click', () => {
    console.log("Game Starting...");
    overlay.style.display = 'none'; // Hides the menu
    gameRunning = true;
    player.reset(); // Positions player in center
});

function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    
    if (gameRunning) {
        player.update();
    }
    player.draw();

    requestAnimationFrame(loop);
}

loop();
