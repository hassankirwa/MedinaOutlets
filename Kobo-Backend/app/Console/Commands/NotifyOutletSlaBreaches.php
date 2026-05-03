<?php

namespace App\Console\Commands;

use App\Models\Outlet;
use App\Notifications\OutletSlaBreachedNotification;
use App\Services\NotificationRecipientResolver;
use App\Support\WorkspaceDefaults;
use Illuminate\Console\Command;

class NotifyOutletSlaBreaches extends Command
{
    protected $signature = 'outlets:notify-sla-breaches';

    protected $description = 'Notify staff when pending submissions exceed the configured SLA';

    public function handle(NotificationRecipientResolver $resolver): int
    {
        $count = 0;

        Outlet::query()
            ->where('status', 'pending')
            ->with('company')
            ->chunkById(100, function ($outlets) use ($resolver, &$count): void {
                foreach ($outlets as $outlet) {
                    /** @var Outlet $outlet */
                    if ($outlet->company === null) {
                        continue;
                    }

                    $settings = WorkspaceDefaults::mergeCompanySettings($outlet->company->settings);
                    $hours = (float) ($settings['workflow_approvals']['sla_hours'] ?? 48);
                    $deadline = $outlet->created_at->copy()->addHours($hours);

                    if (now()->lessThanOrEqualTo($deadline)) {
                        continue;
                    }

                    if ($outlet->sla_notified_at !== null) {
                        continue;
                    }

                    foreach ($resolver->recipientsPreferring($outlet->company, 'sla_breach') as $user) {
                        $user->notify(new OutletSlaBreachedNotification($outlet));
                        $count++;
                    }

                    $outlet->sla_notified_at = now();
                    $outlet->save();
                }
            });

        $this->info("Dispatched {$count} SLA notification(s).");

        return self::SUCCESS;
    }
}
