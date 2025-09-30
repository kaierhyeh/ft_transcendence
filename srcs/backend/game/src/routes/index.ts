import gameRoutes from "./game";
import sessionRoutes from "./sessions";

export default [
    { route: gameRoutes, prefix: "/game" },
    { route: sessionRoutes, prefix: "/sessions" }
];