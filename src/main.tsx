import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useStripboardStore } from '@/store/stripboard';
import { restoreAutosave, startAutosave } from '@/lib/autosave';
import libraryData from '@/data/library.json';
import type { ComponentDefinition } from '@/lib/types';

// Load the built-in library first so restored parts have their definitions
useStripboardStore.getState().loadComponentDefinitions(libraryData as ComponentDefinition[]);
restoreAutosave();
startAutosave();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
