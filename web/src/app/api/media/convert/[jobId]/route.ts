import { NextRequest, NextResponse } from 'next/server';
import { fileQueue } from '@/lib/queue/fileQueue';
import { mimeTypes } from '@/lib/types/mimeTypes';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const { format } = await request.json();
    
    console.log(`Converting job ${jobId} to ${format}`);

    const job = await fileQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const result = await fileQueue.convert(jobId, format);
    
    if (result.file.buffer) {
      const mimeType = mimeTypes[format as keyof typeof mimeTypes] || 'application/octet-stream';
      
      return new NextResponse(result.file.buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${result.file.originalName}"`,
          'Content-Length': result.file.buffer.length.toString(),
          // Allow caching for converted files
          'Cache-Control': 'public, max-age=31536000',
          'Last-Modified': new Date().toUTCString()
        }
      });
    }

    return NextResponse.json(
      { error: 'Conversion failed - no output file' }, 
      { status: 500 }
    );

  } catch (error) {
    console.error('Conversion error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Conversion failed',
        details: message
      },
      { status: 500 }
    );
  }
} 