<x-nq::account-settings value="profile">
    <x-nq::account-settings.panel id="profile">
        <x-nq::account-settings.settings-section title="Profile" description="How you appear to other people." footer="Last changed 3 days ago" />
    </x-nq::account-settings.panel>
    <x-nq::account-settings.panel id="security">
        <x-nq::account-settings.settings-section title="Security" description="Your password and signed-in devices." />
    </x-nq::account-settings.panel>
    <x-nq::account-settings.panel id="connected">
        <x-nq::account-settings.settings-section title="Connected accounts" description="Sign-in providers linked to this account." />
    </x-nq::account-settings.panel>
    <x-nq::account-settings.panel id="notifications">
        <x-nq::account-settings.settings-section title="Notifications" description="Coming soon" />
    </x-nq::account-settings.panel>
    <x-nq::account-settings.panel id="danger">
        {{-- Your API call; the dialog waits for it. Resolve { error: "…" } or reject to keep the dialog open. --}}
        <x-nq::account-settings.danger-zone x-on:nq-account-delete="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 600)))" />
    </x-nq::account-settings.panel>
</x-nq::account-settings>
