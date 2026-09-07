/* ============================================================
   accounts.js
   The site only ever has two people in it. This file is the one
   place that says who they are and what they're allowed to see.

   The emails below must match EXACTLY the two users you create in
   Firebase Console → Authentication → Users → Add user.
   They don't need to be real inboxes — Firebase Auth just needs
   something shaped like an email.
   ============================================================ */

// What she types on the login screen → her Firebase Auth email.
// What he types on the login screen → his Firebase Auth email.
// "secret" is an internal password used behind the scenes to talk to
// Firebase Auth — the person never sees or types it, they just type
// their name and are let straight in. It only needs to be 6+ characters
// and unique per account; it isn't meant to be a real secret since
// this whole file is visible to anyone who opens the site's source.
export const NAME_TO_ACCOUNT = {
  "jojyy2009": { email: "jojy@jojyyandme.app", role: "her", name: "Lovly Jojy", secret: "jojyy2009-innerkey-9f3kd" },
  "yoyo2006":  { email: "yoyo@jojyyandme.app", role: "him", name: "Yoyo Joo",   secret: "yoyo2006-innerkey-7h2pq" }
};

// Reverse lookup: once Firebase confirms who's signed in, turn their
// email back into a role + display name.
export const EMAIL_TO_ACCOUNT = {
  "jojy@jojyyandme.app": { role: "her", name: "Lovly Jojy" },
  "yoyo@jojyyandme.app": { role: "him", name: "Yoyo Joo" }
};
