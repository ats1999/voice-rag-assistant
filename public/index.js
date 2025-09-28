class VoiceRAGAssistant {
  constructor() {
    this.isRecording = false;
    this.isProcessing = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audio = null;

    this.initializeElements();
    this.setupEventListeners();
    this.registerMediaRecorder();
  }

  initializeElements() {
    this.micButton = document.getElementById('micButton');
    this.status = document.getElementById('status');
    this.input = document.getElementById('input');
    this.output = document.getElementById('output');
  }

  setupEventListeners() {
    this.micButton.addEventListener('click', () => this.toggleRecording());
  }

  base64ToWav(base64, sampleRate = 24000, numChannels = 1) {
    const pcm = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const dataSize = pcm.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt subchunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // data subchunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM samples
    const wavData = new Uint8Array(buffer, 44);
    wavData.set(pcm);

    return new Blob([buffer], { type: 'audio/wav' });

    function writeString(view, offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }
  }

  async registerMediaRecorder() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);

    this.mediaRecorder.onstart = () => {
      this.isRecording = true;
      this.updateUI();
    };

    this.mediaRecorder.onstop = async () => {
      this.isRecording = false;
      this.updateUI();

      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      fetch('/query', { method: 'POST', body: formData })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status}: ${text}`);
          }
          return res.json();
        })
        .then(async ({ audioBuffer, userQuery, llmResponse }) => {
          this.userQuery = userQuery;
          this.llmResponse = llmResponse;

          this.updateUI();
          const wavBlob = this.base64ToWav(audioBuffer);
          const url = URL.createObjectURL(wavBlob);

          this.audio = new Audio(url);
          this.audio
            .play()
            ?.catch((err) => console.error('Playback error:', err));
        })
        .catch((e) => {
          alert(e.message);
        });
    };
  }

  startRecording() {
    this.mediaRecorder.start();
  }

  stopRecording() {
    this.mediaRecorder.stop();
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  updateUI() {
    if (this.isRecording) {
      this.micButton.className = 'mic-button recording';
      this.status.textContent = 'Listening... (Click to stop)';
    } else if (this.isProcessing) {
      this.micButton.className = 'mic-button processing';
      this.status.textContent = 'Processing your request...';
    } else {
      this.micButton.className = 'mic-button';
      this.status.textContent = 'Click the microphone to start';
    }

    if (this.userQuery) {
      this.input.innerText = this.userQuery;
    }

    if (this.llmResponse) {
      this.output.innerText = this.llmResponse;
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Initialize the assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.assistant = new VoiceRAGAssistant();
  console.log('Voice RAG Assistant initialized');
  console.log('Press Ctrl + Space to toggle recording');
});
