interface ConfigType {
    JWT: {
        PRIVATE_KEY: string | null;
        PUBLIC_KEY: string | null;
        ALGORITHM: 'RS256';
        ACCESS_TOKEN_EXPIRY: string;
        REFRESH_TOKEN_EXPIRY: string;
        TEMP_SECRET: string;
    };
    DB: {
        URL: string;
    };
    SERVER: {
        PORT: number;
        HOST: string;
    };
    OAUTH: {
        GOOGLE_CLIENT_ID: string | undefined;
        GOOGLE_CLIENT_SECRET: string | undefined;
        GOOGLE_REDIRECT_URI: string | undefined;
    };
    UPLOAD: {
        MAX_FILE_SIZE: number;
    };
    COOKIE: {
        OPTIONS: {
            path: string;
            secure: boolean;
            httpOnly: boolean;
            sameSite: 'None';
        };
    };
}
export declare const CONFIG: ConfigType;
export {};
//# sourceMappingURL=config.d.ts.map