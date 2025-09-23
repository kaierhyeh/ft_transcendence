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

/* ========================================= INITIALIZATION SECTION ========================= */

export function openUsersSection(): void {
	console.log("USERS: Users Section opened (test function)");
	document.getElementById("usersSection")!.classList.remove("hidden");
	setMenuTitle("Users");
}
