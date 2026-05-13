import { io } from 'socket.io-client';

const getServerUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return 'http://localhost:9080';
};

const socket = io(getServerUrl(), {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
});

export default socket;
