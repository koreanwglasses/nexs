import Next from "next";
import Express from "express";
import { Server as IO, ServerOptions as IOServerOptions } from "socket.io";
import type { Socket } from "socket.io";
import http from "http";
import https from "https";

import ExpressSession from "express-session";
import type { Session } from "express-session";

import iosession from "express-socket.io-session";
import { pruneSockets } from "@koreanwglasses/nexs-core";
import type { NextServer } from "next/dist/server/next";

// Next
//  EXpress
//    Socket.IO
export interface NEXS {
  next: NextServer;
  io: IO;
  server: http.Server;
}

type CB<Ev> = Ev extends "connect" | "connection"
  ? (socket: Socket & { handshake: { session?: Session } }) => void
  : Parameters<IO["on"]>[1];
interface IOWithSession extends IO {
  on<Ev extends string>(ev: Ev, cb: CB<Ev>): this;
}

function nexs({
  next: next_,
  nextOpts = {},

  session: session_,
  sessionOpts = {},

  express: express_,

  io: io_,
  ioOpts = {},

  server: server_,
  serverOpts = {},

  dev,
}: {
  next?: NextServer;
  nextOpts?: Parameters<typeof Next>[0];

  session?: Express.RequestHandler;
  sessionOpts?: Partial<ExpressSession.SessionOptions>;

  express?: Express.Express;

  io?: IO;
  ioOpts?: Partial<IOServerOptions>;

  server?: http.Server | https.Server;
  serverOpts?: http.ServerOptions | https.ServerOptions;

  dev?: boolean;
}) {
  // Next.js integration
  const next = next_ ?? Next({ ...nextOpts, dev });
  const handle = next.getRequestHandler();

  // Initialize Express and Socket.IO servers
  const express = express_ ?? Express();

  const server =
    server_ ??
    ("key" in serverOpts && "cert" in serverOpts
      ? https.createServer(serverOpts, express)
      : http.createServer(serverOpts, express));

  const io = (io_ ?? new IO(server, ioOpts)) as IOWithSession;

  // Session setup
  const session =
    session_ ??
    ExpressSession({
      secret: "secret",
      resave: true,
      saveUninitialized: true,
      ...sessionOpts,
    });

  express.use(session);
  io.use(iosession(session, { autoSave: true }) as any);

  // Socket.IO setup
  io.on("connect", (socket) => {
    const session = socket.handshake.session!;
    pruneSockets(session, io);

    let i = 1;
    while (i in session.sockets) i++;
    session.sockets[i] = socket.id;
    session.save();

    socket.emit("socket:linked", { socketIdx: i });
    socket.on("socket:link", () =>
      socket.emit("socket:linked", { socketIdx: i })
    );

    socket.on("subscription:unsub", (dataKey) => {
      socket.leave(`subscribers:${dataKey}`);
    });

    socket.on("disconnect", () => {
      const session = socket.handshake.session!;
      delete session.sockets[i];
      session.save();
    });
  });

  const finalize = async () => {
    await next.prepare();

    // Forward all remaining routes to Next.js
    express.all("*", (req, res) => {
      (req as any).io = io;
      return handle(req, res);
    });

    // Attach Socket.IO, which overrides the /socket.io* routes
    io.attach(server);
  };

  type ReturnPromise<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : never;
  const listen: ReturnPromise<http.Server["listen"]> = async (...args) => {
    await finalize();
    return server.listen(...args);
  };

  return {
    finalize,
    listen,
    next,
    express,
    io,
    server,
  };
}

export default nexs;
