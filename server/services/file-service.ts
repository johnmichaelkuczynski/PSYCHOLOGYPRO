import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';

interface ParseResult {
  text: string;
  chunks?: string[];
  wordCount: number;
}

export class FileService {
  async parseFile(file: Express.Multer.File): Promise<ParseResult> {
    const { mimetype, buffer, originalname } = file;

    try {
      let text: string;
      
      switch (mimetype) {
        case 'text/plain':
          text = buffer.toString('utf-8');
          break;

        case 'application/pdf':
          text = await this.parsePDF(buffer);
          break;

        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          text = await this.parseWord(buffer);
          break;

        default:
          throw new Error(`Unsupported file type: ${mimetype}`);
      }

      const wordCount = this.countWords(text);
      
      if (wordCount > 1000) {
        const chunks = this.chunkText(text, 1000);
        return {
          text,
          chunks,
          wordCount
        };
      }

      return {
        text,
        wordCount
      };
    } catch (error) {
      console.error('File parsing error:', error);
      throw new Error(`Failed to parse ${originalname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async parsePDF(buffer: Buffer): Promise<string> {
    // In a real implementation, you would use a library like pdf-parse
    // For now, we'll simulate PDF parsing
    try {
      // This is a placeholder - in production, use pdf-parse or similar
      const text = buffer.toString('utf-8');
      // Simple heuristic to detect if it's actually a PDF
      if (text.startsWith('%PDF')) {
        throw new Error('PDF parsing requires pdf-parse library - not implemented in this demo');
      }
      return text;
    } catch (error) {
      throw new Error('Failed to parse PDF file');
    }
  }

  private async parseWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Word parsing error:', error);
      throw new Error('Failed to parse Word document');
    }
  }

  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only TXT, PDF, DOC, and DOCX files are supported.'
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 10MB.'
      };
    }

    return { valid: true };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private chunkText(text: string, maxWords: number): string[] {
    const words = text.trim().split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += maxWords) {
      const chunk = words.slice(i, i + maxWords).join(' ');
      chunks.push(chunk);
    }
    
    return chunks;
  }
}
