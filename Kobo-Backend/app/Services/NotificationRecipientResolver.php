<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class NotificationRecipientResolver
{
    /** @var list<string> */
    public const STAFF_ROLE_SLUGS = [
        'company_admin',
        'qa_officer',
        'campaign_manager',
        'supervisor',
    ];

    /**
     * Users who should receive company-scoped operational alerts.
     *
     * @return Collection<int, User>
     */
    public function staffForCompany(Company $company): Collection
    {
        return User::query()
            ->where(function ($q) use ($company): void {
                $q->where(function ($q2) use ($company): void {
                    $q2->where('company_id', $company->id)
                        ->whereHas('role', fn ($r) => $r->whereIn('slug', self::STAFF_ROLE_SLUGS));
                })->orWhere(function ($q3): void {
                    $q3->whereHas('role', fn ($r) => $r->where('slug', 'super_admin'));
                });
            })
            ->with('role')
            ->get();
    }

    /**
     * @param  'new_submission'|'sla_breach'|'rejected_submission'|'weekly_summary'  $prefKey
     * @return Collection<int, User>
     */
    public function recipientsPreferring(Company $company, string $prefKey): Collection
    {
        return $this->staffForCompany($company)->filter(function (User $user) use ($prefKey): bool {
            $prefs = $user->resolvedNotificationPreferences();

            return (bool) ($prefs[$prefKey] ?? false);
        });
    }
}
