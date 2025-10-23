# Overview

Psychology Pro is a web application designed to analyze text content using multiple AI language models for cognitive, psychological, and psychopathological assessments. It offers full cognitive profiling with real-time streaming, multi-chunk text analysis, and calibrated scoring. The project aims to provide comprehensive psychological insights from text, leveraging advanced AI capabilities.

# Recent Changes

## October 23, 2025
- **MBTI Streaming Bug Fixed**: All three MBTI analysis variants (Normal, Comprehensive, Micro) now use correct streaming events (`raw_stream` and `batch_complete`) matching other analysis types - streaming no longer stops after summary
- **View Quotations Button Removed**: Removed non-functional placeholder button from results panel
- **File Upload Error Handling**: Improved error handling for old .doc format with clear user guidance (only .docx supported via mammoth.js)
- **Database Schema Fixed**: Proper auto-incrementing user ID sequence implementation
- **All 12 Analysis Functions Working**: 3 cognitive, 3 psychological, 3 psychopathological, 3 MBTI

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React SPA**: Built with TypeScript using Vite.
- **UI Framework**: shadcn/ui components with Radix UI primitives, styled with Tailwind CSS.
- **State Management**: TanStack Query for server state and API caching.
- **Routing**: wouter library for client-side routing.
- **File Handling**: Supports TXT and DOCX formats (not old .doc format).
- **Text Chunking**: Automatic chunking for uploaded files and copy-pasted text over 1000 words.
- **Multi-Chunk Selection**: Interface for analyzing multiple text segments simultaneously.

## Backend Architecture
- **Express.js Server**: RESTful API with TypeScript implementation.
- **File Upload**: Multer middleware for multipart file uploads.
- **Streaming**: Server-Sent Events (SSE) for real-time progress updates.
- **Memory Storage**: In-memory storage with an interface for future database migration.

## Data Storage Solutions
- **Drizzle ORM**: Configured for PostgreSQL with migration support.
- **Schema Design**: Entities for analysis and discussions, using JSON for flexible results.
- **Memory Fallback**: Temporary in-memory storage during development.

## Analysis Processing Architecture
- **Multi-LLM Integration**: Supports four AI providers (OpenAI, Anthropic, DeepSeek, Perplexity, aliased as ZHI 1-4).
- **Batch Processing**: Questions sent in batches of 5 to manage token limits.
- **Streaming Service**: Real-time analysis progress with pause/resume functionality using SSE.
- **Streaming Events**: Consistent event structure across all analysis types - `raw_stream` (batchNumber, rawContent, timestamp) and `batch_complete` events.
- **Discussion System**: Post-analysis dialogue for result refinement.
- **Enhanced Scoring System**: Calibrated LLM scoring instructions to prevent artificially low scores by clarifying the reference class as the entire human population.
- **State Management**: "NEW ANALYSIS" button for complete state reset.
- **MBTI Analysis**: Includes three versions of MBTI personality type determination (Normal, Comprehensive, Micro) with proper streaming.
- **Credit Costs**: Micro (400-600), Normal (1500-2000), Comprehensive (4000-5000) depending on analysis type.

## Key Design Patterns
- **Passthrough Architecture**: Application acts as an intermediary for analysis.
- **Service Layer Pattern**: Separated concerns for LLM, file processing, and streaming.
- **Provider Abstraction**: Unified interface for multiple LLM providers.
- **Progressive Enhancement**: Streaming updates with graceful fallback.

# External Dependencies

## Third-Party Services
- **OpenAI API**: Primary language model provider (ZHI 1).
- **Anthropic Claude**: Secondary language model provider (ZHI 2).
- **DeepSeek API**: Third language model provider (ZHI 3).
- **Perplexity API**: Fourth language model provider (ZHI 4).
- **Stripe**: Payment processing integration (configured but not yet implemented in UI).

## Database
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migration and schema management.

## File Processing
- **Multer**: File upload handling middleware.
- **Mammoth.js**: For Word document text extraction (DOCX only, not old DOC format).

## UI Component Libraries
- **Radix UI**: Accessible UI primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

## Development Tools
- **Vite**: Frontend build tool and development server.
- **TypeScript**: Static type checking.

# Known Limitations
- Old .doc format not supported (only .docx files work with mammoth.js)
- Stripe integration configured but credit-based payment system not yet implemented in UI
