<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\Outlet;
use App\Notifications\WeeklySummaryNotification;
use App\Services\NotificationRecipientResolver;
use Illuminate\Console\Command;

class SendWeeklySummaryNotifications extends Command
{
    protected $signature = 'reports:weekly-summary';

    protected $description = 'Send weekly summary notifications to subscribed staff';

    public function handle(NotificationRecipientResolver $resolver): int
    {
        $count = 0;

        Company::query()->chunkById(50, function ($companies) use ($resolver, &$count): void {
            foreach ($companies as $company) {
                /** @var Company $company */
                $pending = Outlet::query()
                    ->where('company_id', $company->id)
                    ->where('status', 'pending')
                    ->count();

                $approvedWeek = Outlet::query()
                    ->where('company_id', $company->id)
                    ->where('status', 'approved')
                    ->where('updated_at', '>=', now()->subDays(7))
                    ->count();

                $stats = [
                    'pending_outlets' => $pending,
                    'approved_last_7_days' => $approvedWeek,
                ];

                foreach ($resolver->recipientsPreferring($company, 'weekly_summary') as $user) {
                    $user->notify(new WeeklySummaryNotification($company, $stats));
                    $count++;
                }
            }
        });

        $this->info("Dispatched {$count} weekly summary notification(s).");

        return self::SUCCESS;
    }
}
