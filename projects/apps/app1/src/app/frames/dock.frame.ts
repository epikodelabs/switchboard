import { frame } from '@epikodelabs/switchboard';
import { DockPage } from '../components/dock.page';

export const dockFrame = frame('dock', DockPage, {
  directEntry: true,
  transitions: ['mission', 'analysis'],
});
