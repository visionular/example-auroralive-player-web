var $enQVi$events = require("events");

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "AuroraLivePlayer", () => $993e264ec8d12465$export$6e0469b79c1dcece);

const $993e264ec8d12465$var$DEFAULT_CONNECT_TIMEOUT = 2000;
const $993e264ec8d12465$var$RECONNECT_ATTEMPTS = 2;
class $993e264ec8d12465$export$6e0469b79c1dcece extends (0, $enQVi$events.EventEmitter) {
    videoElement;
    peer = {};
    iceServers;
    debug;
    url = {};
    reconnectAttemptsLeft = $993e264ec8d12465$var$RECONNECT_ATTEMPTS;
    statsInterval;
    statsTypeFilter = undefined;
    msStatsInterval = 1000;
    mediaTimeoutOccured = false;
    mediaTimeoutThreshold = 30000;
    timeoutThresholdCounter = 0;
    bytesReceived = 0;
    iceGatheringTimeoutT;
    waitingForCandidates = false;
    _resource = null;
    played = false;
    log;
    _remoteAddr = "";
    _inBoundRtp;
    token = "";
    callbacks;
    _videoLayersString = null;
    _videoLayersInfo;
    constructor(opts){
        super();
        this.videoElement = opts.video;
        this.statsTypeFilter = opts.statsTypeFilter;
        this.mediaTimeoutThreshold = opts.timeoutThreshold ?? this.mediaTimeoutThreshold;
        this.reconnectAttemptsLeft = opts.retry ?? 0;
        this.iceServers = [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ];
        if (opts.iceServers) this.iceServers = opts.iceServers;
        this.debug = !!opts.debug;
        if (this.debug) this.log = console.log.bind(window.console, "[AuroraLive-player]");
        else this.log = function() {};
        this.callbacks = opts.callbacks;
    }
    getInBoundRtp(results) {
        let ret;
        results.forEach((report)=>{
            if (report.type === "inbound-rtp" && report.mediaType === "video") ret = report;
        });
        return ret;
    }
    getRemoteAddr(results) {
        let remoteAddr = "";
        // figure out the peer's ip
        let activeCandidatePair = [];
        let remoteCandidate = null;
        // Search for the candidate pair, spec-way first.
        results.forEach((report)=>{
            if (report.type === "transport") activeCandidatePair = results.get(report.selectedCandidatePairId);
        });
        // Fallback for Firefox.
        if (!activeCandidatePair) results.forEach((report)=>{
            if (report.type === "candidate-pair" && report.selected) activeCandidatePair = report;
        });
        if (activeCandidatePair && activeCandidatePair.remoteCandidateId) remoteCandidate = results.get(activeCandidatePair.remoteCandidateId);
        if (remoteCandidate) {
            if (remoteCandidate.address && remoteCandidate.port) remoteAddr = `${remoteCandidate.address}:${remoteCandidate.port}`;
            else if (remoteCandidate.ip && remoteCandidate.port) remoteAddr = `${remoteCandidate.ip}:${remoteCandidate.port}`;
            else if (remoteCandidate.ipAddress && remoteCandidate.portNumber) // Fall back to old names.
            remoteAddr = `${remoteCandidate.ipAddress}:${remoteCandidate.portNumber}`;
        }
        return remoteAddr;
    }
    get remoteAddr() {
        return this._remoteAddr;
    }
    get inBoundRtp() {
        return this._inBoundRtp;
    }
    get resource() {
        return this._resource ?? "";
    }
    async load(url, token) {
        if (url.href.length == 0) {
            if (this.callbacks) this.callbacks.onPlayerError("playback id is empty");
            return;
        }
        this.url = url;
        this.token = token;
        this.connect();
    }
    async layer(l) {
        const response = await fetch(this._resource + "/layer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mediaId: "0",
                encodingId: l
            })
        });
        if (!response.ok) {
            this.error(`layer response status: ${response.status}`);
            if (this.callbacks?.onSwitchLayerFailed) this.callbacks.onSwitchLayerFailed(`switch layer error. ${response.status}`);
        } else if (this.callbacks?.onSwitchLayerSuccess) this.callbacks.onSwitchLayerSuccess();
    }
    mute() {
        this.videoElement.muted = true;
    }
    unmute() {
        this.videoElement.muted = false;
    }
    stop() {
        this.log("Stopped");
        clearInterval(this.statsInterval);
        this.peer.close();
        this.peer = null;
        this.videoElement.srcObject = null;
        this.videoElement.load();
    }
    // destroy() {
    //   this.stop();
    //   // this.removeAllListeners();
    // }
    error(...args) {
        console.error("[AuroraLive-player]", ...args);
    }
    // private onErrorHandler(error: string) {
    //   this.log(`onError=${error}`);
    //   switch (error) {
    //     case 'reconnectneeded':
    //       this.peer && this.peer.close();
    //       this.videoElement.srcObject = null;
    //       this.setupPeer();
    //       this.resetPeer(this.peer);
    //       this.connect();
    //       break;
    //   }
    // }
    // private resetPeer(newPeer: RTCPeerConnection) {
    //   this.peer = newPeer;
    //   this.peer.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this);
    //   this.peer.onicecandidate = this.onIceCandidate.bind(this);
    // }
    async onConnectionStats() {
        if (this.peer && this.statsTypeFilter) {
            // let bytesReceivedBlock = 0;
            const results = await this.peer.getStats(null);
            results.forEach((report)=>{
                if (report.type.match(this.statsTypeFilter)) this.emit(`stats:${report.type}`, report);
            //inbound-rtp attribute bytesReceived from stats report will contain the total number of bytes received for this SSRC.
            //In this case there are several SSRCs. They are all added together in each onConnectionStats iteration and compared to their value during the previous iteration.
            // if (report.type.match('inbound-rtp')) {
            //   bytesReceivedBlock += report.bytesReceived;
            // }
            });
            this._remoteAddr = this.getRemoteAddr(results);
            const inboundRtp = this.getInBoundRtp(results);
            if (inboundRtp != null) this._inBoundRtp = inboundRtp;
        // if (bytesReceivedBlock <= this.bytesReceived) {
        //   this.timeoutThresholdCounter += this.msStatsInterval;
        //
        //   if (
        //     this.mediaTimeoutOccured === false &&
        //     this.timeoutThresholdCounter >= this.mediaTimeoutThreshold
        //   ) {
        //     // this.emit(Message.NO_MEDIA);
        //     this.mediaTimeoutOccured = true;
        //   }
        // } else {
        //   this.bytesReceived = bytesReceivedBlock;
        //   this.timeoutThresholdCounter = 0;
        //
        //   if (this.mediaTimeoutOccured == true) {
        //     // this.emit(Message.MEDIA_RECOVERED);
        //     this.mediaTimeoutOccured = false;
        //   }
        // }
        }
    }
    async connect() {
        this.setupPeer();
        this.statsInterval = setInterval(this.onConnectionStats.bind(this), this.msStatsInterval);
        await this.initSdpExchange();
    }
    setupPeer() {
        if (this.played && this.peer) this.stop();
        this.peer = new RTCPeerConnection({
            iceServers: this.iceServers
        });
        this.peer.onconnectionstatechange = this.onConnectionStateChange.bind(this);
        this.peer.ontrack = this.onTrack.bind(this);
        this.peer.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this);
        this.peer.onicecandidate = this.onIceCandidate.bind(this);
        this.played = true;
    }
    async initSdpExchange() {
        if (this.peer) {
            clearTimeout(this.iceGatheringTimeoutT);
            this.peer.addTransceiver("video", {
                direction: "recvonly"
            });
            // if (this.audio)
            this.peer.addTransceiver("audio", {
                direction: "recvonly"
            });
            const offer = await this.peer.createOffer();
            await this.peer.setLocalDescription(offer);
            this.waitingForCandidates = true;
            this.iceGatheringTimeoutT = setTimeout(this.iceGatheringTimeout.bind(this), $993e264ec8d12465$var$DEFAULT_CONNECT_TIMEOUT);
        // await this.sendOffer();
        }
    }
    async sendOffer() {
        if (!this.peer) {
            this.log("Local RTC peer not initialized");
            return;
        }
        const offer = this.peer.localDescription;
        if (!offer) {
            this.error("offer nil");
            if (this.callbacks) this.callbacks.onPlayerError("offer nil");
            return;
        }
        this.log(`sending offer ${offer.sdp}`);
        const header = new Headers();
        header.set("Content-Type", "application/sdp");
        if (this.token.length > 0) header.set("Authorization", "Bearer " + this.token);
        const response = await fetch(this.url.href, {
            method: "POST",
            headers: header,
            body: offer.sdp
        });
        if (response.ok) {
            this._resource = response.headers.get("Location");
            this._videoLayersString = response.headers.get("X-WZ-Rtc-Layer");
            this.log("WHEP Resource", this._resource);
            this.log("Video Layers Info", this._videoLayersString);
            if (this._videoLayersString) this._videoLayersInfo = JSON.parse(this._videoLayersString);
            const answer = await response.text();
            // TODO: check sdp
            try {
                await this.peer.setRemoteDescription({
                    type: "answer",
                    sdp: answer
                });
                if (this.callbacks && this._videoLayersInfo) this.callbacks.onPlaybackSuccess({
                    videoLayersInfo: this._videoLayersInfo
                });
            } catch (e) {
                if (e instanceof Error) {
                    this.error(`setRemoteDescription failed: ${e.message}`);
                    if (this.callbacks) this.callbacks.onPlayerError(`setRemoteDescription failed: ${e.message}`);
                }
                this.stop();
            }
            // } else if (response.status === 400) {
            //   this.log(`sendAnswer response 400`);
            // } else if (response.status === 406 && this.audio) {
            //   this.log(`return 406`);
            this.log(`Got answer: ${answer}`);
        } else {
            this.error(`sendAnswer response: ${response.status}`);
            if (this.callbacks) this.callbacks.onPlayerError(`sendAnswer response: ${response.status}`);
        }
    }
    iceGatheringTimeout() {
        this.log("IceGatheringTimeout");
        if (!this.waitingForCandidates) return;
        this.onDoneWaitingForCandidates();
    }
    onIceGatheringStateChange(event) {
        this.log(`onIceGatheringStateChange`);
        this.log(event);
        if (!this.peer) return;
        this.log("IceGatheringState", this.peer.iceGatheringState);
        if (this.peer.iceGatheringState !== "complete" || !this.waitingForCandidates) return;
        this.onDoneWaitingForCandidates();
    }
    async onDoneWaitingForCandidates() {
        this.waitingForCandidates = false;
        clearTimeout(this.iceGatheringTimeoutT);
        await this.sendOffer();
    }
    async onConnectionStateChange() {
        this.log(`onConnectionStateChange ${this.peer.connectionState}`);
        if (this.peer.connectionState === "failed") {
            // this.emit(Message.PEER_CONNECTION_FAILED);
            this.peer && this.peer.close();
            if (this.reconnectAttemptsLeft <= 0) {
                this.error("Connection failed, reconnecting failed");
                return;
            }
            this.log(`Connection failed, recreating peer connection, attempts left ${this.reconnectAttemptsLeft}`);
            await this.connect();
            this.reconnectAttemptsLeft--;
        } else if (this.peer.connectionState === "connected") {
            this.log("Connected");
            this.reconnectAttemptsLeft = $993e264ec8d12465$var$RECONNECT_ATTEMPTS;
        }
    }
    onTrack(event) {
        console.log(`onTrack`);
        this.log(event);
        for (const stream of event.streams){
            console.log("Set video element remote stream to " + stream.id, " audio " + stream.getAudioTracks().length + " video " + stream.getVideoTracks().length);
            if (this.videoElement.srcObject) {
                for (const track of stream.getTracks())this.videoElement.srcObject.addTrack(track);
                continue;
            }
            this.videoElement.srcObject = stream;
        }
    }
    async onIceCandidate(event) {
        this.log(`onIceCandidate`);
        this.log(event);
        if (event.type !== "icecandidate") return;
        const candidateEvent = event;
        const candidate = candidateEvent.candidate;
        if (!candidate) return;
    }
}


//# sourceMappingURL=auroralive-player.js.map
