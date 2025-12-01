import { useState, useEffect, useRef } from 'react';

export function useVoiceRecorder(socket, roomId, active) {
    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (active) {
            startRecording();
        } else {
            stopRecording();
        }

        return () => {
            stopRecording();
        };
    }, [active, roomId, socket]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setIsRecording(true);

            const recordChunk = () => {
                if (!stream.active) return;

                const recorder = new MediaRecorder(stream);
                recorderRef.current = recorder;

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    if (chunks.length > 0) {
                        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = () => {
                            if (socket && socket.connected) {
                                socket.emit('voiceData', { roomId, data: reader.result });
                            }
                        };
                    }
                };

                recorder.start();

                // Stop and restart every 1 second to create standalone files
                intervalRef.current = setTimeout(() => {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                        if (active) recordChunk(); // Recursive call to keep loop going
                    }
                }, 1000);
            };

            recordChunk();

        } catch (err) {
            console.error('Error accessing microphone:', err);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);

        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }

        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    return isRecording;
}
