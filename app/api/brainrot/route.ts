import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        // Since we're doing browser-side processing with Essentia.js,
        // we'll return the files back to the client for processing
        // This endpoint is mainly for validation and could be extended
        // for server-side processing if needed

        return NextResponse.json({
            success: true,
            fileCount: files.length,
            message: 'Files received, process on client'
        });

    } catch (error) {
        console.error('Brainrot API error:', error);
        return NextResponse.json(
            { error: 'Failed to process files' },
            { status: 500 }
        );
    }
}
