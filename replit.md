# Overview

Psychology Pro is a web application designed for cognitive, psychological, and psychopathological profiling of text content. It acts as a passthrough system, leveraging multiple AI language models to provide comprehensive assessments, including real-time streaming analysis, multi-chunk text processing, and enhanced scoring calibration. The project aims to offer in-depth insights into human cognition and mental states through advanced AI analysis.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Technology Stack**: React SPA with TypeScript, Vite, shadcn/ui (Radix UI primitives), and Tailwind CSS.
- **State Management**: TanStack Query for server state and API caching.
- **Routing**: wouter library for client-side routing.
- **File Handling**: Supports TXT, DOC, and DOCX formats with custom parsing.
- **Text Processing**: Automatic chunking for uploaded files and pasted text (over 1000 words) with multi-chunk selection UI.

## Backend
- **Technology Stack**: Express.js server with TypeScript.
- **API**: RESTful API with middleware for logging and error handling.
- **File Uploads**: Multer middleware for multipart file uploads (10MB limit).
- **Real-time Communication**: Server-Sent Events (SSE) for streaming analysis progress.
- **Data Storage**: In-memory storage with an interface for future database migration.

## Data Storage Solutions
- **ORM**: Drizzle ORM configured for PostgreSQL with migration support.
- **Schema**: Entities for analysis and discussions, utilizing JSON for flexible result storage.

## Analysis Processing
- **Multi-LLM Integration**: Integrates four AI providers (OpenAI, Anthropic, DeepSeek, Perplexity) aliased as ZHI 1-4.
- **Batch Processing**: Questions are sent in batches of 5.
- **Streaming Service**: Real-time analysis with pause/resume functionality.
- **Discussion System**: Post-analysis dialogue for refining results.
- **Enhanced Scoring**: Calibrated LLM instructions clarify reference class as the entire human population to prevent artificially low scores.
- **Design Patterns**: Employs a Passthrough Architecture, Service Layer Pattern, Provider Abstraction, and Progressive Enhancement.

## Core Features
- **Comprehensive Analysis**: Supports various cognitive, psychological, and psychopathological assessments.
- **Micro Analysis**: Fast micro-analysis options for cognitive, psychological, and psychopathological evaluations with concise responses.
- **Intelligence Protocol**: Revised intelligence assessment protocol with 24 questions, paradigm-based evaluation, and an 8-point rubric.
- **State Management**: "NEW ANALYSIS" button for resetting application state.

# External Dependencies

## Third-Party Services
- **OpenAI API**: Primary LLM provider (ZHI 1).
- **Anthropic Claude**: LLM provider (ZHI 2).
- **DeepSeek API**: LLM provider (ZHI 3).
- **Perplexity API**: LLM provider (ZHI 4).
- **Google Cloud Storage**: For file management (future integration).

## Database
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migration and schema management.

## File Processing
- **Multer**: File upload handling.
- **Mammoth.js**: Word document text extraction (DOC/DOCX).
- **pdf-parse**: PDF text extraction.

## UI Component Libraries
- **Radix UI**: Accessible UI primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

## Development Tools
- **Vite**: Frontend build tool.
- **TypeScript**: Static type checking.