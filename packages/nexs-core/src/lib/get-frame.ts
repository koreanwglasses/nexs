import { getSocket } from "./get-socket";
import { NextApiRequest } from "next";

export interface Frame {}

export function getFrame(req: NextApiRequest) {
  const socket = getSocket(req);
    if (!req.session.frames[socket.id]) req.session.frames[socket.id] = {};
    return req.session.frames[socket.id]!;
}