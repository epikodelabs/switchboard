import {
  Component,
  inject,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterOutlet,
} from '@epikodelabs/switchboard';

import { OperationsRoomService } from '../../services/operations-room.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  protected readonly room = inject(OperationsRoomService);

  protected isTransitioning(): boolean {
    return this.router.state.pending;
  }

  protected phaseLabel(): string {
    return this.router.state.phase ?? 'idle';
  }

  protected activeFrame(): string {
    return String(this.router.state.routeConfig?.name ?? 'dock');
  }

  protected publicAddress(): string {
    return `${window.location.pathname}${window.location.search}`;
  }
}
