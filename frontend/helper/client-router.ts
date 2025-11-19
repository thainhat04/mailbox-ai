type RouterType = {
    push: (path: string) => void;
    replace: (path: string) => void;
};

let clientRouter: RouterType | null = null;

export const RouterClient = {
    set(router: RouterType) {
        clientRouter = router;
    },

    push(path: string) {
        clientRouter?.push(path);
    },

    replace(path: string) {
        clientRouter?.replace(path);
    },
};
