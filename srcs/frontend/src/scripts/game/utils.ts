 export function generateParticipantId(): string {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    return "token_" + timestamp + "_" + randomNumber;
}