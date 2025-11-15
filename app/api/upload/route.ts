import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { processAudioWithBeats } from '../../../buffer';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type (audio files only)
        if (!file.type.startsWith('audio/')) {
            return NextResponse.json(
                { error: 'File must be an audio file' },
                { status: 400 }
            );
        }

        // Convert the file to a buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        console.log('Processing audio with hardstyle beats...');

        // Process the audio file with beats
        const processedBuffer = await processAudioWithBeats(buffer);

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }

        // Generate a unique filename (save as WAV since we processed it)
        const timestamp = Date.now();
        const originalName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        const filename = `${timestamp}-${originalName}-hardstyle.wav`;
        const filepath = path.join(uploadsDir, filename);

        // Write the processed file
        await writeFile(filepath, processedBuffer);

        console.log('Audio processed and saved successfully!');

        return NextResponse.json(
            {
                success: true,
                filename: filename,
                message: 'File processed and uploaded successfully'
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process and upload file' },
            { status: 500 }
        );
    }
}
