//importamos cada ruta 
import usersRouter from './usersRouter.js';
import postsRouter from './postsRouter.js';
import commentsRouter from './commentsRouter.js';
import degreesRouter from './degreesRouter.js';
import userActivityRoutes from './userActivityRoutes.js';
import metaRouter from './metaRouter.js';
import chatsRouter from './chatsRouter.js';
import searchRoutes from "./searchRouter.js";
// import authRouter from "./authRouter.js";
// import careersRouter from "./careersRouter.js";
// import forumRouter from "./forumRouter.js";
// import postsRouter from "./postsRouter.js";
// import projectsRouter from "./projectsRouter.js";
// import chatsRouter from "./chatsRouter.js";

function routerAPI (app){
    //Defino cada ruta
    app.use ('/api/users', usersRouter);
    app.use('/api/posts', postsRouter);
    app.use('/api/comments', commentsRouter);
    app.use('/api/degrees', degreesRouter);
    app.use('/api/chats', chatsRouter);
    app.use('/api/user-activity', userActivityRoutes);
    app.use('/api/meta', metaRouter);
    app.use('/api', metaRouter);
    app.use('/api/degrees', degreesRouter);
    app.use("/api/search", searchRoutes);
    // app.use ('/api/auth', authRouter);
    // app.use ('/api/careers', careersRouter);
    // app.use ('/api/forum', forumRouter);
    // app.use ('/api/posts', postsRouter);
    // app.use ('/api/projects', projectsRouter);
    // app.use ('/api/chats', chatsRouter);
}

export default routerAPI;
