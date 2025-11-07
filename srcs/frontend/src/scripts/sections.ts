import { add_online, user, get_user_messages, OtherUser, Message, add_message, update_user_data } from './users.js';
import { t_DirectMessage, update } from './api.js';
import { get_direct_messages, ChatResponse, login, register, logout, unregister, add, remove, search, send, get_blocked_users, block, unblock, setup2fa, activate2fa, verify2fa, disable2fa, get2faStatus, getUserAccountType, initiateGoogleLogin, updateAvatar, getGameHistory } from './api.js';
import { showError } from './notifications.js';

export var sections: ASection[] = [];
export var HOME_INDEX: number = 0;
export var section_index: number = HOME_INDEX;

export var activeGameId: string | null = null;
export var activeTournamentId: string | null = null;

export abstract class ASection {
	abstract readonly type: string;
	abstract readonly protected: boolean;
	abstract readonly parent: HTMLElement;
	abstract readonly logged_off: NodeListOf<Element>;
	abstract readonly logged_in: NodeListOf<Element>;
	abstract readonly dependencies: Array<string>;

	abstract is_option_valid(option: string): Promise<boolean>;
	abstract enter(verified: boolean): void;
	abstract switch_logged_off(): void;
	abstract switch_logged_in(): void;
	activate_section() {
		this.dependencies.forEach(dep => {
			sections[get_type_index(dep)!].enter(user !== undefined);
		});
		document.querySelectorAll(".section." + this.type).forEach(container => {
			container.classList.add('active');
		});
	}
	deactivate_section() {
		document.querySelectorAll(".section." + this.type).forEach(container => {
			container.classList.remove('active');
		});
	}
	leave() {
		this.deactivate_section();
		this.switch_logged_off();
	};
	logged_off_view() {
		this.dependencies.forEach(dep => {
			const index = get_type_index(dep);
			if (index !== undefined)
				sections[get_type_index(dep)!].switch_logged_off();
		});
		this.logged_off?.forEach((element) => { element.classList.add('active'); });
		this.logged_in?.forEach((element) => { element.classList.remove('active'); });
	}
	logged_in_view() {
		this.dependencies.forEach(dep => {
			const index = get_type_index(dep);
			if (index !== undefined)
				sections[get_type_index(dep)!].switch_logged_in();
		});
		this.logged_off?.forEach((element) => { element.classList.remove('active'); });
		this.logged_in?.forEach((element) => { element.classList.add('active'); });
	}
}

class Home extends ASection {
	type = 'home';
	protected = false;
	parent = document.getElementById('home-parent') as HTMLElement;
	logged_off = this.parent?.querySelectorAll('.logged-off') as NodeListOf<Element>;
	logged_in = this.parent?.querySelectorAll('.logged-in') as NodeListOf<Element>;
	dependencies = [];

	async is_option_valid(option: string): Promise<boolean> {
		return (option === '') ? true : false;
	}
	async enter(verified: boolean) {
		if (verified === true)
			this.switch_logged_in();
		else
			this.switch_logged_off();
		this.activate_section();
	}
	switch_logged_off() {
		this.logged_off_view();
	}
	switch_logged_in() {
		this.logged_in_view();
	}
}

export class GameSection extends ASection {
	type = 'game';
	protected = true;
	parent = document.getElementById('game-overlay') as HTMLElement;
	logged_off = this.parent?.querySelectorAll('.non-existent-class') as NodeListOf<Element>;
	logged_in = this.parent?.querySelectorAll('.non-existent-class') as NodeListOf<Element>;
	dependencies = ['home'];

	async is_option_valid(_option: string): Promise<boolean> {
		return true;
	}
	async enter(verified: boolean) {
		if (verified !== true) {
			return;
		}
		this.activate_section();
	}

	chooseGameSettings(gameId: string) {}
	chooseTournamentSettings(tournamentId: string, bracket: string) {}
	transitionToGame(gameId: string, settings: any, playerNumber: number) {}
	showTournamentInfo(round: string, players: string[], onDone?: () => void) {}

	switch_logged_off() {
		this.logged_off_view();
	}
	switch_logged_in() {
		this.logged_in_view();
	}
}

export class Chat extends ASection {
	type = 'chat';
	protected = true;
	parent = document.getElementById('chat-parent') as HTMLElement;
	logged_off = this.parent?.querySelectorAll('.logged-off') as NodeListOf<Element>;
	logged_in = this.parent?.querySelectorAll('.logged-in') as NodeListOf<Element>;
	dependencies = ['home'];

	async is_option_valid(_option: string): Promise<boolean> {
		return true;
	}
	async enter(verified: boolean) {
		if (verified !== true) {
			return;
		}
		this.activate_section();
	}
	switch_logged_off() {}
	switch_logged_in() {}
	load_messages(messages: Array<Message> | undefined) {}
}

export class Actions extends ASection {
	type = 'actions';
	protected = true;
	parent = document.getElementById('actions-parent') as HTMLElement;
	logged_off = this.parent?.querySelectorAll('.logged-off') as NodeListOf<Element>;
	logged_in = this.parent?.querySelectorAll('.logged-in') as NodeListOf<Element>;
	dependencies = ['home'];

	async is_option_valid(option: string): Promise<boolean> {
		return (option === '') ? true : false;
	}
	async enter(verified: boolean) {
		if (verified !== true) {
			return;
		}
		this.activate_section();
	}
	switch_logged_off() {}
	switch_logged_in() {}
	load_boxes() {}
}

