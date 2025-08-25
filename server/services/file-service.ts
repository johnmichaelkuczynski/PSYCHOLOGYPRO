import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';

export class FileService {
  async parseFile(file: Express.Multer.File): Promise<string> {
    const { mimetype, buffer, originalname } = file;

    try {
      switch (mimetype) {
        case 'text/plain':
          return buffer.toString('utf-8');

        case 'application/pdf':
          return await this.parsePDF(buffer);

        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.parseWord(buffer);

        default:
          throw new Error(`Unsupported file type: ${mimetype}`);
      }
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
}
