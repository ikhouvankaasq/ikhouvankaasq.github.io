const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');

let gameRunning = false;
let mousePos = { x: 0, y: 0 };

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
        this.size = 15;
        this.color = '#ff4757';
        this.speed = 4;
        this.angle = 0; // In radialen
        this.turnSpeed = 0.08; // Hoe snel je draait met toetsen
        this.trail = [];
    }

    update() {
        if (!gameRunning) return;

        // 1. Draai richting muis (optioneel, overschrijft toetsen als de muis beweegt)
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - this.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Zachte overgang naar muis-hoek (voor vloeiende beweging)
        let angleDiff = targetAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        this.angle += angleDiff * 0.1;

        // 2. Beweeg vooruit op basis van de huidige hoek
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // 3. Trail bijhouden
        this.trail.push({ x: this.x, y: this.y });

        // Grenzen van het scherm
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        // Teken Trail
        if (this.trail.length > 0) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 12;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }

        // Teken Speler (Cirkel voor "vrije" look)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const player = new Player();

// --- INPUTS ---

// Toetsenbord voor handmatig sturen (links/rechts draaien)
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Muis beweging bijhouden
window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
});

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    gameRunning = true;
    player.reset();
});

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Achtergrond grid
    ctx.strokeStyle = '#eee';
    for(let i=0; i<canvas.width; i+=50) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=50) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    if (gameRunning) {
        // Handmatige besturing met toetsen overschrijft de muis-volging een beetje
        if (keys['a'] || keys['arrowleft']) player.angle -= player.turnSpeed;
        if (keys['d'] || keys['arrowright']) player.angle += player.turnSpeed;
        
        player.update();
    }
    player.draw();

    requestAnimationFrame(loop);
}

loop();
