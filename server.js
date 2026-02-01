const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {
    console.log("User connected");

    // ===== MATCHING =====
    if (waitingUser) {
        // waitingUser = initiator
        waitingUser.emit("match", { initiator: true });
        socket.emit("match", { initiator: false });

        waitingUser.partner = socket;
        socket.partner = waitingUser;

        waitingUser = null;
    } else {
        waitingUser = socket;
    }

    // ===== SIGNALING (WebRTC) =====
    socket.on("signal", data => {
        if (socket.partner) {
            socket.partner.emit("signal", data);
        }
    });

    // ===== CHAT =====
    socket.on("message", msg => {
        if (socket.partner) {
            socket.partner.emit("message", msg);
        }
    });

    // ===== DISCONNECT =====
    socket.on("disconnect", () => {
        console.log("User disconnected");

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
