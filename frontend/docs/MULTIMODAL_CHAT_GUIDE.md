# Multimodal Chat Implementation Guide

This guide explains the multimodal chat functionality that allows users to upload and discuss images and PDFs with all three AI agents (Product Owner, Scrum Master, and Developer).

## Features

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF files
- **File Size Limit**: 10MB per file
- **Multiple Files**: Users can upload multiple files in a single message

### User Interface

#### File Upload
- Click the paperclip icon (📎) next to the text input to select files
- Files are validated for type and size before upload
- Selected files are previewed with name and size information
- Users can remove selected files before sending

#### File Display
- **Images**: Displayed inline with proper scaling and borders
- **PDFs**: Shown as embedded iframe viewers with a file icon indicator
- **File Previews**: Show file type icons and metadata in the input area

### Technical Implementation

#### Client-Side (`AIChat.tsx`)
- File selection and validation using `validateFile()` utility
- File conversion to data URLs using `convertFilesToDataURLs()`
- Enhanced message structure with `parts` array for multimodal content
- Backward compatibility with text-only messages

#### Server-Side (All Agent Routes)
- Automatic detection of multimodal vs. text-only message formats
- Uses AI SDK's `convertToModelMessages()` for multimodal message processing
- Maintains existing tool functionality and streaming responses
- Supports both legacy and new message formats

#### Message Structure
```typescript
// Multimodal message with parts
{
  id: string;
  role: 'user' | 'assistant';
  parts: [
    { type: 'text', text: 'Analyze this diagram' },
    { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,...' }
  ];
}

// Legacy text-only message (still supported)
{
  role: 'user' | 'assistant';
  content: 'Text message content';
}
```

### Usage Examples

#### Product Owner Agent
- Upload wireframes, mockups, or user journey diagrams
- Analyze requirements documents (PDFs)
- Review design specifications with visual context

#### Scrum Master Agent
- Share sprint board screenshots for analysis
- Upload meeting notes or retrospective documents
- Analyze team velocity charts and burndown graphs

#### Developer Agent
- Upload architecture diagrams for code review
- Share error screenshots for debugging assistance
- Analyze technical documentation (PDFs)
- Review UI mockups for implementation guidance

### File Validation

The system validates files before upload:
- **File Type**: Only supported image and PDF formats
- **File Size**: Maximum 10MB per file
- **Error Handling**: Clear error messages for validation failures

### Model Compatibility

The multimodal features work with vision-capable models:
- OpenAI GPT-4o (recommended for images and PDFs)
- Claude Sonnet models (excellent for document analysis)
- Gemini models (good for visual content)

Text-only models will receive only the text portion of multimodal messages.

### Performance Considerations

- Files are converted to base64 data URLs for transmission
- Large files may increase response times
- Consider implementing file upload to cloud storage for production use
- Current implementation suitable for development and moderate usage

### Backward Compatibility

The implementation maintains full backward compatibility:
- Existing text-only conversations continue to work
- No changes required for existing API consumers
- Gradual migration path from text-only to multimodal

## Development Notes

### Key Files Modified
- `frontend/src/types/chat.ts` - Enhanced message types
- `frontend/src/utils/multimodal.ts` - File handling utilities
- `frontend/src/components/chat/AIChat.tsx` - UI enhancements
- `frontend/src/app/api/chat/*/route.ts` - Server-side multimodal support

### Testing Recommendations
1. Test with various image formats and sizes
2. Verify PDF rendering in different browsers
3. Test file validation error cases
4. Ensure backward compatibility with existing conversations
5. Test multiple file uploads in single messages

### Future Enhancements
- Cloud storage integration for large files
- File preview thumbnails
- Drag-and-drop file upload
- Additional file format support
- File compression for better performance
