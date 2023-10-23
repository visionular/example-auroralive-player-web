import { AuroraLivePlayer } from './auroralive-player';

interface PacketsLost {
  [type: string]: number;
}
const WHEP_URL =
  process.env.WHEP_URL || // "http://192.168.3.2:8800/whep/endpoint/lk"
  'https://stream.visionular.com/whep/endpoint/YTg0NjQ1ZWNhZmYxN2VmNjU5OTMyMjU0NmE3YzFkMzk';

let clientTimeMsElement: HTMLSpanElement | null;

function pad(v: number, n: number) {
  let r;
  for (r = v.toString(); r.length < n; r = 0 + r);
  return r;
}

function updateClientClock() {
  const now = new Date();
  const [h, m, s, ms] = [
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  ];
  const ts = `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
  if (clientTimeMsElement) {
    clientTimeMsElement.innerHTML = ts;
  }
}

function showToast(content: string, duration: number) {
  const toast = document.getElementById("Toast")
  if (toast == null) {
    const toast = document.createElement("div")
      toast.setAttribute("id", "Toast")
      toast.setAttribute("class", "toast-layout")
      document.body.insertBefore(toast, document.body.firstChild)
      showToast(content, duration)
      return
  }
  const toastItem = document.createElement("div")
  toastItem.setAttribute("class", "toast")
  toastItem.innerHTML = '<div class="content">' + content + '</div>'
  setTimeout(function () {
      toastItem.setAttribute('class', 'toast hide-toast')
  }, duration)
  toastItem.onanimationend = function () {
      toastItem.remove()
  }
  toast.appendChild(toastItem)

}

window.addEventListener('DOMContentLoaded', async () => {
  const input = document.querySelector<HTMLInputElement>('#url');
  const token = document.querySelector<HTMLInputElement>('#token');
  const video = document.querySelector('video');

  if (!input) {
    return;
  }

  const url = new URL(window.location.href).searchParams.get('url') || WHEP_URL;

  input.value = url;

  let iceServers: RTCIceServer[];

  if (process.env.ICE_SERVERS) {
    iceServers = [];
    process.env.ICE_SERVERS.split(',').forEach((server) => {
      // turn:<username>:<password>@visionular.com:3478
      const m = server.match(/^turn:\S+:(\S+)@(\S+):(\d+)/);
      if (m) {
        const [username, credential, host, port] = m;
        iceServers.push({
          urls: 'turn:' + host + ':' + port,
          username: username,
          credential: credential
        });
      }
    });
  }

  let player: AuroraLivePlayer;
  if (video) {
    player = new AuroraLivePlayer({
      video: video,
      iceServers: iceServers,
      debug: true,
      statsTypeFilter: '^candidate-*|^inbound-rtp',
      retry: 0,
      callbacks: {
        onPlayerError: (msg) => {
          showToast( msg, 2000);
        },
        onPlaybackSuccess: (streamInfo) => {
          showToast( 'playback success', 2000);
          const layerSelect = document.getElementById("layer-select");
          if (layerSelect != null) {
            layerSelect.options.length = 0;
            for (let i = 0; i < streamInfo.videoLayersInfo.layers.length; i++) {
              const newOption = document.createElement("OPTION");
              newOption.text = streamInfo.videoLayersInfo.layers[i].width + "x" + streamInfo.videoLayersInfo.layers[i].height;
              newOption.value = streamInfo.videoLayersInfo.layers[i].rid;
              layerSelect.options.add(newOption);
            }
            layerSelect.selectedIndex = streamInfo.videoLayersInfo.current;
            layerSelect.onchange = onLayerSelected;
          }
        },
        onSwitchLayerSuccess: () => {
          showToast( 'switch layer success', 2000);
        },
        onSwitchLayerFailed: (msg) => {
          showToast( msg, 2000);
        }
      }
    });
  }

  async function onLayerSelected() {
    const layerSelect = document.getElementById("layer-select");
    if (layerSelect != null) {
      console.log(`layer Select ${layerSelect.options[layerSelect.selectedIndex].value}`);
      await player.layer(layerSelect.options[layerSelect.selectedIndex].value);
    }
  }

  const playButton = document.querySelector<HTMLButtonElement>('#play');
  playButton?.addEventListener('click', async () => {
    const url = input.value;

    const packetsLost: PacketsLost = { video: 0, audio: 0 };

    player.on('stats:candidate-pair', (report) => {
      // console.log(report);
      const currentRTTElem =
        document.querySelector<HTMLSpanElement>('#stats-current-rtt');

      // const incomingBitrateElem = document.querySelector<HTMLSpanElement>(
      //   '#stats-incoming-bitrate'
      // );
      if (report.nominated && currentRTTElem) {
        currentRTTElem.innerHTML = `${report.currentRoundTripTime * 1000}ms`;
        // if (report.availableIncomingBitrate && incomingBitrateElem) {
        //   incomingBitrateElem.innerHTML = `Bitrate: ${Math.round(
        //     report.availableIncomingBitrate / 1000
        //   )}kbps`;
        // }
      }
    });

    timestampPrev = 0;

    player.on('stats:inbound-rtp', (report) => {
      if (report.kind === 'video' || report.kind === 'audio') {
        const packetLossElem =
          document.querySelector<HTMLSpanElement>('#stats-packetloss');
        packetsLost[report.kind] = report.packetsLost;
        if (packetLossElem) {
          packetLossElem.innerHTML = `A=${packetsLost.audio},V=${packetsLost.video}`;
        }
      }

      const bitrateElement =
        document.querySelector<HTMLSpanElement>('#bitrate');

      if (report.kind === 'video') {
        const now = report.timestamp;

        let bitrate;
        const bytes = report.bytesReceived;
        if (timestampPrev) {
          bitrate = (8 * (bytes - bytesPrev)) / (now - timestampPrev);
          bitrate = Math.floor(bitrate);
        }
        bytesPrev = bytes;
        timestampPrev = now;

        if (bitrate) {
          bitrate += ' kbits/sec';
          bitrateElement.innerHTML = `${bitrate}`;
        }
      }
    });

    await player.load(new URL(url), token.value);
  });

  clientTimeMsElement = document.querySelector<HTMLSpanElement>('#localTimeMs');
  window.setInterval(updateClientClock, 1);

  dimElement = document.querySelector<HTMLSpanElement>('#dimension');
  fpsElement = document.querySelector<HTMLSpanElement>('#fps');
  remoteAddrElement = document.querySelector<HTMLSpanElement>('#remote-addr');
  ptsElement = document.querySelector<HTMLSpanElement>('#pts');
  keyFramesDecodedElement = document.querySelector<HTMLSpanElement>(
    '#key-frames-decoded'
  );
  pliElement = document.querySelector<HTMLSpanElement>('#pliCount');
  packetsReceivedElement =
    document.querySelector<HTMLSpanElement>('#packetsReceived');
  ssrcElement = document.querySelector<HTMLSpanElement>('#ssrc');
  freezeElement = document.querySelector<HTMLSpanElement>('#freeze');
  nackElement = document.querySelector<HTMLSpanElement>('#nackCount');
  resourceElement = document.querySelector<HTMLSpanElement>('#resource');

  setInterval(() => {
    if (!video.paused) {
      dimElement.innerHTML = video.videoWidth + 'x' + video.videoHeight;
      remoteAddrElement.innerHTML = `${player.remoteAddr}`;
      ptsElement.innerHTML = `${
        player.inBoundRtp.lastPacketReceivedTimestamp
          ? player.inBoundRtp.lastPacketReceivedTimestamp.toLocaleString()
          : ''
      }`;
      keyFramesDecodedElement.innerHTML = `${player.inBoundRtp.keyFramesDecoded}`;
      pliElement.innerHTML = `${player.inBoundRtp.pliCount}`;
      packetsReceivedElement.innerHTML = `${player.inBoundRtp.packetsReceived}`;
      ssrcElement.innerHTML = `${player.inBoundRtp.ssrc}`;
      freezeElement.innerHTML = `${player.inBoundRtp.freezeCount} ${player.inBoundRtp.totalFreezesDuration}s`;
      nackElement.innerHTML = `${player.inBoundRtp.nackCount}`;
      resourceElement.innerHTML = `${player.resource}`;
    }
  }, 1000);

  let last_media_time, last_frame_num, fps;
  const fps_rounder = [];
  let frame_not_seeked = true;

  function ticker(useless, metadata) {
    const media_time_diff = Math.abs(metadata.mediaTime - last_media_time);
    const frame_num_diff = Math.abs(metadata.presentedFrames - last_frame_num);
    const diff = media_time_diff / frame_num_diff;
    if (
      diff &&
      diff < 1 &&
      frame_not_seeked &&
      fps_rounder.length < 50 &&
      video.playbackRate === 1 &&
      document.hasFocus()
    ) {
      fps_rounder.push(diff);
      fps = Math.round(1 / get_fps_average());
      fpsElement.textContent =
        fps + ', certainty: ' + fps_rounder.length * 2 + '%';
    }
    frame_not_seeked = true;
    last_media_time = metadata.mediaTime;
    last_frame_num = metadata.presentedFrames;
    video.requestVideoFrameCallback(ticker);
  }
  video.requestVideoFrameCallback(ticker);
  video.addEventListener('seeked', function () {
    fps_rounder.pop();
    frame_not_seeked = false;
  });

  function get_fps_average() {
    return fps_rounder.reduce((a, b) => a + b) / fps_rounder.length;
  }
});
