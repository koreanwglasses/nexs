import React, { createContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

export const SocketIOContext = createContext<{
  socket?: Socket;
  socketIdx?: number;
}>({});

const SocketProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [context, setContext] = useState<{
    socket?: Socket;
    socketIdx?: number;
  }>({});

  useEffect(() => {
    const socket = io();
    setContext({ socket });

    socket.on("socket:linked", ({ socketIdx }) => {
      setContext({ socket, socketIdx });
    });

    socket.on("disconnect", () => {
      setContext({});
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketIOContext.Provider value={context}>
      {children}
    </SocketIOContext.Provider>
  );
};

export default SocketProvider;
