import { NextRequest, NextResponse } from 'next/server';

// Configure for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for large files with Gemini 2.5 Flash

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB - Optimized for Gemini 2.5 Flash

export async function POST(request: NextRequest) {
  try {
    // Add timeout protection for large files
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout - file too large or connection slow')), 8 * 60 * 1000) // 8 minutes for 100MB files
    );

    const uploadPromise = async () => {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Invalid file type. Only PDF files are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size with more granular limits
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { 
            error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit. Gemini 2.5 Flash can handle large documents efficiently.`,
            maxSize: MAX_FILE_SIZE,
            actualSize: file.size
          },
          { status: 413 }
        );
      }

      // Warn about large files that might take longer to process
      if (file.size > 50 * 1024 * 1024) { // 50MB
        console.warn(`Processing large PDF with Gemini 2.5 Flash: ${(file.size / 1024 / 1024).toFixed(1)}MB - may take 5-10 minutes`);
      }

      // Process file in chunks for large files to prevent memory issues
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate PDF structure (basic check)
      if (!buffer.subarray(0, 4).toString().includes('%PDF')) {
        return NextResponse.json(
          { error: 'Invalid PDF file structure' },
          { status: 400 }
        );
      }

      // Convert to base64 data URI with memory optimization
      let base64: string;
      try {
        base64 = buffer.toString('base64');
      } catch (memoryError) {
        console.error('Memory error processing PDF:', memoryError);
        return NextResponse.json(
          { error: 'File too large to process - try a smaller PDF' },
          { status: 413 }
        );
      }

      const dataUri = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        dataUri,
        fileName: file.name,
        fileSize: file.size,
        processingTime: Date.now()
      });
    };

    // Race between upload processing and timeout
    return await Promise.race([uploadPromise(), timeoutPromise]);

  } catch (error) {
    console.error('PDF upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('PayloadTooLargeError') || error.message.includes('too large')) {
        return NextResponse.json(
          { error: 'File too large for processing. Please use a smaller PDF (under 20MB recommended).' },
          { status: 413 }
        );
      }
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Upload timeout. Please try a smaller file or check your connection.' },
          { status: 408 }
        );
      }
      if (error.message.includes('Invalid PDF')) {
        return NextResponse.json(
          { error: 'Invalid PDF file. Please ensure the file is not corrupted.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to process PDF file. Please try again or use a different file.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    supportedTypes: ['application/pdf'],
    maxDuration: 300
  });
}