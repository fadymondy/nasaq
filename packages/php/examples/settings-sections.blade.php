<div x-data="{ saved: false, draft: false }"
    x-on:nq-settings-save="$event.detail.waitUntil(new Promise((done) => setTimeout(() => { saved = draft; done(); }, 300)))"
    x-on:nq-settings-discard="draft = saved">
    <x-nq::settings-sections title="Settings" value="notifications" :groups="[
        [
            'id' => 'general',
            'label' => 'General',
            'pages' => [
                ['id' => 'notifications', 'label' => 'Notifications', 'icon' => 'bell', 'entries' => [['id' => 'email', 'label' => 'Email digest']]],
                ['id' => 'security', 'label' => 'Security', 'icon' => 'shield'],
            ],
        ],
    ]">
        <x-nq::settings-sections.page id="notifications">
            <x-nq::settings-sections.setting-row id="email" label="Email digest" description="A weekly summary.">
                <x-nq::switch x-model="draft" x-effect="$dispatch('nq-settings-dirty', draft !== saved ? 1 : 0)" aria-label="Email digest" />
            </x-nq::settings-sections.setting-row>
        </x-nq::settings-sections.page>
        <x-nq::settings-sections.page id="security">
            <x-nq::settings-sections.setting-row id="two-factor" label="Two-factor sign-in" description="Ask for a code on new devices." />
        </x-nq::settings-sections.page>
    </x-nq::settings-sections>
</div>
