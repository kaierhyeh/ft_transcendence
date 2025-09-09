import usersRoutes from "./users";
import friendsRoutes from "./friends";
import blocksRoutes from "./blocks";

export default [
    { route: usersRoutes, prefix: "/users" },
    { route: friendsRoutes, prefix: "/friends" },
    { route: blocksRoutes, prefix: "/blocks" },
];