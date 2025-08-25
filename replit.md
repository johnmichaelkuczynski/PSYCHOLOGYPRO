# Overview

Mind Reader is a cognitive/psychological/psychopathological profiler web application built with a React frontend and Node.js/Express backend. The application serves as a passthrough system that facilitates analysis of text content through multiple AI language models, focusing on cognitive, psychological, and psychopathological assessments. Currently implements the basic cognitive profiling function with plans for comprehensive analysis modules.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React SPA**: Built with TypeScript using Vite as the build tool and development server
- **UI Framework**: Utilizes shadcn/ui components with Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: wouter library for lightweight client-side routing
- **File Handling**: Custom file parsing utilities supporting TXT, PDF, DOC, and DOCX formats

## Backend Architecture
- **Express.js Server**: RESTful API with middleware for request logging and error handling
- **TypeScript**: Full TypeScript implementation across both frontend and backend
- **File Upload**: Multer middleware for handling multipart file uploads with size limitations
- **Streaming**: Server-Sent Events (SSE) for real-time analysis progress updates
- **Memory Storage**: In-memory storage implementation with interface abstraction for future database migration

## Data Storage Solutions
- **Drizzle ORM**: Database abstraction layer configured for PostgreSQL with migration support
- **Schema Design**: Analysis and discussion entities with JSON storage for flexible result structures
- **Memory Fallback**: Temporary in-memory storage implementation during development phase

## Authentication and Authorization
- Session-based authentication system using connect-pg-simple for PostgreSQL session storage
- No current authentication implementation - prepared for future user management

## Analysis Processing Architecture
- **Multi-LLM Integration**: Support for four AI providers (aliased as ZHI 1-4 for OpenAI, Anthropic, DeepSeek, Perplexity)
- **Batch Processing**: Questions sent in batches of 5 to manage token limits and response quality
- **Streaming Service**: Real-time analysis progress with pause/resume functionality
- **Discussion System**: Post-analysis dialogue capability for result refinement and contestation

## Key Design Patterns
- **Passthrough Architecture**: Application acts as intermediary without implementing analysis logic
- **Service Layer Pattern**: Separated concerns with dedicated services for LLM, file processing, and streaming
- **Provider Abstraction**: Unified interface for multiple LLM providers with consistent request/response handling
- **Progressive Enhancement**: Streaming updates with graceful fallback for connection issues

# External Dependencies

## Third-Party Services
- **OpenAI API**: Primary language model provider (ZHI 1)
- **Anthropic Claude**: Secondary language model provider (ZHI 2) 
- **DeepSeek API**: Third language model provider (ZHI 3)
- **Perplexity API**: Fourth language model provider (ZHI 4)

## Database
- **Neon PostgreSQL**: Serverless PostgreSQL database for production deployment
- **Drizzle Kit**: Database migration and schema management tools

## File Processing
- **Multer**: File upload handling middleware
- **PDF parsing libraries**: Prepared integration points for pdf-parse
- **Document processing**: Prepared integration points for mammoth.js (Word documents)

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework for styling

## Development Tools
- **Vite**: Frontend build tool and development server
- **Replit Integration**: Development environment plugins and error overlays
- **TypeScript**: Static type checking across the entire codebase