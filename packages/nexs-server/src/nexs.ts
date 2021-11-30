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

function nexs(
  opts: {
    next?: Parameters<typeof Next>[0];
    session?: Partial<
      ExpressSession.SessionOptions & {
        createStore: (session: typeof ExpressSession) => ExpressSession.Store;
      }
    >;
    io?: Partial<IOServerOptions>;
    server?: http.ServerOptions | https.ServerOptions;
    dev?: boolean;
  } = {}
) {
  const {
    next: nextOpts = {},
    session: { createStore, ...sessionOpts } = {},
    io: ioOpts ,
    server: serverOpts = {},
    dev = true,
  } = opts;

  // Next.js setup
  const next = Next({ ...nextOpts, dev });
  const handle = next.getRequestHandler();

  // Session setup
  const session = ExpressSession({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    ...(createStore ? { store: createStore(ExpressSession) } : {}),
    ...sessionOpts,
  });

  // Express setup
  const express = Express();
  express.use(session);

  // Server Setup
  const server =
    "key" in serverOpts && "cert" in serverOpts
      ? https.createServer(serverOpts, express)
      : http.createServer(serverOpts, express);

  // Socket.IO setup
  const io = new IO(ioOpts) as IOWithSession;
  io.use(iosession(session, { autoSave: true }) as any);
  
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
