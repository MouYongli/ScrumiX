# Multimodal Chat Implementation Guide

This guide explains the multimodal chat functionality that allows users to upload and discuss images and PDFs with all three AI agents (Product Owner, Scrum Master, and Developer).

## Features

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP (optimized for major vision models)
- **Documents**: PDF files
- **File Size Limit**: 10MB per file
- **Multiple Files**: Users can upload multiple files in a single message

> **Note**: Only images and PDFs are supported to ensure optimal compatibility with vision models like GPT-4o, Claude Sonnet, and Gemini. These formats provide the best analysis results for visual content and document understanding.

### User Interface

#### File Upload
- **Click to Upload**: Click the paperclip icon (📎) next to the text input to select files
- **Drag and Drop**: Drag files directly into the chat area for instant upload
- **Visual Feedback**: Drag overlay shows supported formats and drop zone
- **File Validation**: Files are validated for type and size before upload
- **File Preview**: Selected files are previewed with icons, names, and sizes
- **File Management**: Users can remove selected files before sending
- **Multiple Methods**: Combine click upload and drag-drop in the same conversation

#### File Display
- **Images**: Displayed inline with proper scaling and borders for visual analysis
- **PDFs**: Shown as embedded iframe viewers with a file icon indicator
- **File Icons**: Color-coded icons (🟢 green for images, 🔴 red for PDFs)
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
- **Visual Design**: Upload wireframes, mockups, user journey diagrams, and UI screenshots
- **Requirements**: Analyze requirements documents (PDFs) and specification sheets
- **User Research**: Share user feedback screenshots, survey results, and visual data
- **Prototypes**: Review design prototypes and visual specifications

#### Scrum Master Agent
- **Process Analysis**: Share sprint board screenshots and workflow diagrams
- **Documentation**: Upload meeting notes, retrospective documents, and process guides (PDFs)
- **Metrics**: Analyze team velocity charts, burndown graphs, and performance visualizations
- **Presentations**: Review retrospective slides and process improvement materials

#### Developer Agent
- **Architecture**: Upload system diagrams, technical specifications (PDFs), and architecture visuals
- **UI Implementation**: Review mockups, design specifications, and visual requirements
- **Debugging**: Upload error screenshots, system diagrams, and technical documentation
- **Documentation**: Analyze API documentation (PDFs) and technical guides
- **Code Analysis**: Review visual code representations, flowcharts, and system designs

### File Validation

The system validates files before upload:
- **File Type**: Only images (JPEG, PNG, GIF, WebP) and PDFs are supported
- **File Size**: Maximum 10MB per file
- **Error Handling**: Clear error messages for unsupported file types or oversized files
- **Drag and Drop**: Real-time validation during drag operations with visual feedback

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

## Drag and Drop Features

### Visual Feedback
- **Drag Overlay**: Full-screen overlay appears when dragging files over the chat area
- **Format Display**: Shows "Images: JPEG, PNG, GIF, WebP • Documents: PDF" during drag operation
- **Color Coding**: Blue highlight indicates valid drop zone for supported file types
- **Smooth Animations**: Fade in/out transitions for better user experience

### Interaction Model
- **Drag Detection**: Automatically detects when files are dragged over the chat
- **File Merging**: New files are added to existing selection without replacing
- **Instant Validation**: Files are validated immediately on drop
- **Error Feedback**: Clear error messages for invalid files or sizes

### Technical Implementation
- **Event Handling**: Comprehensive drag/drop event management
- **File Management**: Uses DataTransfer API for proper file handling
- **State Management**: Tracks drag state per agent independently
- **Performance**: Efficient re-rendering only when necessary

### Future Enhancements
- Cloud storage integration for large files
- File preview thumbnails with hover effects
- Image compression for better performance
- Enhanced PDF text extraction and analysis
- Batch file operations for multiple images
