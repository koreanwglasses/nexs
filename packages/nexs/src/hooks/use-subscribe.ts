import useSWR from "swr";
import { get, joinQuery } from "@koreanwglasses/nexs-core";
import { useSocket } from "./use-socket";
import { useEffect } from "react";

export function useSubscribe<T = any>(
  url: string,
  query: Record<string, any> = {}
) {
  const fullUrl = joinQuery(url, query);
  const result = useSWR<T>(fullUrl, get);

  const socket = useSocket();
  useEffect(() => {
    const subscription = socket?.subscribe(url, query, (data: T) =>
      result.mutate(data)
    );
    return () => {
      subscription?.unsub();
    };
  }, [socket]);

  return result;
}
