class VoiceRAGAssistant {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isRecording = false;
    this.isProcessing = false;
    this.ttsEnabled = true;
    this.currentUtterance = null;
    this.mediaRecorder = null;
    this.audioChunks = [];

    // Metrics
    this.metrics = {
      totalQueries: 0,
      totalLatency: 0,
      successCount: 0,
      lastIntent: 'None',
    };

    // Sample FAQ knowledge base
    this.knowledgeBase = [
      {
        id: 'returns-1',
        category: 'returns',
        title: 'Return Policy',
        content:
          'You can return items within 30 days of purchase. Items must be in original condition with tags attached. Free return shipping is provided for defective items.',
        keywords: ['return', 'refund', 'exchange', 'policy', 'defective'],
      },
      {
        id: 'returns-2',
        category: 'returns',
        title: 'How to Return',
        content:
          'To return an item: 1) Log into your account, 2) Go to Order History, 3) Select the item to return, 4) Print the return label, 5) Package and ship the item back.',
        keywords: ['how to return', 'return process', 'return steps'],
      },
      {
        id: 'returns-3',
        category: 'returns',
        title: 'Return Timeframe',
        content:
          'Returns are processed within 5-7 business days after we receive your item. Refunds will appear on your original payment method within 3-5 business days.',
        keywords: ['return time', 'refund time', 'how long', 'processing time'],
      },
      {
        id: 'billing-1',
        category: 'billing',
        title: 'Shipping Costs',
        content:
          'Standard shipping is $5.99 for orders under $50. Free shipping on orders $50 and above. Express shipping is $12.99 regardless of order amount.',
        keywords: ['shipping', 'cost', 'price', 'delivery', 'fee'],
      },
      {
        id: 'billing-2',
        category: 'billing',
        title: 'Payment Methods',
        content:
          'We accept Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, and Google Pay. All transactions are secure and encrypted.',
        keywords: ['payment', 'credit card', 'paypal', 'billing', 'pay'],
      },
      {
        id: 'billing-3',
        category: 'billing',
        title: 'Billing Issues',
        content:
          'If you see an incorrect charge, please contact our billing department at billing@company.com or call 1-800-BILLING. Have your order number ready.',
        keywords: [
          'billing issue',
          'wrong charge',
          'incorrect charge',
          'dispute',
        ],
      },
      {
        id: 'product-1',
        category: 'product',
        title: 'Product Warranty',
        content:
          'All products come with a 1-year manufacturer warranty. Electronics have an additional 2-year extended warranty option available at checkout.',
        keywords: ['warranty', 'guarantee', 'protection', 'coverage'],
      },
      {
        id: 'product-2',
        category: 'product',
        title: 'Product Information',
        content:
          'Detailed product specifications, reviews, and comparison charts are available on each product page. You can also chat with our product specialists.',
        keywords: ['product info', 'specifications', 'details', 'features'],
      },
    ];

