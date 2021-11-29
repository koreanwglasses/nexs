import type { NextApiRequest, NextApiResponse } from "next";
import { subscribable, pruneSockets } from "@koreanwglasses/nexs"

export default subscribable({
  dataKey: (req) => `/api/socket-count#${req.session.id}`,
  handler(req: NextApiRequest, res: NextApiResponse) {
    pruneSockets(req);
    const numSockets = Object.keys(req.session.sockets).length;
    return res.send({ numSockets });
  },
});
