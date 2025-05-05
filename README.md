<<<<<<< HEAD
# Spam Detector v0

A full-stack application for detecting spam emails using machine learning.

## Project Structure

- **Frontend**: Next.js application with React components
- **Backend**: Flask API with Python and scikit-learn
- **ML Models**: Pre-trained models for spam detection

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python 3.8+
- npm or yarn

### Installation

1. Clone the repository
2. Install frontend dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
pip install -r requirements.txt
```

### Running the Application

1. Start the Flask backend server:

```bash
# From the project root
npm run backend
# Or directly with Python
python app.py
```

2. In a separate terminal, start the frontend development server:

```bash
# From the project root
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Troubleshooting

### API Connection Issues

If you see "API Status: Offline" or "Failed to fetch" errors:

1. Make sure the Flask server is running with `npm run backend`
2. Check that the Flask server is running on port 5000
3. Verify that CORS is properly configured in the Flask app
4. Check browser console for specific error messages

### Common Issues

- **CORS Errors**: The Flask server includes CORS headers, but you may need to adjust them if you're running the frontend on a different port.
- **Port Conflicts**: If port 5000 is already in use, you'll need to change the port in `app.py` and update the `.env.local` file.
- **Missing Dependencies**: Make sure all Python dependencies are installed with `pip install -r requirements.txt`.

## API Endpoints

- `GET /` - Health check endpoint
- `GET /word-stats` - Get statistics about influential words in spam detection
- `POST /predict` - Analyze a message for spam content

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Building for Production

```bash
# Build the frontend
npm run build
```

## License

This project is licensed under the MIT License.
=======
# Email-spam-detection
>>>>>>> 7454627ba13d31d4e8e8405261ee0dcbe36adf4c
