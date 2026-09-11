import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { InMemoryDataService } from './services/mock-backend';
import { provideFrameGraph } from '@epikodelabs/switchboard';
import { frames } from './app.frames';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      HttpClientModule,
      HttpClientInMemoryWebApiModule.forRoot(InMemoryDataService, { delay: 300 })
    ),
    ...provideFrameGraph(frames, { viewTransitions: true }),
  ],
};
