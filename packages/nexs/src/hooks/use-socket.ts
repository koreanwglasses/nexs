import { useCallback, useContext, useEffect, useMemo } from "react";
import { get, post } from "@koreanwglasses/nexs-core";
import { SocketIOContext } from "../components/socket-provider";

export function useSocket(
  listeners_?: () => {
    [event: string]: (...args: any) => unknown;
  },
  deps?: unknown[]
) {
  const context = useContext(SocketIOContext);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const listeners = useMemo(listeners_ ?? (() => undefined), deps);

  useEffect(() => {
    if (context.socket && listeners) {
      const eventHandlers = Object.entries(listeners) as [
        string,
        (...args: any) => unknown
      ][];

      eventHandlers.forEach(([event, handler]) =>
        context.socket!.on(event, handler)
      );

      return () => {
        eventHandlers.map(([event, handler]) =>
          context.socket?.off(event, handler)
        );
      };
    }
  }, [context.socket, listeners]);

  return context.socket;
}

export function useSocketIdx() {
  const context = useContext(SocketIOContext);
  return context.socketIdx;
}

export function useSockPost() {
  const socketIdx = useSocketIdx();
  return useCallback(
    (
      url: string,
      body?: any,
      query: Record<string, string | number | boolean | undefined> = {}
    ) => post(`${url}`, body, { ...query, socketIdx }),
    [socketIdx]
  );
}

export function useSockGet() {
  const socketIdx = useSocketIdx();
  return useCallback(
    (
      url: string,
      query: Record<string, string | number | boolean | undefined> = {}
    ) => get(url, { ...query, socketIdx }),
    [socketIdx]
  );
}
