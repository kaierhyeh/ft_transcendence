const API_PRESENCE_ENDPOINT = `${window.location.origin}/api/presence`;

export type OnlineStatus = "online" | "offline" | "unknown";

interface UserStatus {
  userId: number;
  status: OnlineStatus;
}

// Helper function to get cookie value by name
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue || null;
    }
    return null;
}

let ws: WebSocket;

class Presence {
    private friendStatus: Map<number, OnlineStatus> = new Map();

    async checkin() {
        console.log('🔌 Creating WebSocket connection to:', `${API_PRESENCE_ENDPOINT}/ws`);
        ws = new WebSocket(`${API_PRESENCE_ENDPOINT}/ws`);
    
        ws.onopen = () => {
            console.log('🔓 WebSocket opened');
            
            const accessToken = getCookie('accessToken');
            console.log('🔑 Access token:', accessToken ? 'Found' : 'NOT FOUND');
            
            if (!accessToken) {
                console.error('❌ No access token in cookies');
                ws.close();
                return;
            }
            
            const message = { type: "checkin", data: { accessToken } };
            console.log('📤 Sending checkin:', message);
            ws.send(JSON.stringify(message));
        };

        ws.onmessage = (event: MessageEvent) => {
            console.log('📥 Message received:', event.data);
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === "ping") {
                    console.log('� Ping received, sending pong');
                    ws.send(JSON.stringify({ type: "pong" }));
                }
                else if (message.type === "friends") {
                    const { friends } = message.data as { friends: UserStatus[]};
                    console.log('👥 Friends list received:', friends);
                    this.friendStatus.clear();
                    friends.forEach(friend => {
                        this.friendStatus.set(friend.userId, friend.status);
                    });
                }
                else if (message.type === "friend_status_change") {
                    const friendStatus = message.data as UserStatus;
                    console.log('🔄 Friend status change:', friendStatus);
                    this.friendStatus.set(friendStatus.userId, friendStatus.status);
                }
            } catch (error) {
                console.error('❌ Failed to parse message:', error);
            }
        };

        ws.onclose = (event) => {
            console.log('🔌 WebSocket closed:', event.code, event.reason);
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
    }

    async checkout() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    }

    onlineStatus(userId: number): OnlineStatus {
        const status = this.friendStatus.get(userId);
        if (!status) return "unknown";
        return status;
    }
}

export const presence = new Presence();
