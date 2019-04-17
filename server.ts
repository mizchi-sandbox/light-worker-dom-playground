import Io from "socket.io";
const io = Io.listen(8123);

io.on("connection", socket => {
  console.log("a user connected", socket.id);

  io.emit("connected");

  socket.on("sync:scroll", (scrollX: number) => {
    socket.broadcast.emit("synced:scroll", scrollX);
  });

  socket.on("guest-request-host-state", () => {
    socket.broadcast.emit("server-request-state-to-host");
  });

  socket.on("host-return-state", html => {
    socket.broadcast.emit("sync-html", html);
    console.log("server:synced");
  });

  socket.on("sub:send-event", event => {
    socket.broadcast.emit("server:broadcast-event", event);
  });

  socket.on("host-update-records", msg => {
    console.log("host-update-records", msg);
    let { serialized } = msg;
    socket.broadcast.emit("server-bloadcast-records", serialized);
  });
});
