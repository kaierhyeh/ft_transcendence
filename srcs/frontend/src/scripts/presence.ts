// No need for URL in the constant - WebSocket URL is relative
const API_PRESENCE_WS_ENDPOINT = `/api/presence/ws`;

export type OnlineStatus = "online" | "offline" | "unknown";

interface UserStatus {
  userId: number;
  status: OnlineStatus;
}

class Presence {
    private friendStatus: Map<number, OnlineStatus> = new Map();
    private ws: WebSocket | null = null;

    checkin() {
        // Prevent multiple connections
        if (this.ws !== null) {
            console.log('⚠️ WebSocket already exists, skipping checkin');
            return;
        }

        // Build WebSocket URL - browser will automatically convert http->ws, https->wss
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}${API_PRESENCE_WS_ENDPOINT}`;
        
        console.log('🔌 Creating WebSocket connection to:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
            this.ws = null;
            return;
        }

        this.ws.onopen = () => {
            console.log('🔓 WebSocket opened');
            
            // Since the server will authenticate via cookies in the upgrade request,
            // we just send a checkin message without the token
            const message = { type: "checkin" };
            const delayMs = 500; // delay before sending the checkin
            console.log(`⏳ Delaying checkin by ${delayMs}ms`, message);

            window.setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                this.ws.send(JSON.stringify(message));
                console.log('✅ Checkin message sent');
                } catch (error) {
                console.error('❌ Failed to send checkin:', error);
                }
            } else {
                console.warn('⚠️ WebSocket not open, skipping checkin send');
            }
            }, delayMs);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            console.log('📥 Message received:', event.data);
            
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === "ping") {
                    console.log('🏓 Ping received, sending pong');
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: "pong" }));
                    }
                }
                else if (message.type === "friends") {
                    const { friends } = message.data as { friends: UserStatus[] };
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

        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket closed:', {
                code: event.code,
                reason: event.reason || '(no reason)',
                wasClean: event.wasClean
            });
            
            // Nullify the connection so checkin() can be called again
            this.ws = null;
            this.friendStatus.clear();
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error occurred:', error);
            if (this.ws) {
                console.error('   readyState:', this.ws.readyState);
            }
        };
    }

    checkout() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('👋 Closing WebSocket connection');
            this.ws.close();
        }
        // Note: this.ws will be nullified in onclose handler
    }

    onlineStatus(userId: number): OnlineStatus {
        const status = this.friendStatus.get(userId);
        return status ?? "unknown";
    }
}

export const presence = new Presence();