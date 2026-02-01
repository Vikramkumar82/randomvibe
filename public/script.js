const socket = io();

const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const msgInput = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");
const typingText = document.getElementById("typing");
const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");

let pc;
let localStream;

// START CAMERA
async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit("signal", { candidate: e.candidate });
    }
  };
}

start();

// MATCH
socket.on("match", async ({ initiator }) => {
  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { offer });
  }
});

// SIGNAL
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

// CHAT
sendBtn.onclick = () => {
  if (!msgInput.value) return;
  socket.emit("message", msgInput.value);
  chat.innerHTML += `<p><b>You:</b> ${msgInput.value}</p>`;
  msgInput.value = "";
};

socket.on("message", msg => {
  chat.innerHTML += `<p><b>Stranger:</b> ${msg}</p>`;
});

// TYPING
msgInput.oninput = () => socket.emit("typing");

socket.on("typing", () => {
  typingText.innerText = "Stranger is typing...";
  setTimeout(() => (typingText.innerText = ""), 800);
});

// MIC TOGGLE
micBtn.onclick = () => {
  const track = localStream.getAudioTracks()[0];
  track.enabled = !track.enabled;
  micBtn.innerText = track.enabled ? "🎤 Mute" : "🔇 Unmute";
};

// CAMERA TOGGLE
camBtn.onclick = () => {
  const track = localStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
  camBtn.innerText = track.enabled ? "📷 Camera Off" : "📸 Camera On";
};

// LEAVE
socket.on("leave", () => {
  remoteVideo.srcObject = null;
});
