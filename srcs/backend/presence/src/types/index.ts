import { SocketStream } from '@fastify/websocket';

export interface SessionSocketStream extends SocketStream {
  sessionId?: number;
}

export interface Message {
    type: string;
    data?: object;
}

export type OnlineStatus = "online" | "offline";

export interface UserStatus {
  userId: number;
  status: OnlineStatus; // maybe add "unknown" for the edge case where a friendship while both are connected
}

export interface FriendsMessage extends Message {
    type: "friends";
    data: {
        friends: UserStatus[];
    };
}

export interface FriendStatusChangeMessage extends Message {
    type: "friend_status_change";
    data: UserStatus;
}