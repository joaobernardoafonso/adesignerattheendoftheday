// ── FIREBASE ──────────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, orderBy, query, serverTimestamp }
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

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeStr(date) {
  return (date || new Date()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function createBubble(text, name, date) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const startX = Math.random() * (vw - 320);
  const startY = Math.random() * (vh - 200);
  const angle  = Math.random() * Math.PI * 2;
  const dist   = 120 + Math.random() * 180;
  const dx     = Math.cos(angle) * dist;
  const dy     = Math.sin(angle) * dist;
  const r0     = (Math.random() - 0.5) * 5;
  const r1     = r0 + (Math.random() - 0.5) * 6;
  const dur    = 16 + Math.random() * 20;

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
      <div class="bubble-name">${escHtml(name)}</div>
      <div class="bubble-text">${escHtml(text)}</div>
      <div class="bubble-ts">${timeStr(date)}</div>
    </div>
  `;

  bubbleLayer.appendChild(bubble);
  bubble.addEventListener('animationend', () => bubble.remove());
}

// ── ESCUTA MENSAGENS EM TEMPO REAL ────────────────────────────────────────────
// Sempre que alguém (em qualquer parte do mundo) enviar uma mensagem,
// ela aparece automaticamente no ecrã de toda a gente.
const q = query(collection(db, 'feelings'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      const date = data.createdAt ? data.createdAt.toDate() : new Date();
      // pequeno delay aleatório para não aparecerem todas ao mesmo tempo
      const delay = Math.random() * 1200;
      setTimeout(() => createBubble(data.text, data.name, date), delay);
    }
  });
});

// ── ENVIAR MENSAGEM ───────────────────────────────────────────────────────────
async function launch() {
  const msgEl  = document.getElementById('msg-input');
  const nameEl = document.getElementById('name-input');
  const msg    = msgEl.value.trim();

  if (!msg) {
    msgEl.focus();
    msgEl.style.borderBottomColor = '#f87171';
    setTimeout(() => { msgEl.style.borderBottomColor = ''; }, 700);
    return;
  }

  const name = nameEl.value.trim() || 'anonymous';

  // guarda no Firebase — vai aparecer em tempo real para toda a gente
  await addDoc(collection(db, 'feelings'), {
    text:      msg,
    name:      name,
    createdAt: serverTimestamp()
  });

  msgEl.value  = '';
  nameEl.value = '';
  msgEl.style.borderBottomColor = '#aaa';
  setTimeout(() => { msgEl.style.borderBottomColor = ''; }, 500);
}

// expõe a função ao botão no HTML
window.launch = launch;

// Ctrl/Cmd+Enter para enviar
document.getElementById('msg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) launch();
});