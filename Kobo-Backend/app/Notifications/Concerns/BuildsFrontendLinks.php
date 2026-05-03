<?php

namespace App\Notifications\Concerns;

trait BuildsFrontendLinks
{
    protected function frontendAbsolute(string $path): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        $path = '/'.ltrim($path, '/');

        return $base.$path;
    }
}
