<x-nq::onboarding-checklist :items="[
    ['id' => 'profile', 'title' => 'Complete your profile', 'done' => true],
    ['id' => 'invite', 'title' => 'Invite a teammate', 'description' => 'Work is better together.', 'actionLabel' => 'Invite', 'icon' => 'users'],
    ['id' => 'connect', 'title' => 'Connect GitHub', 'actionLabel' => 'Connect'],
]"
    x-on:action="window.__action = $event.detail.id; $event.detail.wait(Promise.resolve())"
    x-on:dismiss="window.__dismissed = true"
    x-on:complete="window.__complete = true" />
