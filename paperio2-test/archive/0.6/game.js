const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
let lastInputMethod = 'mouse'; // 'mouse' of 'keyboard'
const keys = {};

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
        this.size = 12;
        this.color = '#ff4757';
        this.speed = 4;
        this.angle = 0; 
        this.turnSpeed = 0.06; // Iets verlaagd voor soepelere bochten
        this.trail = [];
    }

    update() {
        if (!gameRunning) return;

        // --- STURING ---
        
        if (lastInputMethod === 'keyboard') {
            // Volledige controle voor toetsenbord
            if (keys['a'] || keys['arrowleft']) {
                this.angle -= this.turnSpeed;
            }
            if (keys['d'] || keys['arrowright']) {
                this.angle += this.turnSpeed;
            }
        } else {
            // Volledige controle voor muis
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

            // Alleen draaien als de muis niet bovenop de speler staat (deadzone)
            if (distanceToMouse > 30) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;

                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                // Draai soepel naar de muis toe
                this.angle += angleDiff * 0.1;
            }
        }

        // --- BEWEGING ---
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Trail bijhouden (we slaan elke stap op)
        this.trail.push({ x: this.x, y: this.y });

        // Schermgrenzen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        // Teken Trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // Teken Speler
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Richting-indicator (oogje)
        ctx.fillStyle = "white";
        const eyeX = this.x + Math.cos(this.angle) * 6;
        const eyeY = this.y + Math.sin(this.angle) * 6;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

const player = new Player();

// --- EVENT LISTENERS ---

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    // Schakel over naar toetsenbord modus
    if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) {
        lastInputMethod = 'keyboard';
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    // Zodra de muis significant beweegt, pakken we die sturing weer op
    lastInputMethod = 'mouse';
});

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
    player.reset();
});

function drawGrid() {
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    const step = 50;
    for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function loop() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    player.update();
    player.draw();

    requestAnimationFrame(loop);
}

loop();
