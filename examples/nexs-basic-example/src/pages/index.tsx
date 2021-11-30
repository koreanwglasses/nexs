import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Typography,
} from "@mui/material";
import { useList, useAsync } from "react-use";
import { useSocket, useSubscribe } from "@koreanwglasses/nexs";

const Ping = () => {
  const [messages, { push }] = useList<string>();
  const [waiting, setWaiting] = useState<boolean>();
  const [error, setError] = useState<Error>();

  const { data } = useSubscribe<{ numSockets: number }>("/api/socket-count");
  const { numSockets } = data ?? {};

  const socket = useSocket(
    () => ({
      message: (message: string) => {
        push(message);
        setWaiting(false);
      },
    }),
    [push]
  );

  const { value: socketIdx } = useAsync(
    async () => await socket?.getSocketIdx(),
    [socket]
  );

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography>
        {data ? numSockets : <CircularProgress size={10} />} sockets linked to
        current session
      </Typography>
      <Typography>
        Current socketIdx: {socketIdx || <CircularProgress size={10} />}
      </Typography>
      <Collapse in={!!error}>
        <Alert severity="error">
          {error?.name}: {error?.message}
          <br />
          Try refreshing your browser
        </Alert>
      </Collapse>
      <Button
        disabled={waiting}
        variant="contained"
        onClick={async () => {
          try {
            // Make a post request and specify the return socket id
            await socket?.post("/api/ping");
            setWaiting(true);
          } catch (e) {
            setError(e as any);
          }
        }}
      >
        Ping
      </Button>
      {[...messages, ""].map((message, i) => (
        <Collapse key={i} in={message !== ""}>
          {message}
        </Collapse>
      ))}
      {waiting && <CircularProgress />}
    </Box>
  );
};

export default Ping;
