import { Database } from "better-sqlite3";

export class BlockRepository {
    constructor(private db: Database) {
        this.db = db;

    }

  //   blockUser(blockerId: number, blockedId: number): Promise<void>;
  // unblockUser(blockerId: number, blockedId: number): Promise<void>;

  // listBlockedUsers(blockerId: number): Promise<User[]>;
  // isBlocked(blockerId: number, blockedId: number): Promise<boolean>;
}