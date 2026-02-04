// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

class Player {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speed = 3;
        this.angle = 0; // Direction in radians
        this.trail = []; // Array of {x, y} points
        this.territory = []; // Your captured polygon
        this.isOutside = true;
    }

    update() {
        // Move based on current angle
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
    }

    draw() {
        // 1. Draw Territory
        ctx.fillStyle = this.color + "55"; // Semi-transparent
        ctx.beginPath();
        // Drawing logic for polygon...
        ctx.fill();

        // 2. Draw Trail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        this.trail.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // 3. Draw Player Head
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
    }
}

const player = new Player(100, 100, '#ff4757');

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    player.update();
    player.draw();

    requestAnimationFrame(gameLoop);
}

// Simple Control: Use Arrow Keys or Mouse to change angle
window.addEventListener('mousemove', (e) => {
    const dx = e.clientX - player.x;
    const dy = e.clientY - player.y;
    player.angle = Math.atan2(dy, dx);
});

gameLoop();
