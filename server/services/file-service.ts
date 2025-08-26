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

    console.log(`Parsing file: ${originalname}, type: ${mimetype}, size: ${buffer.length} bytes`);

    try {
      let text: string;
      
      switch (mimetype) {
        case 'text/plain':
          console.log('Parsing as text file');
          text = buffer.toString('utf-8');
          break;

        case 'application/pdf':
          console.log('Parsing as PDF file');
          text = await this.parsePDF(buffer);
          break;

        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          console.log('Parsing as Word document');
          text = await this.parseWord(buffer);
          break;

        default:
          throw new Error(`Unsupported file type: ${mimetype}`);
      }

      console.log(`Successfully parsed file: ${originalname}, extracted text length: ${text.length}`);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content could be extracted from the file');
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
    try {
      console.log('Parsing PDF buffer using pdfjs-dist...');
      
      // Use pdfjs-dist which is more reliable than pdf-parse
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
      
      // Create a typed array from the buffer
      const data = new Uint8Array(buffer);
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      console.log(`PDF loaded successfully, pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      console.log(`PDF text extracted successfully, length: ${fullText.length}`);
      
      if (!fullText || fullText.trim().length === 0) {
        throw new Error('PDF file appears to be empty or contains no extractable text');
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF document: ${error instanceof Error ? error.message : String(error)}`);
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
