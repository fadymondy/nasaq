{{-- <x-nq::breadcrumb> <x-nq::breadcrumb.list> items and separators </x-nq::breadcrumb.list> </x-nq::breadcrumb>
     The nav landmark. aria-label defaults to Breadcrumb / مسار التنقل by locale. Static: no Alpine needed. --}}
<nav data-slot="breadcrumb" {{ $attributes->merge(['aria-label' => \Nasaq\Nasaq::t('Breadcrumb', 'مسار التنقل')]) }}>{{ $slot }}</nav>
