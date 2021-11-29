import Next from "next";
import Express from "express";
import { Server as IO } from "socket.io";
import type { Socket } from "socket.io";
import http from "http";
import type https from "https";

import expressSession from "express-session";
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
  session: session_,
  express: express_,
  server: server_,
  dev,
}: {
  session?: Express.RequestHandler;
  next?: NextServer;
  express?: Express.Express;
  server?: http.Server | https.Server;
  dev?: boolean;
}) {
  // Next.js integration
  const next = next_ ?? Next({ dev });
  const handle = next.getRequestHandler();

  // Initialize Express and Socket.IO
  const express = express_ ?? Express();
  const io = new IO() as IOWithSession;

  // Session setup
  const session =
    session_ ??
    expressSession({
      secret: "secret",
      resave: true,
      saveUninitialized: true,
    });

  if (!express_) express.use(session);
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

    socket.on("disconnect", () => {
      const session = socket.handshake.session!;
      delete session.sockets[i];
      session.save();
    });
  });

  // Forward all routes to Next.js
  express.all("*", (req, res) => {
    (req as any).io = io;
    return handle(req, res);
  });

  const server = server_ ?? http.createServer(express);

  // Attach Socket.IO, which overrides the /socket.io* routes
  io.attach(server);

  return {
    next,
    io,
    server,
  };
}

export default nexs;
