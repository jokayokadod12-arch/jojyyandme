/* ============================================================
   login.js
   Name-only entry. The person just types their name and is let
   straight in — no password shown or typed by them. Behind the
   scenes we still sign in to real Firebase Auth (using a fixed
   internal password stored in accounts.js) so Firestore's
   security rules — which require a signed-in, matching account —
   keep working exactly the same way.
   ============================================================ */

import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { NAME_TO_ACCOUNT } from "./accounts.js";

function scatterPetals() {
  const field = document.getElementById("petalField");
  const count = window.innerWidth < 600 ? 14 : 24;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 10 + Math.random() * 12 + "s";
    p.style.animationDelay = -(Math.random() * 20) + "s";
    p.style.width = p.style.height = 6 + Math.random() * 6 + "px";
    field.appendChild(p);
  }
}
scatterPetals();

const loginCard = document.getElementById("loginCard");
const nameInput = document.getElementById("keyInput");
const gateError = document.getElementById("gateError");

// Already signed in from a previous visit? Skip straight to the hub.
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "home.html";
});

loginCard.addEventListener("submit", async (e) => {
  e.preventDefault();
  const typedName = nameInput.value.trim().toLowerCase();

  const account = NAME_TO_ACCOUNT[typedName];
  if (!account) {
    shakeAndError("I don't recognize that name — try again, love.");
    return;
  }

  try {
    // Normal case: this account already exists (someone signed in as
    // this name before), so just sign in with the internal secret.
    await signInWithEmailAndPassword(auth, account.email, account.secret);
    finishLogin();
  } catch (err) {
    // First time ever for this name — the account doesn't exist yet,
    // so create it now. From then on the branch above handles it.
    try {
      await createUserWithEmailAndPassword(auth, account.email, account.secret);
      finishLogin();
    } catch (createErr) {
      shakeAndError("Something went wrong — try again.");
    }
  }
});

function finishLogin() {
  gateError.textContent = "";
  loginCard.classList.add("unlocking");
  setTimeout(() => { window.location.href = "home.html"; }, 650);
}

function shakeAndError(message) {
  gateError.textContent = message;
  loginCard.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" },
     { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
    { duration: 320 }
  );
}
