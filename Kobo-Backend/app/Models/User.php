<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Auth\Passwords\CanResetPassword;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements CanResetPasswordContract
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, CanResetPassword, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'company_id',
        'role_id',
        'phone',
        'home_county',
        'account_status',
        'avatar_path',
        'notification_preferences',
        'security_preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array',
            'security_preferences' => 'array',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultNotificationPreferences(): array
    {
        return [
            'new_submission' => true,
            'sla_breach' => true,
            'rejected_submission' => true,
            'weekly_summary' => true,
            'channels' => [
                'in_app' => true,
                'email' => true,
                'push' => false,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultCollectorNotificationPreferences(): array
    {
        return [
            'submission_review' => true,
            'project_assignment' => true,
            'sync_reminder' => true,
            'channels' => [
                'in_app' => true,
                'email' => false,
                'push' => false,
            ],
        ];
    }

    public function isFieldCollector(): bool
    {
        return $this->role?->slug === 'field_collector';
    }

    /**
     * @return array<string, mixed>
     */
    public function resolvedNotificationPreferences(): array
    {
        $defaults = $this->isFieldCollector()
            ? self::defaultCollectorNotificationPreferences()
            : self::defaultNotificationPreferences();

        return array_replace_recursive(
            $defaults,
            $this->notification_preferences ?? []
        );
    }

    /**
     * @return HasMany<DeviceToken, $this>
     */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultSecurityPreferences(): array
    {
        return [
            'sign_out_other_sessions_after_password_change' => true,
            'require_two_factor' => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function resolvedSecurityPreferences(): array
    {
        return array_replace_recursive(
            self::defaultSecurityPreferences(),
            $this->security_preferences ?? []
        );
    }

    /**
     * Public URL for the profile photo. When a request is given, the host matches the
     * client (e.g. 127.0.0.1 vs localhost) so the URL works in the browser even if APP_URL differs.
     */
    public function publicAvatarUrl(?Request $request = null): ?string
    {
        if ($this->avatar_path === null || $this->avatar_path === '') {
            return null;
        }

        if ($request !== null) {
            $host = $request->getSchemeAndHttpHost();
            if ($host !== '') {
                return rtrim($host, '/').'/storage/'.$this->avatar_path;
            }
        }

        return Storage::disk('public')->url($this->avatar_path);
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * @return HasMany<Outlet, $this>
     */
    public function createdOutlets(): HasMany
    {
        return $this->hasMany(Outlet::class, 'created_by');
    }

    /**
     * @return BelongsToMany<Project, $this>
     */
    public function assignedProjects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_user')
            ->withPivot(['assigned_at', 'assigned_by']);
    }

    /**
     * @return BelongsToMany<Branch, $this>
     */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'branch_field_workers');
    }
}
