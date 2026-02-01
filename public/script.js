const socket = io();

// ===== Elements =====
const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const nextBtn = document.getElementById("nextBtn");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");
const statusText = document.getElementById("status");

// ===== WebRTC =====
let pc;
let localStream;

// ===== Start Camera =====
async function start() {
    statusText.innerText = "Status: Requesting camera access...";

    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    localVideo.srcObject = localStream;

    pc = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
    ]
});


    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });

    pc.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("signal", { candidate: event.candidate });
        }
    };

    statusText.innerText = "Status: Waiting for stranger...";
}

start();

// ===== Matching =====
socket.on("match", async ({ initiator }) => {
    statusText.innerText = "Status: Stranger connected ✅";

    if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("signal", { offer });
    }
});

// ===== Signaling =====
socket.on("signal", async data => {
    if (data.offer) {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { answer });
    }

    if (data.answer) {
        await pc.setRemoteDescription(data.answer);
    }

    if (data.candidate) {
        await pc.addIceCandidate(data.candidate);
    }
});

// ===== Stranger Left =====
socket.on("leave", () => {
    statusText.innerText = "Status: Stranger disconnected ❌";
    remoteVideo.srcObject = null;
    chat.innerHTML += `<p><i>Stranger left the chat</i></p>`;
});

// ===== Next Button =====
nextBtn.onclick = () => {
    statusText.innerText = "Status: Finding new stranger...";

    if (pc) {
        pc.close();
        pc = null;
    }

    remoteVideo.srcObject = null;
    chat.innerHTML = "";

    socket.disconnect();

    setTimeout(() => {
        window.location.href = "/";
    }, 500);
};

// ===== Chat =====
sendBtn.onclick = () => {
    const text = msgInput.value.trim();
    if (!text) return;

    socket.emit("message", text);
    chat.innerHTML += `<p><b>You:</b> ${text}</p>`;
    msgInput.value = "";
};

socket.on("message", text => {
    chat.innerHTML += `<p><b>Stranger:</b> ${text}</p>`;
});
