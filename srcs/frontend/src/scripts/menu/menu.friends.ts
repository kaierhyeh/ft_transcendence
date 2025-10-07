// imports

import { setMenuTitle } from "./menu.utils.js";

// data structures

/* ============================================ GLOBALS ===================================== */
// declarations
// initializations

/* ============================================ UTILS ======================================= */
// utility functions

/* ============================================ EVENTS ====================================== */
// event handlers

/* ==================================== FRIENDS SECTION ===================================== */

/* =============================== FRIENDSHIP REQUESTS SECTION ============================== */

/* ================================= BLOCK-LIST SECTION ===================================== */

/* =============================== INITIALIZATION OF FRIENDS SECTION ======================== */

export function openFriendsSection(): void {
	console.log("FRIENDS: Friends Section opened (test function)");
	document.getElementById("friendsSection")!.classList.remove("hidden");
	setMenuTitle("friends");
}
