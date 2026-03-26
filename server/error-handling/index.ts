import {
  NextFunction,
  Request,
  Response,
  ErrorRequestHandler,
  Application,
} from "express";

export const addErrorHandlingToApp = (app: Application) => {
  app.use((_: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ message: "This route does not exist" });
  });

  app.use(((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error("ERROR", req.method, req.path, err);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal server error.",
      });
    }
  }) as ErrorRequestHandler);
};

export default addErrorHandlingToApp;
