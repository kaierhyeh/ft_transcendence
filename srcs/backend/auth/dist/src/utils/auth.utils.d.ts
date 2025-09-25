export declare class AuthUtils {
    hashPassword(password: string, saltRounds?: number): Promise<string>;
    verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
    ft_setCookie(reply: any, token: string, duration: number): void;
    checkUsername(fastify: any, username: string): {
        error: string;
    } | string;
}
declare const _default: AuthUtils;
export default _default;
//# sourceMappingURL=auth.utils.d.ts.map