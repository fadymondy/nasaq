<x-nq::app-shell class="min-h-96">
    <x-slot:sidebar>
        <x-nq::app-shell.sidebar>
            <x-nq::app-shell.sidebar-header><x-nq::app-shell.sidebar-brand /></x-nq::app-shell.sidebar-header>
            <x-nq::app-shell.sidebar-content>
                <x-nq::app-shell.sidebar-group label="Workspace">
                    <x-nq::app-shell.sidebar-item :active="true" href="#"><x-slot:icon><x-lucide-house /></x-slot:icon> Overview</x-nq::app-shell.sidebar-item>
                    <x-nq::app-shell.sidebar-item href="#"><x-slot:icon><x-lucide-inbox /></x-slot:icon> Inbox<x-slot:trailing>3</x-slot:trailing></x-nq::app-shell.sidebar-item>
                    <x-nq::app-shell.sidebar-nest label="Projects">
                        <x-slot:icon><x-lucide-folder /></x-slot:icon>
                        <x-nq::app-shell.sidebar-sub-item href="#">Website</x-nq::app-shell.sidebar-sub-item>
                        <x-nq::app-shell.sidebar-sub-item href="#">Mobile app</x-nq::app-shell.sidebar-sub-item>
                    </x-nq::app-shell.sidebar-nest>
                </x-nq::app-shell.sidebar-group>
            </x-nq::app-shell.sidebar-content>
            <x-nq::app-shell.sidebar-footer>
                <x-nq::app-shell.sidebar-item href="#"><x-slot:icon><x-lucide-settings /></x-slot:icon> Settings</x-nq::app-shell.sidebar-item>
                <x-nq::app-shell.sidebar-status href="#">All systems normal</x-nq::app-shell.sidebar-status>
            </x-nq::app-shell.sidebar-footer>
        </x-nq::app-shell.sidebar>
    </x-slot:sidebar>
    <x-nq::app-shell.header>
        <x-nq::app-shell.sidebar-trigger />
        <x-nq::app-shell.breadcrumbs>
            <x-nq::app-shell.crumb href="#">Acme</x-nq::app-shell.crumb>
            <x-nq::app-shell.crumb :current="true">Website</x-nq::app-shell.crumb>
        </x-nq::app-shell.breadcrumbs>
    </x-nq::app-shell.header>
    <x-nq::app-shell.main>
        <x-nq::app-shell.page-header title="Overview" description="What happened in the last 7 days." />
    </x-nq::app-shell.main>
</x-nq::app-shell>

<x-nq::app-shell class="mt-6 min-h-72">
    <x-nq::app-shell.header>
        <x-nq::app-shell.breadcrumbs>
            <x-nq::app-shell.crumb href="#">Acme</x-nq::app-shell.crumb>
            <x-nq::app-shell.crumb :current="true">Billing</x-nq::app-shell.crumb>
        </x-nq::app-shell.breadcrumbs>
    </x-nq::app-shell.header>
    <x-nq::app-shell.nav :mobile-items="2">
        <x-nq::app-shell.nav-item :active="true" href="#"><x-slot:icon><x-lucide-house /></x-slot:icon> Overview</x-nq::app-shell.nav-item>
        <x-nq::app-shell.nav-item href="#"><x-slot:icon><x-lucide-credit-card /></x-slot:icon> Billing</x-nq::app-shell.nav-item>
        <x-nq::app-shell.nav-item href="#"><x-slot:icon><x-lucide-users /></x-slot:icon> Team</x-nq::app-shell.nav-item>
        <x-nq::app-shell.nav-item href="#"><x-slot:icon><x-lucide-settings /></x-slot:icon> Settings</x-nq::app-shell.nav-item>
    </x-nq::app-shell.nav>
    <x-nq::app-shell.main>
        <x-nq::app-shell.page-header title="Billing" />
    </x-nq::app-shell.main>
    <x-nq::app-shell.footer>
        <x-slot:start>Acme Inc.</x-slot:start>
        <x-nq::app-shell.footer-link href="#">Terms</x-nq::app-shell.footer-link>
    </x-nq::app-shell.footer>
</x-nq::app-shell>
