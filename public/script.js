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

  // ======================
  // START CAMERA (MIRRORED STREAM)
  // ======================
  async function start() {
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // hidden video
      const hiddenVideo = document.createElement("video");
      hiddenVideo.srcObject = rawStream;
      hiddenVideo.muted = true;
      hiddenVideo.play();

      // canvas mirror
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      hiddenVideo.onloadedmetadata = () => {
        canvas.width = hiddenVideo.videoWidth;
        canvas.height = hiddenVideo.videoHeight;

        function draw() {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(
            hiddenVideo,
            -canvas.width,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();
          requestAnimationFrame(draw);
        }
        draw();
      };

      const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
      const audioTrack = rawStream.getAudioTracks()[0];

      localStream = new MediaStream([videoTrack, audioTrack]);
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
  sendBtn.onclick = () => {
    if (!msgInput.value.trim()) return;
    socket.emit("message", msgInput.value);
    chat.innerHTML += `<p><b>You:</b> ${msgInput.value}</p>`;
    msgInput.value = "";
  };

  socket.on("message", msg => {
    chat.innerHTML += `<p><b>Stranger:</b> ${msg}</p>`;
  });

  // ======================
  // TYPING
  // ======================
  msgInput.oninput = () => {
    socket.emit("typing");
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      if (typingText) typingText.innerText = "";
    }, 800);
  };

  socket.on("typing", () => {
    if (typingText)
      typingText.innerText = "Stranger is typing...";
  });

  // ======================
  // MIC TOGGLE
  // ======================
  micBtn.onclick = () => {
    const track = localStream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    micBtn.innerText = track.enabled ? "🎤 Mute" : "🔇 Unmute";
  };

  // ======================
  // CAMERA TOGGLE
  // ======================
  camBtn.onclick = () => {
    const track = localStream.getVideoTracks()[0];
    track.enabled = !track.enabled;
    camBtn.innerText = track.enabled
      ? "📷 Camera Off"
      : "📸 Camera On";
  };

  // ======================
  // NEXT / LEAVE
  // ======================
  nextBtn.onclick = () => {
  if (statusText)
    statusText.innerText = "Status: Finding new stranger...";
  socket.emit("leave");
};


  socket.on("leave", () => {
    if (statusText)
      statusText.innerText = "Status: Waiting for stranger...";
    remoteVideo.srcObject = null;
    chat.innerHTML = "";
  });

});
