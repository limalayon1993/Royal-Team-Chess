export class AudioQueue {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.nextStartTime = 0;
    }

    async add(base64Data) {
        try {
            // Resume context if suspended (browser policy)
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            const response = await fetch(base64Data);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

            const source = this.ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.ctx.destination);

            // Schedule playback
            // If nextStartTime is in the past (we are lagging), play immediately
            // If nextStartTime is in the future (we are buffering), wait for it
            const currentTime = this.ctx.currentTime;

            // Drift correction: If we are more than 0.5s behind, jump to now
            // This prevents "increasing lag" at the cost of skipping a tiny bit if we fell way behind
            if (this.nextStartTime < currentTime) {
                this.nextStartTime = currentTime;
            }

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;

        } catch (err) {
            console.error('Error processing audio chunk:', err);
        }
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    clear() {
        // We can't easily stop scheduled nodes without tracking them all, 
        // but closing/suspending the context is one way, or just resetting nextStartTime.
        // For simplicity, we just reset the time.
        this.nextStartTime = 0;
        // Ideally we would stop active sources, but for voice chat, 
        // letting the last chunk finish is usually fine.
    }
}
