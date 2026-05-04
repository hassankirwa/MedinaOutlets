<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * React Native on Android often omits the Authorization header on multipart/FormData POSTs.
 * The mobile client duplicates the token in api_bearer_token; inject Bearer if missing.
 */
final class MergeMultipartBearerToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken()) {
            $token = $request->input('api_bearer_token');
            if (is_string($token) && $token !== '') {
                $request->headers->set('Authorization', 'Bearer '.$token);
            }
        }

        return $next($request);
    }
}
