//2players
function startGame2Players(): void {
    document.getElementById('menu')!.classList.add('hidden');
    document.getElementById('pong')!.classList.remove('hidden');
    const script = document.createElement('script');
    script.src = 'pong2players.js';
    document.body.appendChild(script);
}

//4players
function startGame4Players(): void {
    document.getElementById('menu')!.classList.add('hidden');
    document.getElementById('pong')!.classList.remove('hidden');
    const script = document.createElement('script');
    script.src = 'pong4players.js';
    document.body.appendChild(script);
}
//DOMcontenteloaded to wait that all the html loaded before to launch(cant launch if all html elements arent created yet)
document.addEventListener('DOMContentLoaded', () => {
    const btn2 = document.getElementById('btn2players')!;
    const btn4 = document.getElementById('btn4players')!;
    btn2.addEventListener('click', startGame2Players);
    btn4.addEventListener('click', startGame4Players);
});