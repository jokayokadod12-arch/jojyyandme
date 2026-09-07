/* ============================================================
   firebase-init.js
   One shared init point. Everything else imports auth/db from here.
   Uses the Firebase v10 modular SDK straight from Google's CDN,
   so there's no build step — just host these files anywhere that
   serves them over http/https (Firebase Hosting is the natural fit).
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
