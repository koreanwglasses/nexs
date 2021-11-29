import React, { createContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { NEXSSocket, nexssocket } from "@koreanwglasses/nexs-core";

export const SocketIOContext = createContext<NEXSSocket | undefined>(undefined);

const SocketProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [socket, setSocket] = useState<NEXSSocket | undefined>();

  useEffect(() => {
    const socket = nexssocket(io());
    setSocket(socket);

    socket.on("disconnect", () => {
      setSocket(undefined);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketIOContext.Provider value={socket}>
      {children}
    </SocketIOContext.Provider>
  );
};

export default SocketProvider;
