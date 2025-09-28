# Overview

Psychology Pro is a cognitive/psychological/psychopathological profiler web application built with a React frontend and Node.js/Express backend. The application serves as a passthrough system that facilitates analysis of text content through multiple AI language models, focusing on cognitive, psychological, and psychopathological assessments. Features full cognitive profiling with real-time streaming, multi-chunk text analysis, and enhanced scoring calibration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React SPA**: Built with TypeScript using Vite as the build tool and development server
- **UI Framework**: Utilizes shadcn/ui components with Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: wouter library for lightweight client-side routing
- **File Handling**: Custom file parsing utilities supporting TXT, DOC, and DOCX formats (PDF removed after implementation failures)
- **Text Chunking**: Automatic chunking system for both uploaded files and copy-pasted text over 1000 words
- **Multi-Chunk Selection**: Advanced chunk selection interface allowing analysis of multiple text segments simultaneously

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
- **Enhanced Scoring System**: Calibrated LLM scoring instructions to prevent artificially low scores by clarifying reference class as entire human population
- **State Management**: NEW ANALYSIS button for complete state reset and fresh analysis initiation

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
- **Multer**: File upload handling middleware with 10MB size limit
- **Document processing**: Mammoth.js for Word document text extraction (DOC/DOCX)
- **PDF Support**: Deliberately removed after multiple failed implementation attempts

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework for styling

## Development Tools
- **Vite**: Frontend build tool and development server
- **Replit Integration**: Development environment plugins and error overlays
- **TypeScript**: Static type checking across the entire codebase

# Recent Changes (September 28, 2025)

## Critical Bug Fix - ZHI 4 (Perplexity) Streaming Issue Resolution
✅ **ZHI 4 Garbled Text Issue Resolved**: Fixed critical streaming decoder bug that was causing Perplexity (ZHI 4) to produce fragmented, nonsensical text output during analysis

✅ **Stream Decoder Enhancement**: Implemented proper UTF-8 streaming support with `{ stream: true }` parameter to handle partial character sequences across network chunks

✅ **Buffering System Added**: Created intelligent buffering mechanism to accumulate text chunks and prevent JSON data from being truncated mid-line during Server-Sent Events processing

✅ **Line Processing Fix**: Enhanced line splitting logic to retain incomplete lines in buffer for next iteration, ensuring complete JSON parsing and coherent text assembly

✅ **Production Security**: Added development-only debug logging to prevent user content exposure in production environments while maintaining debugging capability for development

✅ **End-to-End Validation**: Comprehensive testing confirms ZHI 4 (Perplexity) now produces coherent, well-formatted analysis responses that stream properly in real-time, achieving parity with other providers

# Previous Changes (September 27, 2025)

## Latest Critical Fixes - LLM Provider and User Experience Improvements 
✅ **ZHI 4 (Perplexity) Fixed**: Updated invalid model name from 'llama-3.1-sonar-large-128k-online' to valid 'sonar-pro' - Perplexity API now working properly

✅ **ZHI 2 (Anthropic) Debugging**: Added debugging infrastructure to diagnose "No content received" errors - configuration verified as correct per current API specifications

✅ **Save Button Enhancement**: Implemented visual saving indicator with spinner animation and "Saving..." text providing immediate user feedback during save operations

✅ **Saved Analysis Count Fix**: Optimized query strategy to immediately update saved analysis count in header after saving, eliminating previous delay

✅ **Session Management Stability**: Resolved session table constraint conflicts that were causing authentication failures - cleaned up database artifacts for stable session handling

✅ **Complete Authentication System**: Successfully tested end-to-end authentication flow including registration, login, logout, user history, and personal analysis management

## Previous Major Update - Fast Micro Analysis Implementation
✅ **Ultra-Fast Micro Analysis Types**: Successfully implemented three new high-speed analysis options with dramatically reduced processing times

✅ **Micro Cognitive Analysis**: Added microcognitive analysis with 1-2 sentence responses per question, reducing analysis time from 10-25 minutes to just a few minutes

✅ **Micro Psychological Analysis**: Implemented micropsychological analysis using same assessment standards but ultra-concise response format for rapid processing

✅ **Micro Psychopathological Analysis**: Added micropsychopathological analysis with specialized prompts requesting brief 1-2 sentence evaluations

✅ **Complete Backend Integration**: Extended streaming service with micro-specific processing methods and prompt creation systems optimized for speed

✅ **Enhanced UI Options**: Updated sidebar interface to include all three micro analysis types with lightning bolt (⚡) icons indicating fast processing

