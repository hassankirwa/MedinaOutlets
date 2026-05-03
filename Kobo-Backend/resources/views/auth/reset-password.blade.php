<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('Reset password') }}</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #f4f6f8; margin: 0; padding: 24px; }
        .card { max-width: 420px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
        h1 { font-size: 1.35rem; margin: 0 0 8px; color: #1b2a41; }
        p { color: #64748b; font-size: 0.9rem; margin: 0 0 20px; }
        label { display: block; font-weight: 600; font-size: 0.8rem; color: #334155; margin-bottom: 6px; }
        input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5dfea; border-radius: 8px; font-size: 1rem; margin-bottom: 16px; }
        button { width: 100%; padding: 12px; background: #169447; color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; }
        button:hover { filter: brightness(1.05); }
        .error { color: #b91c1c; font-size: 0.875rem; margin-bottom: 12px; }
    </style>
</head>
<body>
<div class="card">
    <h1>{{ __('Choose a new password') }}</h1>
    <p>{{ __('Enter your email and a new password below.') }}</p>

    @if ($errors->any())
        @foreach ($errors->all() as $message)
            <div class="error">{{ $message }}</div>
        @endforeach
    @endif

    <form method="post" action="{{ route('password.update') }}" novalidate>
        @csrf
        <input type="hidden" name="token" value="{{ $token }}">

        <label for="email">{{ __('Email') }}</label>
        <input id="email" type="email" name="email" value="{{ old('email', $email) }}" required autocomplete="username">

        <label for="password">{{ __('New password') }}</label>
        <input id="password" type="password" name="password" required autocomplete="new-password" minlength="8">

        <label for="password_confirmation">{{ __('Confirm password') }}</label>
        <input id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password" minlength="8">

        <button type="submit">{{ __('Reset password') }}</button>
    </form>
</div>
</body>
</html>
