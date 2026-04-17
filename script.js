// ===== PARTICLE CANVAS =====
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5, a: Math.random()
}));

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,247,255,${p.a * 0.5})`;
        ctx.fill();
    });
    requestAnimationFrame(drawParticles);
}
drawParticles();

// ===== EEG WAVE (MAIN) =====
let waveOffset = 0;
function drawEEGWave() {
    const svg = document.getElementById('eegLine');
    const svg2 = document.getElementById('eegLine2');
    const W = 600, H = 80;
    let pts = '', pts2 = '';
    for (let x = 0; x <= W; x += 4) {
        const t = (x + waveOffset) / 30;
        const y = H / 2 + Math.sin(t) * 12 + Math.sin(t * 2.3) * 6 + Math.sin(t * 5.1) * 3 + (Math.random() - 0.5) * 2;
        const y2 = H / 2 + Math.sin(t * 1.4 + 1) * 10 + Math.sin(t * 3.1) * 4;
        pts += `${x},${y.toFixed(1)} `;
        pts2 += `${x},${y2.toFixed(1)} `;
    }
    svg.setAttribute('points', pts);
    svg2.setAttribute('points', pts2);
    waveOffset += 3;
}
setInterval(drawEEGWave, 40);

// ===== LIVE DIRECTION WAVE =====
let dirWaveOffset = 0;
function drawDirWave() {
    const c = document.getElementById('dirWaveCanvas');
    if (!c) return;
    const dx = c.getContext('2d');
    const W = c.width, H = c.height;
    dx.clearRect(0, 0, W, H);
    dx.strokeStyle = '#00f7ff';
    dx.lineWidth = 1.5;
    dx.shadowColor = '#00f7ff';
    dx.shadowBlur = 4;
    dx.beginPath();
    for (let x = 0; x <= W; x += 3) {
        const t = (x + dirWaveOffset) / 25;
        const y = H / 2 + Math.sin(t) * 10 + Math.sin(t * 2.7) * 5 + (Math.random() - 0.5) * 1.5;
        x === 0 ? dx.moveTo(x, y) : dx.lineTo(x, y);
    }
    dx.stroke();
    dirWaveOffset += 4;
}

// ===== BRAINFLOW API CONFIG =====
const BRAINFLOW_API = 'http://localhost:8765';   // 👈 change if hosted elsewhere
const BRAINFLOW_WS = 'ws://localhost:8765/stream';

let brainflowSocket = null;
let useRealAPI = true;  // set false to run in demo/simulation mode

// ===== CALIBRATION STATE =====
const calibSteps = [
    { label: 'THINK RIGHT', emoji: '➡️', text: 'Think RIGHT' },
    { label: 'THINK LEFT', emoji: '⬅️', text: 'Think LEFT' },
    { label: 'THINK FORWARD', emoji: '⬆️', text: 'Think FORWARD' },
    { label: 'THINK STOP', emoji: '🛑', text: 'Think STOP' }
];

let calibTimer = null;
let stepTimer = null;
let currentStep = 0;
let stepElapsed = 0;
const STEP_DURATION = 10000; // 10s
const STEP_INTERVAL = 100;   // 100ms ticks

function openCalibrateWindow() {
    document.getElementById('calibrateWindow').classList.remove('hidden');
    document.getElementById('calibStartScreen').classList.remove('hidden');
    document.getElementById('calibActiveScreen').classList.add('hidden');
    document.getElementById('calibDoneModal').classList.add('hidden');
    resetCalibState();
}

function closeCalibrate() {
    clearAllTimers();
    document.getElementById('calibrateWindow').classList.add('hidden');
}

function resetCalibState() {
    currentStep = 0; stepElapsed = 0;
    document.getElementById('overallBar').style.width = '0%';
    document.getElementById('overallPct').textContent = '0%';
    document.getElementById('stepBar').style.width = '0%';
    document.getElementById('stepTime').textContent = '10s';
    for (let i = 1; i <= 4; i++) {
        const ic = document.getElementById('sci' + i);
        const sc = document.getElementById('sc' + i);
        ic.className = 'sc-icon pending';
        ic.textContent = i;
        sc.classList.remove('done', 'active');
    }
}

function clearAllTimers() {
    if (calibTimer) { clearInterval(calibTimer); calibTimer = null; }
}

function startCalibration() {
    document.getElementById('calibStartScreen').classList.add('hidden');
    document.getElementById('calibActiveScreen').classList.remove('hidden');
    currentStep = 0;
    runCalibStep();
}

// ---- 3-second countdown before each step ----
const FULL_DASH = 276.46; // 2 * PI * 44 (SVG circle circumference)

function showCountdown(stepLabel, onDone) {
    const overlay = document.getElementById('countdownOverlay');
    const numEl = document.getElementById('countdownNumber');
    const actionEl = document.getElementById('countdownAction');
    const circle = document.getElementById('countdownCircle');

    actionEl.textContent = stepLabel;
    overlay.classList.remove('hidden');

    let count = 3;

    function tick() {
        // Animate number pop by forcing reflow
        numEl.style.animation = 'none';
        void numEl.offsetWidth; // reflow
        numEl.style.animation = 'numPop 0.9s cubic-bezier(.22,.68,0,1.2) both';
        numEl.textContent = count;

        // Drain the ring over 1 second (from full → next fraction)
        circle.style.transition = 'none';
        circle.style.strokeDashoffset = '0';
        void circle.offsetWidth; // reflow
        circle.style.transition = 'stroke-dashoffset 0.95s linear';
        circle.style.strokeDashoffset = FULL_DASH.toString();

        count--;
        if (count >= 1) {
            setTimeout(tick, 1000);
        } else {
            // Last second draining — after it finishes, hide and proceed
            setTimeout(() => {
                overlay.classList.add('hidden');
                // Reset ring for next use
                circle.style.transition = 'none';
                circle.style.strokeDashoffset = '0';
                onDone();
            }, 1000);
        }
    }

    tick();
}

function runCalibStep() {
    if (currentStep >= 4) { showCalibDone(); return; }
    const step = calibSteps[currentStep];

    // Update brain viz & labels immediately (visible behind overlay)
    document.getElementById('brainEmoji').textContent = step.emoji;
    document.getElementById('brainPulseText').textContent = step.label;
    document.getElementById('stepLabel').textContent = `STEP ${currentStep + 1} — ${step.label}`;
    document.getElementById('stepBar').style.width = '0%';
    document.getElementById('stepTime').textContent = '10s';

    // Mark checklist
    for (let i = 0; i < 4; i++) {
        const ic = document.getElementById('sci' + (i + 1));
        const sc = document.getElementById('sc' + (i + 1));
        if (i < currentStep) {
            ic.className = 'sc-icon done-ic'; ic.textContent = '✓'; sc.classList.add('done'); sc.classList.remove('active');
        } else if (i === currentStep) {
            ic.className = 'sc-icon active-ic'; ic.textContent = i + 1; sc.classList.add('active'); sc.classList.remove('done');
        } else {
            ic.className = 'sc-icon pending'; ic.textContent = i + 1; sc.classList.remove('done', 'active');
        }
    }

    // Show 3-second countdown, then start loading bar
    showCountdown(step.label, async () => {
        stepElapsed = 0;
        clearAllTimers();

        // 🔌 Tell BrainFlow backend this step is starting (record EEG)
        if (useRealAPI) {
            try {
                await fetch(`${BRAINFLOW_API}/calibrate/start/${currentStep}`, { method: 'POST' });
            } catch (e) { console.warn('BrainFlow API not reachable — running in demo mode'); useRealAPI = false; }
        }

        calibTimer = setInterval(async () => {
            stepElapsed += STEP_INTERVAL;
            const pct = Math.min((stepElapsed / STEP_DURATION) * 100, 100);
            document.getElementById('stepBar').style.width = pct + '%';
            const rem = Math.max(0, Math.ceil((STEP_DURATION - stepElapsed) / 1000));
            document.getElementById('stepTime').textContent = rem + 's';

            if (stepElapsed >= STEP_DURATION) {
                clearAllTimers();

                // 🔌 Tell BrainFlow backend this step ended (save EEG features)
                if (useRealAPI) {
                    try {
                        await fetch(`${BRAINFLOW_API}/calibrate/end/${currentStep}`, { method: 'POST' });
                    } catch (e) { console.warn('Calibrate end error:', e); }
                }

                // Mark this step done in checklist
                const doneIdx = currentStep + 1;
                const ic = document.getElementById('sci' + doneIdx);
                const sc = document.getElementById('sc' + doneIdx);
                ic.className = 'sc-icon done-ic'; ic.textContent = '✓';
                sc.classList.add('done'); sc.classList.remove('active');

                // Advance overall bar by 25%
                const overallPct = ((currentStep + 1) / 4) * 100;
                document.getElementById('overallBar').style.width = overallPct + '%';
                document.getElementById('overallPct').textContent = Math.round(overallPct) + '%';

                currentStep++;
                setTimeout(runCalibStep, 500);
            }
        }, STEP_INTERVAL);
    });
}

async function showCalibDone() {
    // 🔌 Notify backend all 4 steps done — finalize classifier
    if (useRealAPI) {
        try {
            await fetch(`${BRAINFLOW_API}/calibrate/finish`, { method: 'POST' });
        } catch (e) { console.warn('Calibrate finish error:', e); }
    }
    document.getElementById('calibDoneModal').classList.remove('hidden');
}

function onCalibDone() {
    closeCalibrate();
    openDirectionWindow();
}

// ===== DIRECTION WINDOW =====
const dirConfigs = [
    { emoji: '➡️', phrase: 'MOVING RIGHT', sub: 'Neural signal acquired · Executing command', active: 'di-right', obstacle: false },
    { emoji: '⬅️', phrase: 'MOVING LEFT', sub: 'Neural signal acquired · Executing command', active: 'di-left', obstacle: false },
    { emoji: '⬆️', phrase: 'MOVING STRAIGHT', sub: 'Neural signal acquired · Executing command', active: 'di-forward', obstacle: false },
    { emoji: '🛑', phrase: 'STOP', sub: 'Command received · Halting movement', active: 'di-stop', obstacle: false },
    { emoji: '⚠️', phrase: 'OBSTACLE DETECTED', sub: 'Auto-avoidance engaged · Redirecting path', active: null, obstacle: true }
];

let dirInterval = null;
let dirWaveInterval = null;
let confInterval = null;

function openStartWindow() {
    openDirectionWindow();
}

function openDirectionWindow() {
    document.getElementById('directionWindow').classList.remove('hidden');
    setDirection(dirConfigs[0]);
    dirWaveInterval = setInterval(drawDirWave, 40);

    if (useRealAPI) {
        connectBrainFlowWS();   // 🔌 real EEG stream
    } else {
        startDirectionSimulation(); // fallback demo
        animateConfidence();
    }
}

function closeDirection() {
    if (brainflowSocket) { brainflowSocket.close(); brainflowSocket = null; }
    clearInterval(dirInterval);
    clearInterval(dirWaveInterval);
    clearInterval(confInterval);
    document.getElementById('directionWindow').classList.add('hidden');
}

// ===== BRAINFLOW WEBSOCKET =====
function connectBrainFlowWS() {
    if (brainflowSocket) brainflowSocket.close();

    brainflowSocket = new WebSocket(BRAINFLOW_WS);

    brainflowSocket.onopen = () => {
        console.log('✅ BrainFlow WebSocket connected');
        updateConnectionBadge(true);
    };

    brainflowSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'direction') {
            // Map string to dirConfigs entry
            const map = {
                right: dirConfigs[0],
                left: dirConfigs[1],
                forward: dirConfigs[2],
                stop: dirConfigs[3],
                obstacle: dirConfigs[4]
            };
            if (data.obstacle) {
                setDirection(dirConfigs[4]);
            } else if (map[data.value]) {
                setDirection(map[data.value]);
            }
            // Update confidence from real signal
            if (data.confidence !== undefined) {
                document.getElementById('confBar').style.width = data.confidence + '%';
                document.getElementById('confPct').textContent = data.confidence + '%';
            }
        }
    };

    brainflowSocket.onclose = () => {
        console.warn('BrainFlow WS closed — retrying in 2s...');
        updateConnectionBadge(false);
        setTimeout(connectBrainFlowWS, 2000); // auto-reconnect
    };

    brainflowSocket.onerror = () => {
        console.warn('BrainFlow WS error — falling back to demo mode');
        useRealAPI = false;
        updateConnectionBadge(false);
        startDirectionSimulation();
        animateConfidence();
    };
}

function updateConnectionBadge(connected) {
    const badge = document.querySelector('.status-badge');
    const dot = document.querySelector('.status-dot');
    if (connected) {
        badge.style.borderColor = 'rgba(0,255,136,0.4)';
        badge.style.color = '#00ff88';
        badge.innerHTML = '<span class="status-dot"></span> BRAINFLOW LIVE';
        dot.style.background = '#00ff88';
    } else {
        badge.style.borderColor = 'rgba(255,60,0,0.4)';
        badge.style.color = '#ff6b00';
        badge.innerHTML = '<span class="status-dot" style="background:#ff6b00"></span> RECONNECTING...';
    }
}

// Demo simulation fallback
let dirIndex = 0;
function startDirectionSimulation() {
    clearInterval(dirInterval);
    dirIndex = 0;
    dirInterval = setInterval(() => {
        dirIndex = (dirIndex + 1) % dirConfigs.length;
        setDirection(dirConfigs[dirIndex]);
    }, 3000);
}

function setDirection(cfg) {
    document.getElementById('dirArrow').textContent = cfg.emoji;
    document.getElementById('cmdPhrase').textContent = cfg.phrase;
    document.getElementById('cmdSub').textContent = cfg.sub;

    // Reset all indicators
    ['di-right', 'di-left', 'di-forward', 'di-stop'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('active', 'active-stop', 'obstacle-ind');
    });

    const obs = document.getElementById('obstacleOverlay');
    if (cfg.obstacle) {
        obs.classList.remove('hidden');
        document.getElementById('cmdPhrase').style.color = '#ff6b00';
        document.getElementById('cmdPhrase').style.textShadow = '0 0 30px #ff6b00';
    } else {
        obs.classList.add('hidden');
        document.getElementById('cmdPhrase').style.color = '';
        document.getElementById('cmdPhrase').style.textShadow = '';
        if (cfg.active) {
            const el = document.getElementById(cfg.active);
            if (cfg.active === 'di-stop') {
                el.classList.add('active-stop');
            } else {
                el.classList.add('active');
            }
        }
    }
}

function animateConfidence() {
    clearInterval(confInterval);
    confInterval = setInterval(() => {
        const pct = 75 + Math.floor(Math.random() * 22);
        document.getElementById('confBar').style.width = pct + '%';
        document.getElementById('confPct').textContent = pct + '%';
    }, 1500);
}

// ===== STAT ANIMATIONS =====
setInterval(() => {
    document.getElementById('statSignal').textContent = (88 + Math.floor(Math.random() * 10)) + '%';
    document.getElementById('statBattery').textContent = '87%';
    document.getElementById('statLatency').textContent = (10 + Math.floor(Math.random() * 6)) + 'ms';
}, 2000);

async function toggleSystemMode(mode) {
    try {
        const response = await fetch('http://127.0.0.1:5000/set_mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: mode })
        });
        
        // Update Button Visuals
        const simBtn = document.getElementById('modeSim');
        const hwBtn = document.getElementById('modeHw');
        
        if (mode === 1) { // Hardware Mode
            hwBtn.style.background = "#00f2ff"; hwBtn.style.color = "#000";
            simBtn.style.background = "#1a1a1a"; simBtn.style.color = "#00f2ff";
        } else { // Simulation Mode
            simBtn.style.background = "#00f2ff"; simBtn.style.color = "#000";
            hwBtn.style.background = "#1a1a1a"; hwBtn.style.color = "#00f2ff";
        }
        
        console.log("System source switched.");
    } catch (e) {
        console.error("Mode switch failed:", e);
    }
}