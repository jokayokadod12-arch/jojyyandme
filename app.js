/* ============================================================
   app.js
   Loaded as a module. Everything shared (thoughts, memories,
   bucket list) lives in Firestore now and syncs live between
   both accounts. Open When cards + Reasons stay local data
   (data.js) since they're fixed content, not something that
   changes — but the whole section is hidden unless her account
   is the one signed in.
   ============================================================ */

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { EMAIL_TO_ACCOUNT } from "./accounts.js";

let me = null; // { role: "her" | "him", name }

// ---- petals (purely decorative, no auth needed) ----
(function scatterPetals() {
  const field = document.getElementById("petalField");
  const count = window.innerWidth < 600 ? 12 : 20;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 12 + Math.random() * 14 + "s";
    p.style.animationDelay = -(Math.random() * 24) + "s";
    p.style.width = p.style.height = 6 + Math.random() * 6 + "px";
    field.appendChild(p);
  }
})();

// ---- auth gate ----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  me = EMAIL_TO_ACCOUNT[user.email] || { role: "her", name: user.email };
  document.getElementById("whoami").textContent = `signed in as ${me.name}`;
  applyRoleVisibility();
  startTimer();
  wireThoughts();
  wireBucket();
  if (me.role === "her") wireCardsAndReasons();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
});

function applyRoleVisibility() {
  document.querySelectorAll("[data-role-only]").forEach(el => {
    el.style.display = (el.dataset.roleOnly === me.role) ? "" : "none";
  });
  document.getElementById("thoughtsLogTitle").textContent =
    me.role === "her" ? "WHAT YOU'VE LEFT HIM" : "WHAT SHE'S LEFT YOU";

  const activeRoom = document.querySelector(".room.active");
  if (activeRoom && activeRoom.querySelector("[data-role-only]") &&
      getComputedStyle(activeRoom.querySelector("[data-role-only]")).display === "none" &&
      activeRoom.id !== "room-home") {
    goToRoom("home");
  }
}

// ---- room navigation ----
const roomButtons = document.querySelectorAll(".roomnav button");
const rooms = document.querySelectorAll(".room");

