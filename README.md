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

2. Install dependencies for both client and server:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

## Development

To run the development servers:

1. Start the backend server:
```bash
cd server
npm start
```

2. In a new terminal, start the frontend:
```bash
cd client
npm start
```

The client will run on http://localhost:3000 and the server on http://localhost:5000.

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