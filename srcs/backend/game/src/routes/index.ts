import gameRoutes from "./game";
import sessionRoutes from "./sessions";
import remoteMatchmakingRoutes from "./remoteMatchmaking";

export default [
    { route: gameRoutes },
    { route: sessionRoutes },
    { route: remoteMatchmakingRoutes }
];