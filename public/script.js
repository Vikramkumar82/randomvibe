document.addEventListener("DOMContentLoaded", () => {

  const socket = io();

  const statusText = document.getElementById("status");
  const localVideo = document.getElementById("local");
  const remoteVideo = document.getElementById("remote");
  const msgInput = document.getElementById("msg");
  const sendBtn = document.getElementById("sendBtn");
  const chat = document.getElementById("chat");
  const typingText = document.getElementById("typing");
  const micBtn = document.getElementById("micBtn");
  const camBtn = document.getElementById("camBtn");
  const nextBtn = document.getElementById("nextBtn");

  let pc;
  let localStream;
  let typingTimeout;

  // SAFETY CHECK
  if (!localVideo || !remoteVideo) {
    console.error("❌ Video elements missing");
    return;
  }

  // ======================
  // START CAMERA
  // ======================
  async function start() {
    localVideo.style.transform = "scaleX(-1)";

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localVideo.srcObject = localStream;

      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      localStream.getTracks().forEach(track =>
        pc.addTrack(track, localStream)
      );

      pc.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
      };

      pc.onicecandidate = e => {
        if (e.candidate) {
          socket.emit("signal", { candidate: e.candidate });
        }
      };

    } catch (err) {
      alert("❌ Camera / Mic permission denied");
      console.error(err);
    }
  }

  start();

  // ======================
  // MATCH
  // ======================
  socket.on("match", async ({ initiator }) => {
    if (statusText)
      statusText.innerText = "Status: Stranger connected ✅";

    if (initiator && pc) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("signal", { offer });
    }
  });

  // ======================
  // SIGNAL
  // ======================
  socket.on("signal", async data => {
    if (!pc) return;

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

  // ======================
  // CHAT
  // ======================
  if (sendBtn && msgInput) {
    sendBtn.onclick = () => {
      if (!msgInput.value.trim()) return;
      socket.emit("message", msgInput.value);
      chat.innerHTML += `<p><b>You:</b> ${msgInput.value}</p>`;
      msgInput.value = "";
    };
  }

  socket.on("message", msg => {
    chat.innerHTML += `<p><b>Stranger:</b> ${msg}</p>`;
  });

  // ======================
  // TYPING (PROPER DEBOUNCE)
  // ======================
  if (msgInput) {
    msgInput.oninput = () => {
      socket.emit("typing");
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        typingText.innerText = "";
      }, 900);
    };
  }

  socket.on("typing", () => {
    if (!typingText) return;
    typingText.innerText = "Stranger is typing...";
  });

  // ======================
  // MIC TOGGLE
  // ======================
  if (micBtn) {
    micBtn.onclick = () => {
      if (!localStream) return;
      const track = localStream.getAudioTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      micBtn.innerText = track.enabled ? "🎤 Mute" : "🔇 Unmute";
    };
  }

  // ======================
  // CAMERA TOGGLE
  // ======================
  if (camBtn) {
    camBtn.onclick = () => {
      if (!localStream) return;
      const track = localStream.getVideoTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      camBtn.innerText = track.enabled
        ? "📷 Camera Off"
        : "📸 Camera On";
    };
  }

  // ======================
  // NEXT / LEAVE
  // ======================
  if (nextBtn) {
    nextBtn.onclick = () => {
      socket.disconnect();
      location.reload();
    };
  }

  socket.on("leave", () => {
    if (statusText)
      statusText.innerText = "Status: Waiting for stranger...";
    remoteVideo.srcObject = null;
    if (chat) chat.innerHTML = "";
  });

});
