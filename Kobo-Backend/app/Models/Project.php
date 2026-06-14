<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'company_id',
        'branch_id',
        'county_id',
        'name',
        'description',
        'status',
        'start_date',
        'end_date',
        'created_by',
        'manager_id',
        'questionnaire_id',
        'published_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'published_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<Branch, $this>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * @return BelongsTo<County, $this>
     */
    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * @return BelongsTo<Questionnaire, $this>
     */
    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * Field collectors assigned to this project.
     *
     * @return BelongsToMany<User, $this>
     */
    public function assignedWorkers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_user')
            ->withPivot(['assigned_at', 'assigned_by']);
    }

    /**
     * @return HasMany<ProjectWardAssignment, $this>
     */
    public function wardAssignments(): HasMany
    {
        return $this->hasMany(ProjectWardAssignment::class);
    }

    /**
     * @return HasMany<ProjectCoverage, $this>
     */
    public function coverages(): HasMany
    {
        return $this->hasMany(ProjectCoverage::class);
    }

    /**
     * @return HasMany<ProjectFieldWorker, $this>
     */
    public function projectFieldWorkers(): HasMany
    {
        return $this->hasMany(ProjectFieldWorker::class);
    }

    /**
     * @return HasMany<Outlet, $this>
     */
    public function outlets(): HasMany
    {
        return $this->hasMany(Outlet::class);
    }
}
