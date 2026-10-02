{{-- <x-nq::domains-manager.chips :domains="$domains" :max="2" />
     A compact row of domain chips, each with its check state, and a "+N" chip that opens the rest in a popover. For table cells and cards.
     domains: [['id', 'host', 'check' => verified | pending | checking | failed]]. max: chips shown before the rest fold into "+N" (2); one hidden domain is shown instead.
     Needs the Alpine runtime (@nasaqScripts) for the popover. --}}
@props(['domains' => [], 'max' => 2])
@php
    $t = \Nasaq\Nasaq::class;
    $items = array_values((array) (is_object($domains) && method_exists($domains, 'all') ? $domains->all() : $domains));
    $limit = max(1, (int) floor($max));
    [$shown, $hidden] = count($items) <= $limit + 1 ? [$items, []] : [array_slice($items, 0, $limit), array_slice($items, $limit)];
    $checks = [
        'verified' => $t::t('Verified', 'موثّق'), 'pending' => $t::t('Waiting for DNS', 'بانتظار DNS'),
        'checking' => $t::t('Checking', 'قيد الفحص'), 'failed' => $t::t('Check failed', 'فشل الفحص'),
    ];
    $variants = ['verified' => 'success', 'pending' => 'warning', 'checking' => 'warning', 'failed' => 'danger'];
    $n = count($hidden);
    $moreLabel = $t::t("Show {$n} more domains", "عرض {$n} نطاقات أخرى");
    $moreText = $t::t("+{$n} more", "+{$n} أخرى");
@endphp
<ul data-slot="{{ $attributes->get('data-slot', 'domain-chips') }}" aria-label="{{ $t::t('Domains', 'النطاقات') }}" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center gap-1.5') }}>
    @foreach ($shown as $d)
        @php $c = $d['check'] ?? 'pending'; @endphp
        <li data-slot="domain-chip" data-check="{{ $c }}">
            <x-nq::badge :variant="$variants[$c] ?? 'warning'" :title="$checks[$c] ?? ''" class="h-6 gap-1.5">
                <bdi dir="ltr" class="font-mono">{{ $d['host'] }}</bdi>
                <span class="sr-only">{{ $checks[$c] ?? '' }}</span>
            </x-nq::badge>
        </li>
    @endforeach
    @if ($n > 0)
        <li data-slot="domain-chips-more">
            <x-nq::popover>
                <x-nq::popover.trigger variant="secondary" size="sm" :aria-label="$moreLabel" class="h-6 rounded-[4px] px-1.5 text-caption">
                    <bdi>{{ $moreText }}</bdi>
                </x-nq::popover.trigger>
                <x-nq::popover.content align="start" class="w-auto min-w-52">
                    <ul class="grid gap-1.5">
                        @foreach ($hidden as $d)
                            @php $c = $d['check'] ?? 'pending'; @endphp
                            <li data-slot="domain-chip" data-check="{{ $c }}">
                                <x-nq::badge :variant="$variants[$c] ?? 'warning'" :title="$checks[$c] ?? ''" class="h-6 gap-1.5">
                                    <bdi dir="ltr" class="font-mono">{{ $d['host'] }}</bdi>
                                    <span class="sr-only">{{ $checks[$c] ?? '' }}</span>
                                </x-nq::badge>
                            </li>
                        @endforeach
                    </ul>
                </x-nq::popover.content>
            </x-nq::popover>
        </li>
    @endif
</ul>
