import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Spectator } from './views/Spectator';
import './styles/base.css';
import './styles/components.css';
import './styles/table.css';
import './styles/character.css';
import './styles/glass.css';
import './styles/phone.css';
import './styles/print.css';
import '@fontsource-variable/inter/opsz.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash === '#spectator' ? <Spectator /> : <App />}
  </StrictMode>,
);
