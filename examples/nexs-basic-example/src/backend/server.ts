import config from "./config";
import { notify } from "@koreanwglasses/nexs";
import nexs from "@koreanwglasses/nexs-server";

// Create app

const app = nexs({ dev: config.dev });

app.next.prepare().then(async () => {
  const io = app.io;
  io.on("connect", (socket) => {
    const session = socket.handshake.session!;
    notify(io, `/api/socket-count#${session.id}`);
    socket.on("disconnect", () => {
      notify(io, `/api/socket-count#${session.id}`);
    });
  });

  // Start the server
  app.server.listen(config.server.port, () => {
    console.log(
      `> Ready on http://${config.server.host}:${config.server.port}`
    );
  });
});
