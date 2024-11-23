# Dropbox Search React Application

A modern React application for searching and managing Dropbox files with advanced filtering and preview capabilities.

## Features

- Full-text search across your Dropbox files
- Advanced filtering options (file type, size, date)
- File previews and thumbnails
- Pagination with progressive loading
- Modern, responsive UI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Dropbox credentials:
   - Navigate to `src/config`
   - Copy `dropbox.template.ts` to `dropbox.ts`
   - Fill in your Dropbox API credentials:
     - APP_KEY
     - APP_SECRET
     - REFRESH_TOKEN

3. Start the development server:
```bash
npm run dev
```

## Development

- Built with React 18 and TypeScript
- Uses Vite as the build tool
- Styled with Tailwind CSS
- Uses the Dropbox JavaScript SDK

## Search Features

- Progressive loading of search results (100 results per batch)
- 10-second cooldown between result batches
- Preview generation for supported file types
- Advanced filtering and sorting options

## Security

The application uses a configuration file for Dropbox credentials. Make sure to:
- Never commit your `dropbox.ts` file
- Keep your credentials secure
- Use environment variables in production

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
