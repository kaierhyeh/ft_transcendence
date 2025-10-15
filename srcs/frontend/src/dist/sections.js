import { user } from './users.js';
export var sections = [];
export var HOME_INDEX = 0;
export var section_index = HOME_INDEX;
export var activeGameId = null;
export var activeTournamentId = null;
export class ASection {
    activate_section() {
        this.dependencies.forEach(dep => {
            sections[get_type_index(dep)].enter(user !== undefined);
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
    }
    ;
    logged_off_view() {
        this.dependencies.forEach(dep => {
            const index = get_type_index(dep);
            if (index !== undefined)
                sections[get_type_index(dep)].switch_logged_off();
        });
        this.logged_off?.forEach((element) => { element.classList.add('active'); });
        this.logged_in?.forEach((element) => { element.classList.remove('active'); });
    }
    logged_in_view() {
        this.dependencies.forEach(dep => {
            const index = get_type_index(dep);
            if (index !== undefined)
                sections[get_type_index(dep)].switch_logged_in();
        });
        this.logged_off?.forEach((element) => { element.classList.remove('active'); });
        this.logged_in?.forEach((element) => { element.classList.add('active'); });
    }
}
class Home extends ASection {
    constructor() {
        super(...arguments);
        this.type = 'home';
        this.protected = false;
        this.parent = document.getElementById('home-parent');
        this.logged_off = this.parent?.querySelectorAll('.logged-off');
        this.logged_in = this.parent?.querySelectorAll('.logged-in');
        this.dependencies = [];
    }
    async is_option_valid(option) {
        return (option === '') ? true : false;
    }
    async enter(verified) {
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
    constructor() {
        super(...arguments);
        this.type = 'game';
        this.protected = true;
        this.parent = document.getElementById('game-overlay');
        this.logged_off = this.parent?.querySelectorAll('.non-existent-class');
        this.logged_in = this.parent?.querySelectorAll('.non-existent-class');
        this.dependencies = ['home'];
    }
    async is_option_valid(_option) {
        return true;
    }
    async enter(verified) {
        if (verified !== true) {
            return;
        }
        this.activate_section();
    }
    chooseGameSettings(gameId) { }
    chooseTournamentSettings(tournamentId, bracket) { }
    transitionToGame(gameId, settings, playerNumber) { }
    showTournamentInfo(round, players, onDone) { }
    switch_logged_off() {
        this.logged_off_view();
    }
    switch_logged_in() {
        this.logged_in_view();
    }
}
export class Chat extends ASection {
    constructor() {
        super(...arguments);
        this.type = 'chat';
        this.protected = true;
        this.parent = document.getElementById('chat-parent');
        this.logged_off = this.parent?.querySelectorAll('.logged-off');
        this.logged_in = this.parent?.querySelectorAll('.logged-in');
        this.dependencies = ['home'];
    }
    async is_option_valid(_option) {
        return true;
    }
    async enter(verified) {
        if (verified !== true) {
            return;
        }
        this.activate_section();
    }
    switch_logged_off() { }
    switch_logged_in() { }
    load_messages(messages) { }
}
export class Actions extends ASection {
    constructor() {
        super(...arguments);
        this.type = 'actions';
        this.protected = true;
        this.parent = document.getElementById('actions-parent');
        this.logged_off = this.parent?.querySelectorAll('.logged-off');
        this.logged_in = this.parent?.querySelectorAll('.logged-in');
        this.dependencies = ['home'];
    }
    async is_option_valid(option) {
        return (option === '') ? true : false;
    }
    async enter(verified) {
        if (verified !== true) {
            return;
        }
        this.activate_section();
    }
    switch_logged_off() { }
    switch_logged_in() { }
    load_boxes() { }
}
export class DirectMessage extends ASection {
    constructor() {
        super(...arguments);
        this.type = 'directmessage';
        this.protected = true;
        this.parent = document.getElementById('directmessage-parent');
        this.logged_off = this.parent?.querySelectorAll('.logged-off');
        this.logged_in = this.parent?.querySelectorAll('.logged-in');
        this.dependencies = ['home'];
    }
    async is_option_valid(option) {
        return true;
    }
    async enter(verified) {
        if (verified !== true) {
            return;
        }
        this.activate_section();
    }
    switch_logged_off() { }
    switch_logged_in() { }
    load_messages(messages) { }
}
sections = [new Home(), new GameSection(), new Chat(), new Actions(), new DirectMessage()];
export function get_url_type(url) {
    let start = 0;
    if (url[0] === '/')
        start = 1;
    let end;
    for (end = start; end < url.length; ++end) {
        if (url[end] === '/')
            break;
    }
    return url.substring(start, end);
}
export function get_url_option(url) {
    let start = 0;
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
export function get_type_index(type) {
    for (let i = 0; i < sections.length; i++) {
        if (sections[i].type === type)
            return i;
    }
    return undefined;
}
export function set_section_index(index) {
    if (index === undefined)
        index = HOME_INDEX;
    section_index = index;
}
export function update_sections() {
    for (let i = 0; i < sections.length; i++) {
        if (i !== section_index)
            sections[i].leave();
    }
    sections[section_index].enter(user !== undefined);
}
export async function go_section(type, option) {
    let index = get_type_index(type);
    if (index === undefined) {
        type = 'home';
        option = '';
        index = HOME_INDEX;
    }
    set_section_index(index);
    update_sections();
}
export function update_status(username, online) { }
export function show2FAVerificationModal(tempToken, username) {
    const modal = document.getElementById('2fa-verification-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}
export function showInviteOverlay(message, options = {}) {
    const overlay = document.getElementById('invite-waiting-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}
window.go_section = go_section;
//# sourceMappingURL=sections.js.map