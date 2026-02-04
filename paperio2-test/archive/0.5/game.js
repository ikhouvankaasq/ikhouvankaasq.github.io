const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };
const keys = {};

// 1. Schermvullend maken
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
        this.turnSpeed = 0.07; 
        this.trail = [];
    }

    update() {
        if (!gameRunning) return;

        // --- STURING LOGICA ---
        
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - this.y;
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

        // Check of er toetsen worden ingedrukt
        const isUsingKeys = keys['a'] || keys['d'] || keys['arrowleft'] || keys['arrowright'] || keys['w'] || keys['s'];

        // Alleen naar muis draaien als deze ver genoeg weg is EN we geen toetsen gebruiken
        // Als we toetsen gebruiken, krijgt de muis een hele lage prioriteit (lerp)
        if (distanceToMouse > 40) {
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - this.angle;

            // Zorg dat de hoekberekening soepel over de 360-graden grens gaat
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            // Als je toetsen gebruikt, negeren we de muis bijna volledig
            const lerpFactor = isUsingKeys ? 0.01 : 0.1;
            this.angle += angleDiff * lerpFactor;
        }

        // Handmatige besturing met A/D of Pijltjes
        if (keys['a'] || keys['arrowleft']) {
            this.angle -= this.turnSpeed;
        }
        if (keys['d'] || keys['arrowright']) {
            this.angle += this.turnSpeed;
        }

        // --- BEWEGING ---
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Trail opslaan
        this.trail.push({ x: this.x, y: this.y });

        // Simpele schermgrenzen (terugsturen naar het midden als je eruit gaat)
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.angle += Math.PI; // Draai om
        }
    }

    draw() {
        // Teken de lijn (Trail)
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

        // Teken de speler
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Oogje toevoegen zodat je ziet wat de voorkant is
        ctx.fillStyle = "white";
        const eyeX = this.x + Math.cos(this.angle) * 5;
        const eyeY = this.y + Math.sin(this.angle) * 5;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

const player = new Player();

// --- INPUT HANDLERS ---

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
});

// --- GAME STATE ---

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
    player.reset();
});

function drawGrid() {
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    const size = 50;
    for (let x = 0; x < canvas.width; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function loop() {
    // Canvas leegmaken
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();

    player.update();
    player.draw();

    requestAnimationFrame(loop);
}

loop();
