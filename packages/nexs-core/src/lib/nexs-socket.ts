import { get, post } from "./fetchers";
import type { Socket as IOSocket } from "socket.io-client";

type Query = Record<string, string | number | boolean | undefined>;
type Listener<T> = (data: T) => any;

export interface Subscription {
  unsub(): void;
}

export interface NEXSSocket extends IOSocket {
  getSocketIdx(): Promise<number>;

  get<T = any>(url: string, query?: Query, init?: RequestInit): Promise<T>;
  post<T = any>(
    url: string,
    body?: any,
    query?: Query,
    init?: RequestInit
  ): Promise<T>;

  subscribe<T = any>(url: string, listener: Listener<T>): Subscription;
  subscribe<T = any>(
    url: string,
    query: Query,
    listener: Listener<T>
  ): Subscription;
}

export function nexssocket(iosocket: IOSocket) {
  const socketIdxPromise = new Promise<number>((res) =>
    iosocket.once("socket:linked", ({ socketIdx }) => res(socketIdx))
  );
  if (iosocket.connected) iosocket.emit("socket:link");

  const nexssocket = iosocket as NEXSSocket;

  nexssocket.getSocketIdx = () => socketIdxPromise;

  nexssocket.get = async <T>(
    url: string,
    query: Query = {},
    init?: RequestInit
  ) => await get<T>(url, { ...query, socketIdx: await socketIdxPromise }, init);

  nexssocket.post = async <T>(
    url: string,
    body?: any,
    query: Query = {},
    init?: RequestInit
  ) =>
    await post<T>(
      `${url}`,
      body,
      { ...query, socketIdx: await socketIdxPromise },
      init
    );

  const subscriptionListenerCount: Record<string, number> = {};
  nexssocket.subscribe = <T>(
    url: string,
    query_listener_?: Query | Listener<T>,
    listener_?: Listener<T>
  ) => {
    const query = (
      typeof query_listener_ !== "function" ? query_listener_ : {}
    ) as Query;

    const listener = (
      typeof query_listener_ === "function" ? query_listener_ : listener_
    ) as Listener<T>;

    const mutationListener = async (data?: T) => {
      if (typeof data !== "undefined") listener(data);
      else listener(await nexssocket.get(url, query));
    };

    const dataKeyPromise = (async () => {
      const response = await nexssocket.get(url, {
        ...query,
        subscribe: true,
      });

      if (
        !response ||
        !(typeof response === "object") ||
        !("data" in response) ||
        typeof response.dataKey !== "string"
      ) {
        throw new Error(
          `Expected a response with body of type { data: T, dataKey: string } from server. Got: ${JSON.stringify(
            response,
            null,
            2
          )}`
        );
      }

      const { data, dataKey } = response;

      subscriptionListenerCount[dataKey] ||= 0;
      subscriptionListenerCount[dataKey]++;

      listener(data);
      iosocket.on(`subscription:${dataKey}:mutate`, mutationListener);

      return dataKey;
    })();

    return {
      async unsub() {
        const dataKey = await dataKeyPromise;

        iosocket.off(`subscription:${dataKey}:mutate`, mutationListener);

        subscriptionListenerCount[dataKey] ||= 0;
        subscriptionListenerCount[dataKey]--;
        if (subscriptionListenerCount[dataKey] < 0)
          subscriptionListenerCount[dataKey] = 0;

        if (subscriptionListenerCount[dataKey] === 0)
          iosocket.emit(`subscription:unsub`, await dataKeyPromise);
      },
    };
  };

  return nexssocket;
}
