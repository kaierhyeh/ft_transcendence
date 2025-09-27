import gameRoutes from "./game";
import sessionRoutes from "./sessions";

export default [
    { route: gameRoutes, prefix: "/users" },
    { route: sessionRoutes, prefix: "/sessions" }
];