function goToRoom(name) {
  rooms.forEach(r => r.classList.toggle("active", r.id === "room-" + name));
  roomButtons.forEach(b => b.classList.toggle("active", b.dataset.room === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
roomButtons.forEach(btn => btn.addEventListener("click", () => goToRoom(btn.dataset.room)));
document.querySelectorAll("[data-goto]").forEach(card => {
  card.addEventListener("click", () => goToRoom(card.dataset.goto));
});

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ============================================================
// LIVE TIMER — counting up from July 1, 2026
// ============================================================
const START_DATE = new Date(Date.UTC(2026, 6, 1, 0, 0, 0)); // month is 0-indexed: 6 = July

function startTimer() {
  updateTimer();
  setInterval(updateTimer, 1000);
}

function updateTimer() {
  const now = new Date();
  let diffMs = now - START_DATE;
  if (diffMs < 0) diffMs = 0;

  const totalSeconds = Math.floor(diffMs / 1000);
  const years = Math.floor(totalSeconds / (365.25 * 24 * 3600));
  const remAfterYears = totalSeconds - Math.floor(years * 365.25 * 24 * 3600);
  const days = Math.floor(remAfterYears / (24 * 3600));
  const hours = Math.floor((remAfterYears % (24 * 3600)) / 3600);
  const mins = Math.floor((remAfterYears % 3600) / 60);
  const secs = remAfterYears % 60;

  document.getElementById("t-years").textContent = years;
  document.getElementById("t-days").textContent = days;
  document.getElementById("t-hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("t-mins").textContent = String(mins).padStart(2, "0");
  document.getElementById("t-secs").textContent = String(secs).padStart(2, "0");
}

// ============================================================
// THOUGHTS BOX — she writes, both read, live from Firestore
// ============================================================
function wireThoughts() {
  const thoughtsCol = collection(db, "thoughts");

  if (me.role === "her") {
    document.getElementById("sendThought").addEventListener("click", async () => {
      const input = document.getElementById("thoughtInput");
      const text = input.value.trim();
      if (!text) return;
      await addDoc(thoughtsCol, {
        text, authorName: me.name, authorRole: me.role, createdAt: serverTimestamp()
      });
      input.value = "";
      const confirm = document.getElementById("sendConfirm");
      confirm.classList.add("show");
      setTimeout(() => confirm.classList.remove("show"), 2200);
    });
  }

  const q = query(thoughtsCol, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const el = document.getElementById("thoughtsList");
    if (snap.empty) {
      el.innerHTML = '<div class="bucket-empty">Nothing here yet.</div>';
      return;
    }
    el.innerHTML = snap.docs.map(d => {
      const t = d.data();
      const when = t.createdAt ? t.createdAt.toDate().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "just now";
      return `
        <div class="thought-entry">
          <span class="entry-author">${escapeHtml(t.authorName || "")}</span><br>
          ${escapeHtml(t.text)}
          <time>${when}</time>
        </div>`;
    }).join("");
  });
}

// ============================================================
// BUCKET LIST — shared, both can add/check/remove, live from Firestore
// ============================================================
function wireBucket() {
  const bucketCol = collection(db, "bucket");

  document.getElementById("bucketAddBtn").addEventListener("click", addBucketItem);
  document.getElementById("bucketInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBucketItem();
  });

  async function addBucketItem() {
    const input = document.getElementById("bucketInput");
    const text = input.value.trim();
    if (!text) return;
    await addDoc(bucketCol, {
      text, done: false, authorName: me.name, createdAt: serverTimestamp()
    });
    input.value = "";
  }

  const q = query(bucketCol, orderBy("createdAt", "asc"));
  onSnapshot(q, (snap) => {
    const el = document.getElementById("bucketList");
    if (snap.empty) {
      el.innerHTML = '<div class="bucket-empty">No dreams added yet — start the list.</div>';
      return;
    }
    el.innerHTML = snap.docs.map(d => {
      const item = d.data();
      const meta = item.done && item.doneBy
        ? `checked off by ${escapeHtml(item.doneBy)}`
        : `added by ${escapeHtml(item.authorName || "")}`;
      return `
        <div class="bucket-item ${item.done ? "done" : ""}" data-id="${d.id}">
          <div class="bucket-check ${item.done ? "done" : ""}" data-action="toggle" data-done="${item.done}"></div>
          <div class="bucket-body">
            <div class="bucket-text">${escapeHtml(item.text)}</div>
            <div class="bucket-meta">${meta}</div>
          </div>
          <button class="bucket-remove" data-action="remove">&times;</button>
        </div>`;
    }).join("");
  });

  document.getElementById("bucketList").addEventListener("click", async (e) => {
    const row = e.target.closest(".bucket-item");
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.dataset.action === "toggle") {
      const isDone = e.target.dataset.done === "true";
      await updateDoc(doc(db, "bucket", id), {
        done: !isDone,
        doneBy: !isDone ? me.name : null
      });
    } else if (e.target.dataset.action === "remove") {
      await deleteDoc(doc(db, "bucket", id));
    }
  });
}

// ============================================================
// OPEN WHEN CARDS + REASONS — her-only, static content from data.js
// ============================================================
function wireCardsAndReasons() {
  const cardsGrid = document.getElementById("cardsGrid");
  const openWhenCards = window.openWhenCards;
  const loveReasons = window.loveReasons;

  function renderCards(filter = "") {
    const q = filter.trim().toLowerCase();
    const dataSet = q
      ? openWhenCards.filter(c => c.question.toLowerCase().includes(q))
      : openWhenCards;

    cardsGrid.innerHTML = dataSet.map(c => `
      <div class="env-card" data-id="${c.id}">
        <div class="env-card-face">
          <span class="env-card-num">${String(c.id).padStart(3, "0")}</span>
          ${escapeHtml(c.question.replace(/^Open /, "").replace(/\?$/, ""))}
        </div>
      </div>
    `).join("");
  }
  renderCards();

  document.getElementById("cardsSearch").addEventListener("input", (e) => renderCards(e.target.value));

  const cardModal = document.getElementById("cardModal");
  const flipInner = document.getElementById("flipInner");
  const modalQuestion = document.getElementById("modalQuestion");
  const modalAnswer = document.getElementById("modalAnswer");

  cardsGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".env-card");
    if (!card) return;
    const found = openWhenCards.find(c => c.id === Number(card.dataset.id));
    if (!found) return;
    modalQuestion.textContent = found.question;
    modalAnswer.textContent = found.answer;
    flipInner.classList.remove("flipped");
    cardModal.classList.add("open");
  });

  flipInner.addEventListener("click", () => flipInner.classList.toggle("flipped"));
  document.getElementById("modalClose").addEventListener("click", () => cardModal.classList.remove("open"));
  cardModal.addEventListener("click", (e) => { if (e.target === cardModal) cardModal.classList.remove("open"); });

  function loadShown() { return JSON.parse(localStorage.getItem("jojyyAndMe_reasonsShown") || "[]"); }
  function saveShown(arr) { localStorage.setItem("jojyyAndMe_reasonsShown", JSON.stringify(arr)); }

  document.getElementById("reasonBtn").addEventListener("click", () => {
    let shown = loadShown();
    if (shown.length >= loveReasons.length) shown = [];
    const remaining = loveReasons.map((_, i) => i).filter(i => !shown.includes(i));
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    shown.push(pick);
    saveShown(shown);

    const reasonText = document.getElementById("reasonText");
    const reasonCard = document.getElementById("reasonCard");
    reasonText.textContent = loveReasons[pick];
    reasonCard.classList.remove("reason-fade");
    void reasonCard.offsetWidth;
    reasonCard.classList.add("reason-fade");
    document.getElementById("reasonCount").textContent = `reason ${shown.length} of ${loveReasons.length}`;
  });
}
