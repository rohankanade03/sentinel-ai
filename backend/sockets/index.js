export function registerSockets(io) {
  io.on("connection", (socket) => {
    socket.on("admin:join", () => {
      socket.join("admin");
    });

    socket.on("ticket:join", (ticketId) => {
      if (ticketId) socket.join(`ticket:${ticketId}`);
    });

    socket.on("ticket:leave", (ticketId) => {
      if (ticketId) socket.leave(`ticket:${ticketId}`);
    });
  });
}
