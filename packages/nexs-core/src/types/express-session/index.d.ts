import { Session } from "express-session";
import { Frame } from "../../lib/get-frame";

declare module "express-session" {
  interface Session {
    sockets: Record<number, string>;
    frames: Record<string, Frame>
  }
}