export class DirectMessage extends ASection {
	type = 'directmessage';
	protected = true;
	parent = document.getElementById('directmessage-parent') as HTMLElement;
	logged_off = this.parent?.querySelectorAll('.logged-off') as NodeListOf<Element>;
	logged_in = this.parent?.querySelectorAll('.logged-in') as NodeListOf<Element>;
	dependencies = ['home'];

	async is_option_valid(option: string): Promise<boolean> {
		return true;
	}
	async enter(verified: boolean) {
		if (verified !== true) {
			return;
		}
		this.activate_section();
	}
	switch_logged_off() {}
	switch_logged_in() {}
	load_messages(messages: ChatResponse | undefined) {}
}

sections = [new Home(), new GameSection(), new Chat(), new Actions(), new DirectMessage()];

export function get_url_type(url: string): string {
	let start: number = 0;
	if (url[0] === '/')
		start = 1;

	let end;
	for (end = start; end < url.length; ++end) {
		if (url[end] === '/')
			break;
	}
	return url.substring(start, end);
}

export function get_url_option(url: string): string {
	let start: number = 0;
	if (url[0] === '/')
		start++;

	for (; start < url.length; ++start) {
		if (url[start] === '/')
			break;
	}

	if (start < url.length) {
		return url.substring(start + 1, url.length);
	}
	return '';
}

export function get_type_index(type: string): number | undefined {
	for (let i = 0; i < sections.length; i++) {
		if (sections[i].type === type)
			return i;
	}
	return undefined;
}

export function set_section_index(index: number | undefined): void {
	if (index === undefined)
		index = HOME_INDEX;
	section_index = index;
}

export function update_sections(): void {
	for (let i = 0; i < sections.length; i++) {
		if (i !== section_index)
			sections[i].leave();
	}
	sections[section_index].enter(user !== undefined);
}

export async function go_section(type: string, option: string) {
	let index = get_type_index(type);
	if (index === undefined) {
		type = 'home';
		option = '';
		index = HOME_INDEX;
	}
	
	set_section_index(index);
	update_sections();
}

export function update_status(username: string, online: boolean) {}

export function show2FAVerificationModal(tempToken: string, context: string) {
	const modal = document.getElementById('2fa-verification-modal') as HTMLElement;
	if (!modal) {
		console.error('2FA verification modal not found');
		return;
	}

	// Update the context message
	const contextMsg = document.getElementById('2fa-context-message') as HTMLElement;
	if (contextMsg) {
		contextMsg.textContent = `Please enter the 6-digit code from your authenticator app for ${context}.`;
	}

	// Clear any previous error messages and input
	const errorMsg = document.getElementById('2fa-verification-error') as HTMLElement;
	if (errorMsg) errorMsg.textContent = '';
	
	const tokenInput = document.getElementById('2fa-verification-token') as HTMLInputElement;
	if (tokenInput) tokenInput.value = '';

	// Show the modal
	modal.style.display = 'flex';

	// Auto-focus the token input field
	if (tokenInput) {
		// Small delay to ensure modal is visible before focusing
		setTimeout(() => {
			tokenInput.focus();
		}, 100);
	}

	// Setup verify button handler
	const verifyBtn = document.getElementById('verify-2fa-btn') as HTMLButtonElement;
	const cancelBtn = document.getElementById('cancel-2fa-verification-btn') as HTMLButtonElement;
	const closeBtn = document.getElementById('close-2fa-verification-modal') as HTMLElement;

	const closeModal = () => {
		modal.style.display = 'none';
		if (errorMsg) errorMsg.textContent = '';
		if (tokenInput) tokenInput.value = '';
		
		// Remove event listeners
		modal.removeEventListener('click', handleOutsideClick);
		if (tokenInput) tokenInput.removeEventListener('keypress', handleEnterKey);
		document.removeEventListener('keydown', handleEscKey);
	};

	// Click outside modal to close
	const handleOutsideClick = (event: MouseEvent) => {
		if (event.target === modal) {
			closeModal();
		}
	};
	modal.addEventListener('click', handleOutsideClick);

	// Press Enter to submit
	const handleEnterKey = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (verifyBtn) verifyBtn.click();
		}
	};
	if (tokenInput) {
		tokenInput.addEventListener('keypress', handleEnterKey);
	}

	// Press ESC to close
	const handleEscKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeModal();
		}
	};
	document.addEventListener('keydown', handleEscKey);

	if (cancelBtn) cancelBtn.onclick = closeModal;
	if (closeBtn) closeBtn.onclick = closeModal;

	if (verifyBtn) {
		verifyBtn.onclick = async () => {
			const token = tokenInput?.value.trim();
			
			if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
				if (errorMsg) errorMsg.textContent = 'Please enter a valid 6-digit code';
				return;
			}

			try {
				const success = await verify2fa(token, tempToken);
				
				if (success) {
					closeModal();
					// Redirect to home page after successful verification (SPA navigation)
					(window as any).navigateTo("/");
				} else {
					// Error message is already shown by verify2fa function
					if (errorMsg) errorMsg.textContent = 'Invalid verification code';
				}
			} catch (error) {
				console.error('2FA verification error:', error);
				if (errorMsg) errorMsg.textContent = 'Verification failed. Please try again.';
			}
		};
	}
}

export function showInviteOverlay(message: string, options: any = {}) {
	const overlay = document.getElementById('invite-waiting-overlay') as HTMLElement;
	if (overlay) {
		overlay.style.display = 'flex';
	}
}

(window as any).go_section = go_section;