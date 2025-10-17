 export function generateParticipantId(): string {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    return "remote_" + timestamp + "_" + randomNumber;
}