✅ **Full Feature Parity**: Micro analysis types maintain complete save/download functionality and result persistence with existing system architecture

✅ **Quality Assurance**: Comprehensive testing confirms all micro analysis types work end-to-end with proper streaming, saving, and downloading capabilities

## Previous Changes (August 27, 2025)

## Major Update - Comprehensive Intelligence Analysis Protocol
✅ **Complete Intelligence Protocol Overhaul**: Implemented comprehensive revised intelligence assessment protocol for both comprehensive and non-comprehensive cognitive analysis

✅ **Enhanced Question Set**: Updated to include all 24 intelligence assessment questions including new critical analysis questions about undefined terms, free variables, statement development, and insight paraphrasing

✅ **Paradigm-Based Evaluation**: Added detailed paradigm examples - transcendental empiricism passage as phony pseudo-intellectual reference, and genuine intelligence examples for comparison standards

✅ **Core Intelligence Rubric**: Implemented 8-point evaluation framework including defined vs undefined terms, free variables, development of points, insight paraphrase test, depth vs surface, friction & tension, originality, and phoniness check  

✅ **Strict Failure Conditions**: Built-in system validation - scores above 65 for phony writing or below 96 for genuine intelligence examples trigger assessment failure

✅ **Complete Metapoint Integration**: All 6 metapoints now integrated including not grading completeness, not overvaluing phrases, text summarization requirements, population-based scoring, rewarding insights over argumentation

## Previous Changes (August 26, 2025)

## Major Improvements Completed  
✅ **PDF Support Added**: Successfully implemented PDF file upload functionality using reliable upload system. PDF files are now uploaded and stored securely in uploads/ directory

✅ **Application Rebranding**: Changed application name from "Mind Reader" to "Psychology Pro" throughout the codebase and documentation

✅ **Object Storage Infrastructure**: Set up Google Cloud Storage integration for file management capabilities (foundation for future enhancements)

✅ **Reliable PDF Upload System**: Replaced problematic PDF parsing libraries with proven upload solution. PDFs now upload successfully with proper validation, storage, and user feedback

## Previous Changes (August 25, 2025)

✅ **Multi-Chunk Selection**: Implemented comprehensive chunk selection system allowing users to select and analyze multiple text chunks simultaneously with checkbox interface and Select All/Deselect All controls

✅ **Automatic Text Chunking**: Added real-time chunking for copy-pasted text over 1000 words, not just uploaded files. Text automatically divides into ~1000 word chunks with immediate chunk selection interface

✅ **Enhanced Scoring Calibration**: Completely overhauled LLM scoring instructions with explicit examples and warnings against conservative scoring, clarifying that reference class is entire human population including children, disabled, illiterate

✅ **Scoring Direction Fix**: Fixed critical scoring confusion where LLMs were inverting positive/negative trait scoring. Now clearly distinguishes between positive traits (score HIGH for good performance) and negative traits (score HIGH for bad performance)

✅ **Uniform Scoring System**: Implemented consistent scoring where HIGH SCORES ALWAYS mean good/positive evaluation across all questions. Eliminated confusion where some questions used low scores for good performance (e.g., "Is it phony?" now gives 95/100 for authentic text, not 5/100)

✅ **NEW ANALYSIS Button**: Added prominent button for complete state reset, clearing all analysis data and returning to fresh start state

✅ **Markdown Stripping**: Implemented clean text display removing ** ### *** formatting from LLM responses

## Current Status
- **File Support**: TXT, DOC, DOCX (full document processing support)
- **Text Processing**: Automatic chunking for both uploaded and pasted text
- **Analysis Functions**: All 6 cognitive analysis types fully operational
- **LLM Integration**: All 4 providers (ZHI 1-4) working with enhanced scoring
- **User Interface**: Complete chunk selection and state management controls

## User Feedback
User satisfaction significantly improved with multi-chunk selection and automatic text chunking functionality. PDF removal acknowledged as correct decision after implementation failures.

**Latest Changes (August 26, 2025)**: Successfully implemented comprehensive PDF upload system for "Psychology Pro". Application now supports:
- PDF upload with automatic text extraction using pdf-parse library
- Complete upload/extract API with proper file validation and storage  
- PDF viewer with iframe preview and direct file links
- Automatic text area population with extracted PDF content
- Robust error handling and user feedback throughout upload process
- TXT, DOC, DOCX files continue to work with existing chunking system

PDF functionality fully operational with proper CommonJS module integration.