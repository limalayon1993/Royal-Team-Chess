export class AudioQueue {
    constructor() {
        this.queue = [];
        this.isPlaying = false;
    }

    add(base64Data) {
        // Convert base64 to blob/url for better performance than new Audio(base64) repeatedly
        fetch(base64Data)
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                this.queue.push(url);
                this.playNext();
            })
            .catch(err => console.error('Error processing audio data:', err));
    }

    playNext() {
        if (this.isPlaying || this.queue.length === 0) return;

        this.isPlaying = true;
        const url = this.queue.shift();
        const audio = new Audio(url);

        audio.onended = () => {
            this.isPlaying = false;
            URL.revokeObjectURL(url); // Cleanup memory
            this.playNext();
        };

        audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            this.isPlaying = false;
            URL.revokeObjectURL(url);
            this.playNext();
        };

        audio.play().catch(e => {
            console.error('Play failed (autoplay policy?):', e);
            this.isPlaying = false;
            URL.revokeObjectURL(url);
            // If autoplay blocked, maybe clear queue to prevent backlog?
            // For now, just try next.
            this.playNext();
        });
    }

    clear() {
        this.queue.forEach(url => URL.revokeObjectURL(url));
        this.queue = [];
        this.isPlaying = false;
    }
}
