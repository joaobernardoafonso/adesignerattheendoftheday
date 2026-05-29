// ── FIREBASE ──────────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, orderBy, limit, query, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC05ECHjH6cDqY35LdcrguqvBpIiOU5ZnQ",
  authDomain:        "adesignerattheendof.firebaseapp.com",
  projectId:         "adesignerattheendof",
  storageBucket:     "adesignerattheendof.firebasestorage.app",
  messagingSenderId: "727131157816",
  appId:             "1:727131157816:web:a12e6b3dd81e535160bdcd",
  measurementId:     "G-X8P533G6FN"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── BUBBLE ────────────────────────────────────────────────────────────────────
const bubbleLayer = document.getElementById('bubble-layer');

// FIX: cap at 40 bubbles — remove oldest when limit exceeded
const MAX_BUBBLES = 40;

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeStr(date) {
  const d = date || new Date();
  const day  = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

function createBubble(text, date) {
  const vw = window.innerWidth;

  // FIX: use full document height instead of innerHeight so bubbles spread
  // across the whole page rather than collapsing when the soft keyboard is open
  const pageH = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    window.innerHeight
  );

  const startX = Math.random() * (vw - 320);
  const startY = Math.random() * (pageH - 200);
  const angle  = Math.random() * Math.PI * 2;
  const dist   = 120 + Math.random() * 180;
  const dx     = Math.cos(angle) * dist;
  const dy     = Math.sin(angle) * dist;
  const r0     = (Math.random() - 0.5) * 5;
  const r1     = r0 + (Math.random() - 0.5) * 6;
  const dur    = 16 + Math.random() * 20;

  // FIX: remove oldest bubble if at the cap
  const existing = bubbleLayer.querySelectorAll('.bubble');
  if (existing.length >= MAX_BUBBLES) {
    existing[existing.length - 1].remove();
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.cssText = `
    left: ${startX}px;
    top:  ${startY}px;
    --dx: ${dx}px;
    --dy: ${dy}px;
    --r0: ${r0}deg;
    --r1: ${r1}deg;
    animation-duration: ${dur}s;
  `;

  bubble.innerHTML = `
    <div class="bubble-inner">
      <div class="bubble-text">${escHtml(text)}</div>
      <div class="bubble-ts">${timeStr(date)}</div>
    </div>
  `;

  bubbleLayer.appendChild(bubble);
}

// ── ESCUTA MENSAGENS EM TEMPO REAL ────────────────────────────────────────────
// FIX: added limit(50) to cap initial load — prevents slowdown as entries grow
const q = query(
  collection(db, 'feelings'),
  orderBy('createdAt', 'desc'),
  limit(50)
);

onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      const date = data.createdAt ? data.createdAt.toDate() : new Date();
      const delay = Math.random() * 1200;
      setTimeout(() => createBubble(data.text, date), delay);
    }
  });
});

// ── ENVIAR MENSAGEM ───────────────────────────────────────────────────────────
async function launch() {
  const msgEl = document.getElementById('msg-input');
  const msg   = msgEl.value.trim();

  if (!msg) {
    msgEl.focus();
    msgEl.style.borderBottomColor = '#f87171';
    setTimeout(() => { msgEl.style.borderBottomColor = ''; }, 700);
    return;
  }

  await addDoc(collection(db, 'feelings'), {
    text:      msg,
    name:      'anonymous',
    createdAt: serverTimestamp()
  });

  msgEl.value = '';
  // FIX: reset textarea height after clearing
  msgEl.style.height = 'auto';
  msgEl.style.borderBottomColor = '#aaa';
  setTimeout(() => { msgEl.style.borderBottomColor = ''; }, 500);
}

window.launch = launch;

document.getElementById('msg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    launch();
  }
});

// ── CURSOR GLOW ───────────────────────────────────────────────────────────────
const glow = document.getElementById('cursorGlow');

// Em touch (mobile/tablet) não há cursor — o glow fica estático via CSS
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

if (!isTouch && glow) {
  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  let tx = cx, ty = cy;

  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
  });

  const ease = 0.045;

  function loop() {
    cx += (tx - cx) * ease;
    cy += (ty - cy) * ease;
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    requestAnimationFrame(loop);
  }
  loop();
}
// Em touch: o CSS posiciona o glow estático no topo via media query