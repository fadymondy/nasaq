{{-- <x-nq::app-shell.breadcrumbs> <x-nq::app-shell.crumb href="/">Acme</x-nq::app-shell.crumb> <x-nq::app-shell.crumb current>Website</x-nq::app-shell.crumb> </x-nq::app-shell.breadcrumbs>
     Where you are, as a path: organisation / project / environment. Put it in the header. Below md only the last step shows. Static: no Alpine needed. --}}
<nav data-slot="{{ $attributes->get('data-slot', 'app-breadcrumbs') }}" {{ $attributes->except('data-slot')->merge(['aria-label' => \Nasaq\Nasaq::t('Breadcrumb', 'المسار')])->cn('min-w-0') }}>
    <ol class="flex min-w-0 items-center gap-1">{{ $slot }}</ol>
</nav>
