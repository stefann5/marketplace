import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import Nora from '@primeuix/themes/nora';
import { definePreset } from '@primeuix/themes';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import { authInterceptor } from './core/interceptors/auth.interceptor';

const MyPreset = definePreset(Nora, {
  semantic: {
    primary: {
      50: '{amber.50}',
      100: '{amber.100}',
      200: '{amber.200}',
      300: '{amber.300}',
      400: '{amber.400}',
      500: '{amber.500}',
      600: '{amber.600}',
      700: '{amber.700}',
      800: '{amber.800}',
      900: '{amber.900}',
      950: '{amber.950}'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
            theme: {
                preset: MyPreset,
                options: {
                    darkModeSelector: false
                }
            }
        })
  ]
};
