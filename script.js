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

// Increased limit from 40 to 100
const MAX_BUBBLES = 200;

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

function makeDraggable(bubble) {
  const inner = bubble.querySelector('.bubble-inner');
  let isDragging = false;
  let startX, startY, origX, origY;

  function getPos() {
    const style = window.getComputedStyle(bubble);
    return {
      x: parseFloat(style.left) || 0,
      y: parseFloat(style.top)  || 0
    };
  }

  // Mouse
  inner.addEventListener('mousedown', e => {
    isDragging = true;
    const pos = getPos();
    origX = pos.x; origY = pos.y;
    startX = e.clientX; startY = e.clientY;
    bubble.style.animationPlayState = 'paused';
    bubble.style.cursor = 'grabbing';
    bubble.style.zIndex = '9000';
    e.stopPropagation();
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    bubble.style.left = (origX + e.clientX - startX) + 'px';
    bubble.style.top  = (origY + e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    bubble.style.cursor = 'grab';
    bubble.style.zIndex = '';
  });

  // Touch
  inner.addEventListener('touchstart', e => {
    const pos = getPos();
    origX = pos.x; origY = pos.y;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    isDragging = true;
    bubble.style.animationPlayState = 'paused';
    bubble.style.zIndex = '9000';
    e.stopPropagation();
  }, { passive: true });

  inner.addEventListener('touchmove', e => {
    if (!isDragging) return;
    bubble.style.left = (origX + e.touches[0].clientX - startX) + 'px';
    bubble.style.top  = (origY + e.touches[0].clientY - startY) + 'px';
  }, { passive: true });

  inner.addEventListener('touchend', () => {
    isDragging = false;
    bubble.style.zIndex = '';
  });

  inner.style.cursor = 'grab';
}

function createBubble(text, date) {
  const vw = window.innerWidth;

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

  // Remove oldest bubble if at the cap
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

  // Make it draggable
  makeDraggable(bubble);
  bubble.setAttribute('data-draggable', '1');
}

// ── ESCUTA MENSAGENS EM TEMPO REAL ────────────────────────────────────────────
// Increased limit from 50 to 100
const q = query(
  collection(db, 'feelings'),
  orderBy('createdAt', 'desc'),
  limit(200)
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

  // After each snapshot batch, apply drag to any bubble not yet draggable
  bubbleLayer.querySelectorAll('.bubble:not([data-draggable])').forEach(b => {
    makeDraggable(b);
    b.setAttribute('data-draggable', '1');
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
