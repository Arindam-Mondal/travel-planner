import { inject } from '@angular/core';
import { type HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

/** Attaches the Google OAuth Bearer token to googleapis.com requests only. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.googleAccessToken();

  const needsBearer = req.url.includes('googleapis.com') &&
    !req.url.includes('generativelanguage.googleapis.com') &&
    !req.url.includes('translation.googleapis.com');

  if (token && needsBearer) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authReq);
  }

  return next(req);
};
