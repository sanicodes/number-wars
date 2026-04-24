import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#F97316',
      light: '#FDBA74',
      dark: '#C2410C',
    },
    secondary: {
      main: '#22D3EE',
    },
    background: {
      default: '#0B1026',
      paper: '#151D46',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
    },
    success: {
      main: '#34D399',
    },
    warning: {
      main: '#F97316',
    },
    error: {
      main: '#FB7185',
    },
    divider: 'rgba(129, 140, 248, 0.18)',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "'Chakra Petch', sans-serif",
    h2: {
      fontFamily: "'Russo One', sans-serif",
      fontWeight: 400,
    },
    h3: {
      fontFamily: "'Russo One', sans-serif",
      fontWeight: 400,
      letterSpacing: '0',
    },
    h4: {
      fontFamily: "'Russo One', sans-serif",
      fontWeight: 400,
      letterSpacing: '0',
    },
    h5: {
      fontFamily: "'Russo One', sans-serif",
      fontWeight: 400,
      letterSpacing: '0',
    },
    h6: {
      fontFamily: "'Russo One', sans-serif",
      fontWeight: 400,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    overline: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700,
      letterSpacing: '0.12em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
