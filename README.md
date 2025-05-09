# Number Wars Game

A multiplayer web game where players compete by selecting numbers strategically.

## Project Structure

This is a monorepo containing both the client and server applications:

```
aqua-regia-game/
├── client/             # React frontend
│   ├── public/        # Static files
│   └── src/           # Source code
├── server/            # Node.js backend
│   └── index.js       # Server code
├── package.json       # Root package.json
└── README.md         # This file
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aqua-regia-game
```

2. Install all dependencies:
```bash
npm run install:all
```

## Available Commands

From the root directory, you can run the following commands:

```bash
# Install all dependencies (root, client, and server)
npm run install:all

# Start both client and server concurrently
npm start

# Start only the client
npm run start:client

# Start only the server
npm run start:server

# Build the client application
npm run build

# Run tests for both client and server
npm test

# Run tests for client only
npm run test:client

# Run tests for server only
npm run test:server
```

## Development

The client will run on http://localhost:3000 and the server on http://localhost:5000.

To start development, simply run:
```bash
npm start
```

This will start both the client and server concurrently.

## Game Rules

- Players start with 10 points
- Each round, players select a number between 0 and 100
- The target number is calculated as (average × 0.8)
- Closest to target wins, others lose 1 point
- Duplicate numbers result in -2 points
- Game ends when a player reaches 0 points
- Last player standing wins

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

MIT 