    this.initializeElements();
    this.setupEventListeners();
    this.registerMediaRecorder();
    this.initializeSpeechRecognition();
  }

  initializeElements() {
    this.micButton = document.getElementById('micButton');
    this.status = document.getElementById('status');
    this.transcript = document.getElementById('transcript');
    this.transcriptContent = document.getElementById('transcriptContent');
    this.response = document.getElementById('response');
    this.responseContent = document.getElementById('responseContent');
    this.citation = document.getElementById('citation');
    this.error = document.getElementById('error');
    this.loading = document.getElementById('loading');
    this.conversationHistory = document.getElementById('conversationHistory');

    // Metrics elements
    this.totalQueriesEl = document.getElementById('totalQueries');
    this.avgLatencyEl = document.getElementById('avgLatency');
    this.successRateEl = document.getElementById('successRate');
    this.lastIntentEl = document.getElementById('lastIntent');
  }

  setupEventListeners() {
    this.micButton.addEventListener('click', () => this.toggleRecording());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        this.toggleRecording();
      }
    });
  }

  initializeSpeechRecognition() {
    if (
      !('webkitSpeechRecognition' in window) &&
      !('SpeechRecognition' in window)
    ) {
      this.showError(
        'Speech recognition not supported in this browser. Please use Chrome or Edge.',
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.updateUI();
    };

    this.recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        this.handleUserInput(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      this.showError(`Speech recognition error: ${event.error}`);
      this.isRecording = false;
      this.isProcessing = false;
      this.updateUI();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (!this.isProcessing) {
        this.updateUI();
      }
    };
  }

  async registerMediaRecorder() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);

    this.mediaRecorder.onstart = () => {
      this.isRecording = true;
      this.updateUI();
    };

    function base64ToWav(base64, sampleRate = 24000, numChannels = 1) {
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

    this.mediaRecorder.onstop = async () => {
      this.isRecording = false;
      this.updateUI();

      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // send to backend
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
        .then(async ({ audioBuffer: base64 }) => {
          const wavBlob = base64ToWav(base64);
          const url = URL.createObjectURL(wavBlob);
          const audio = new Audio(url);
          audio.play();
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

  async handleUserInput(userText) {
    if (!userText.trim()) return;

    this.isProcessing = true;
    this.updateUI();
    this.showLoading(true);

    const startTime = Date.now();

    try {
      // Display user input
      this.displayTranscript(userText);

      // Process with RAG pipeline
      const response = await this.processWithRAG(userText);

      // Display response
      this.displayResponse(response.answer, response.citation);

      // Add to conversation history
      this.addToHistory(userText, response.answer, response.citation);

      // Speak response if TTS is enabled
      if (this.ttsEnabled) {
        this.speak(response.answer);
      }

      // Update metrics
      const latency = Date.now() - startTime;
    } catch (error) {
      this.showError(`Error processing request: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.updateUI();
      this.showLoading(false);
    }
  }

  async processWithRAG(query) {
    await this.sleep(800);

    // Intent classification
    const intent = this.classifyIntent(query);

    // Retrieve relevant documents
    const relevantDocs = this.retrieveRelevantDocs(query, intent);

    // Generate response based on intent
    let response;
    if (intent === 'order_status') {
      response = await this.handleOrderStatus(query);
    } else {
      response = this.generateRAGResponse(query, relevantDocs, intent);
    }

    return {
      answer: response.answer,
      citation: response.citation,
      intent: intent,
    };
  }

  classifyIntent(query) {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes('order') &&
      (lowerQuery.includes('status') ||
        lowerQuery.includes('track') ||
        lowerQuery.includes('where'))
    ) {
      return 'order_status';
    } else if (
      lowerQuery.includes('return') ||
      lowerQuery.includes('refund') ||
      lowerQuery.includes('exchange')
    ) {
      return 'returns';
    } else if (
      lowerQuery.includes('billing') ||
      lowerQuery.includes('payment') ||
      lowerQuery.includes('charge') ||
      lowerQuery.includes('shipping') ||
      lowerQuery.includes('cost')
    ) {
      return 'billing';
    } else if (
      lowerQuery.includes('product') ||
      lowerQuery.includes('warranty') ||
      lowerQuery.includes('specification')
    ) {
      return 'product';
    } else {
      return 'general';
    }
  }

  retrieveRelevantDocs(query, intent) {
    const lowerQuery = query.toLowerCase();

    // Score documents based on keyword matching and category
    const scoredDocs = this.knowledgeBase.map((doc) => {
      let score = 0;

      // Category match bonus
      if (doc.category === intent) {
        score += 10;
      }

      // Keyword matching
      doc.keywords.forEach((keyword) => {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          score += 5;
        }
      });

      // Content matching
      const contentWords = doc.content.toLowerCase().split(/\s+/);
      const queryWords = lowerQuery.split(/\s+/);

      queryWords.forEach((queryWord) => {
        if (
          contentWords.some(
            (contentWord) =>
              contentWord.includes(queryWord) ||
              queryWord.includes(contentWord),
          )
        ) {
          score += 1;
        }
      });

      return { ...doc, score };
    });

    // Return top 3 most relevant documents
    return scoredDocs
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  generateRAGResponse(query, relevantDocs, intent) {
    if (relevantDocs.length === 0) {
      return {
        answer:
          "I don't have specific information about that topic. Please contact our customer service team for personalized assistance at support@company.com or call 1-800-SUPPORT.",
        citation: '(General support information)',
      };
    }

    const bestDoc = relevantDocs[0];
    let answer = bestDoc.content;

    // Customize response based on intent and query
    const lowerQuery = query.toLowerCase();

    if (intent === 'returns') {
      if (lowerQuery.includes('how') || lowerQuery.includes('process')) {
        // Find the how-to doc if available
        const howToDoc = relevantDocs.find(
          (doc) => doc.id.includes('how') || doc.content.includes('1)'),
        );
        if (howToDoc) {
          answer = howToDoc.content;
        }
      }
    } else if (intent === 'billing') {
      if (
        lowerQuery.includes('cost') ||
        lowerQuery.includes('price') ||
        lowerQuery.includes('shipping')
      ) {
        const costDoc = relevantDocs.find(
          (doc) => doc.content.includes('$') || doc.content.includes('cost'),
        );
        if (costDoc) {
          answer = costDoc.content;
        }
      }
    }

    return {
      answer: answer,
      citation: `(from ${bestDoc.title})`,
    };
  }

  async handleOrderStatus(query) {
    // Mock order status API
    await this.sleep(500);

    const orderStatuses = [
      'Your order #12345 is currently being processed and will ship within 1-2 business days.',
      'Your order #67890 has shipped and is expected to arrive tomorrow by 8 PM.',
      'Your order #54321 was delivered yesterday at 3:45 PM to your front door.',
      'Your order #98765 is out for delivery and will arrive today between 2-6 PM.',
    ];

    const randomStatus =
      orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

    return {
      answer: randomStatus,
      citation: '(from Order Management System)',
    };
  }

  displayTranscript(text) {
    this.transcriptContent.textContent = text;
    this.transcript.style.display = 'block';
  }

  displayResponse(answer, citation) {
    this.responseContent.textContent = answer;
    this.citation.textContent = citation;
    this.response.style.display = 'block';
  }

  addToHistory(userText, assistantResponse, citation) {
    const historyItem = document.createElement('div');
    historyItem.className = 'conversation-item';
    historyItem.innerHTML = `
                    <div class="user-message">
                        <strong>You:</strong> ${userText}
                    </div>
                    <div class="assistant-message">
                        <strong>Assistant:</strong> ${assistantResponse}
                        <br><small style="color: #666; font-style: italic;">${citation}</small>
                    </div>
                `;
    this.conversationHistory.insertBefore(
      historyItem,
      this.conversationHistory.firstChild,
    );
  }

  speak(text) {
    if (this.currentUtterance) {
      this.synthesis.cancel();
    }

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = 0.9;
    this.currentUtterance.pitch = 1;
    this.currentUtterance.volume = 0.8;

    this.synthesis.speak(this.currentUtterance);
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
  }

  showLoading(show) {
    this.loading.style.display = show ? 'block' : 'none';
  }

  showError(message) {
    this.error.textContent = message;
    this.error.style.display = 'block';
  }

  hideError() {
    this.error.style.display = 'none';
  }

  clearHistory() {
    this.conversationHistory.innerHTML = '';
    this.transcript.style.display = 'none';
    this.response.style.display = 'none';
    this.hideError();
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
