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
import './styles/studio.css';
import './styles/workshop.css';
import './styles/wiki.css';
import './styles/fantasy.css';
import './styles/ornate.css';
import '@fontsource-variable/inter/opsz.css';
// the fantasy look: Cinzel for titles, EB Garamond for long texts, Alegreya Sans for the interface
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/400-italic.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash === '#spectator' ? <Spectator /> : <App />}
  </StrictMode>,
);
