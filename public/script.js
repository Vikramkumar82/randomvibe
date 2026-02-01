document.addEventListener("DOMContentLoaded", () => {

const socket = io();

const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");
const typingText = document.getElementById("typing");
const statusText = document.getElementById("status");
const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");
const nextBtn = document.getElementById("nextBtn");

let pc;
let localStream;
let typingTimer;

// ================= START CAMERA =================
async function start() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = stream;
  localVideo.style.transform = "scaleX(-1)";
  localStream = stream;

  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ],
    iceCandidatePoolSize: 10
  });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
    remoteVideo.muted = false;
    remoteVideo.play().catch(()=>{});
    statusText.innerText = "🎥 Video & Audio connected";
  };

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("signal", { candidate: e.candidate });
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      pc.restartIce();
    }
  };
}

start();

// ================= MATCH =================
socket.on("match", async ({ initiator }) => {
  statusText.innerText = "Stranger connected ✅";
  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { offer });
  }
});

// ================= SIGNAL =================
socket.on("signal", async data => {
  if (data.offer) {
    await pc.setRemoteDescription(data.offer);
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    socket.emit("signal", { answer: ans });
  }
  if (data.answer) await pc.setRemoteDescription(data.answer);
  if (data.candidate) await pc.addIceCandidate(data.candidate);
});

// ================= CHAT =================
sendBtn.onclick = () => {
  if (!msgInput.value.trim()) return;
  socket.emit("message", msgInput.value);
  chat.innerHTML += `<p><b>You:</b> ${msgInput.value}</p>`;
  msgInput.value = "";
};

socket.on("message", msg => {
  chat.innerHTML += `<p><b>Stranger:</b> ${msg}</p>`;
});

// ================= TYPING =================
msgInput.oninput = () => {
  socket.emit("typing");
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => typingText.innerText="", 800);
};

socket.on("typing", () => {
  typingText.innerText = "Stranger is typing...";
});

// ================= MIC =================
micBtn.onclick = () => {
  const t = localStream.getAudioTracks()[0];
  t.enabled = !t.enabled;
  micBtn.innerText = t.enabled ? "🎤 Mute" : "🔇 Unmute";
};

// ================= CAMERA =================
camBtn.onclick = () => {
  const t = localStream.getVideoTracks()[0];
  t.enabled = !t.enabled;
  camBtn.innerText = t.enabled ? "📷 Camera Off" : "📸 Camera On";
};

// ================= NEXT =================
nextBtn.onclick = () => {
  socket.emit("leave");
  location.reload();
};

socket.on("leave", () => {
  statusText.innerText = "Waiting for stranger...";
  remoteVideo.srcObject = null;
  chat.innerHTML = "";
});

});
