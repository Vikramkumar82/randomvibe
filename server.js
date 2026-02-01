const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;
let onlineUsers = 0;

io.on("connection", socket => {
  onlineUsers++;
  io.emit("count", onlineUsers);
  console.log("User connected");

  // MATCHING
  if (waitingUser) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit("match", { initiator: true });
    waitingUser.emit("match", { initiator: false });

    waitingUser = null;
  } else {
    waitingUser = socket;
  }

  // SIGNAL RELAY (WebRTC)
  socket.on("signal", data => {
    if (socket.partner) {
      socket.partner.emit("signal", data);
    }
  });

  // CHAT MESSAGE
  socket.on("message", msg => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  // TYPING
  socket.on("typing", () => {
    if (socket.partner) {
      socket.partner.emit("typing");
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("count", onlineUsers);

    if (socket.partner) {
      socket.partner.emit("leave");
      socket.partner.partner = null;
    }

    if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

http.listen(3000, () => {
  console.log("✅ RandomVibe running on http://localhost:3000");
});
