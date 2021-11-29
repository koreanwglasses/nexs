import { useContext, useEffect, useMemo } from "react";
import { SocketIOContext } from "../components/socket-provider";

export function useSocket(
  listeners_?: () => {
    [event: string]: (...args: any) => unknown;
  },
  deps?: unknown[]
) {
  const socket = useContext(SocketIOContext);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const listeners = useMemo(listeners_ ?? (() => undefined), deps);

  useEffect(() => {
    if (socket && listeners) {
      const eventHandlers = Object.entries(listeners) as [
        string,
        (...args: any) => unknown
      ][];

      eventHandlers.forEach(([event, handler]) => socket.on(event, handler));

      return () => {
        eventHandlers.map(([event, handler]) => socket.off(event, handler));
      };
    }
  }, [socket, listeners]);

  return socket;
}
