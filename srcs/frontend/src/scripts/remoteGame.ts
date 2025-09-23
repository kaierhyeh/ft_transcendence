export default function initRemoteGame():void {
    console.log("create remote interface");
    createRemoteInterface();
}

function createRemoteInterface(): void {
    const btn2p = document.getElementById('remote-2p-btn') as HTMLButtonElement;
    const btn4p = document.getElementById('remote-4p-btn') as HTMLButtonElement;

    if (btn2p != null) btn2p.style.display = 'block';
    if (btn4p != null) btn4p.style.display = 'block';

    setupRemoteEvents();
}

function setupRemoteEvents(): void {
    const btn2p = document.getElementById('remote-2p-btn');
    const btn4p = document.getElementById('remote-4p-btn');

    if (btn2p != null) {
        btn2p.addEventListener('click', function() { joinQueue("2p"); });
    }

    if (btn4p != null) {
        btn4p.addEventListener('click', function() { joinQueue("4p");  });
    }
}
/*//reuse for websocket later!!!
function showRemoteStatus(message: string, buttonId: string): void {
    const element = document.getElementById(buttonId);
    if (element != null) {
        element.textContent = message;
    }
}*/
 
function joinQueue(mode: "2p" | "4p"): void {

    /*const participantId = generateParticipantId(); // <- ft teest to create, check more into id

    try {
        const response = await fetch('', {
            method:
            headers:,
            body:
                mode: mode,
                participant_id: participantId
            })
        });

        const data = await response.json();

        */
    let buttonId;
    if (mode === "2p") {
        buttonId = "remote-2p-btn";
    } else {
        buttonId = "remote-4p-btn";
    }

    const button = document.getElementById(buttonId);
    if (button != null) {
        button.textContent = "waiting for players..";
    }

    try {
        console.log("ft_joinqueue called with mode :", mode);
        // here will implment queue logic from remotematchmaking.ts
    }
     catch (error) {
        console.log("Connection error while trying to joinqueue:", error);
    }
}


