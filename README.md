# 🎙️ Voice RAG Assistant

A voice-based Retrieval-Augmented Generation (RAG) assistant built with NestJS that provides intelligent customer support for order and return-related queries. The application uses speech-to-text, vector search, and text-to-speech to create a conversational AI experience.

## ✨ Features

- **Voice Interface**: Record audio queries using your microphone
- **Speech-to-Text**: Convert voice input to text using Google Gemini AI
- **Vector Search**: Semantic search through FAQ documents using Pinecone vector database
- **Text-to-Speech**: Generate natural-sounding audio responses, again using Gemini AI
- **Real-time Processing**: Stream audio and get instant responses
- **Monitoring**: Built-in Prometheus metrics for performance tracking

## 🏗️ Architecture

The application follows a modular NestJS architecture with the following key components:

### Core Modules

- **AI Module** (`src/ai/`): Handles all AI operations including embeddings, speech-to-text, and text-to-speech
- **Query Module** (`src/query/`): Processes user queries and orchestrates the RAG pipeline
- **Vector DB Module** (`src/vector-db/`): Manages vector database operations with Pinecone
- **Metrics Module** (`src/metrics/`): Provides monitoring and observability

### Technology Stack

- **Backend**: NestJS with TypeScript
- **AI Services**: Google Gemini AI
- **Vector Database**: Pinecone
- **Frontend**: Vanilla JavaScript with modern web APIs
- **Monitoring**: Prometheus metrics
- **Audio Processing**: Web Audio API, MediaRecorder

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Pinecone account and API key
- Google AI API key (Gemini)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd voice-rag-assistant
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   GEMINI_KEY=your_gemini_api_key
   PINE_CODE_API_KEY=your_pinecone_api_key
   PINE_CODE_INDEX_HOST=your_pinecone_index_host
   PORT=3000
   ```

4. **Start the application**

   ```bash
   # Development
   npm run start:dev

   # Production
   npm run start:prod
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📊 Data Ingestion

The application includes FAQ documents for order and return-related queries. To ingest your own data:

1. **Prepare your documents**: Place markdown files in the `public/faq/` directory
2. **Run the ingestion script**:
   ```bash
   node scripts/ingestVector.js
   ```

The script will:

- Read all markdown files from the FAQ directory
- Generate embeddings using Gemini AI
- Store vectors in your Pinecone index

## 🎯 Usage

### Web Interface

1. **Start Recording**: Click the microphone button to begin recording
2. **Speak Your Query**: Ask questions about orders, returns, or any FAQ-related topics
3. **Stop Recording**: Click the microphone again to stop and process
4. **Listen to Response**: The assistant will provide an audio response based on the FAQ content

### API Endpoints

- **POST `/query`**: Submit audio file for processing
  - Content-Type: `multipart/form-data`
  - Field: `audio` (audio file)
  - Response: JSON with `audioBuffer`, `userQuery`, and `llmResponse`

- **GET `/metrics`**: Prometheus metrics endpoint

## 🔧 Configuration

### Environment Variables

| Variable               | Description                  | Required |
| ---------------------- | ---------------------------- | -------- |
| `GEMINI_KEY`           | Google AI API key for Gemini | Yes      |
| `PINE_CODE_API_KEY`    | Pinecone API key             | Yes      |
| `PINE_CODE_INDEX_HOST` | Pinecone index host URL      | Yes      |
| `PORT`                 | Server port (default: 3000)  | No       |

### AI Model Configuration

The application uses:

- **Embeddings**: `gemini-embedding-001`
- **LLM**: `gemini-2.5-flash`
- **TTS**: `gemini-2.5-flash-preview-tts` with "Kore" voice

## 📈 Monitoring

The application includes comprehensive monitoring:

- **HTTP Request Metrics**: Duration, status codes, routes
- **Function Performance**: AI service operation timing
- **Vector DB Operations**: Query performance tracking

Access metrics at `/metrics` endpoint in Prometheus format.
