<?php

namespace App\Notifications;

use App\Models\Project;

class ProjectAssignmentNotification extends BaseCollectorNotification
{
    public function __construct(
        public Project $project,
    ) {}

    protected function preferenceKey(): string
    {
        return 'project_assignment';
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $name = $this->project->name ?? 'Project #'.$this->project->id;

        return [
            'title' => 'New project assignment',
            'body' => 'You were assigned to '.$name.'.',
            'action_path' => '/admin/projects/'.$this->project->id,
            'page_key' => 'projects',
            'entity_type' => 'project',
            'entity_id' => (string) $this->project->id,
            'mobile_screen' => 'projects',
            'mobile_params' => [
                'project_id' => (string) $this->project->id,
            ],
        ];
    }
}
