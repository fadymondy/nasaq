{{-- <x-nq::api-reference.catalog :tools="$tools" x-on:nq:pick="open($event.detail.id)" />
     Every tool as a card, grouped by category: name, summary, scope and minimum role at a glance. Pressing a card fires nq:pick
     with detail { id }. tools: the same array as <x-nq::api-reference>. `bound` is set by <x-nq::api-reference>, which filters the
     cards from its own scope; leave it off. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['tools' => [], 'bound' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $accessLabels = ['read' => $t::t('Read only', 'قراءة فقط'), 'write' => $t::t('Changes data', 'يغيّر البيانات'), 'destructive' => $t::t('Destructive', 'مدمّر')];
    $accessVariant = ['write' => 'warning', 'destructive' => 'danger'];
    $groups = collect($tools)->groupBy(fn ($x) => $x['category'] ?? '');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'api-tool-catalog') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
    @foreach ($groups as $category => $list)
        <section class="flex flex-col gap-2" @if ($bound) x-show="groupShown({{ $loop->index }})" @endif>
            @if ($category !== '')
                <h3 class="eyebrow">{{ $category }}</h3>
            @endif
            <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
                @foreach ($list as $tool)
                    @php($access = $tool['access'] ?? 'read')
                    <li class="min-w-0" @if ($bound) x-show="matches(@js($tool['id']))" @endif>
                        <article data-tool="{{ $tool['id'] }}"
                            class="relative flex h-full flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-xs transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover">
                            <div class="flex items-start justify-between gap-2">
                                <h4 class="min-w-0 break-all font-mono text-label text-foreground">
                                    <button type="button" class="text-start outline-none after:absolute after:inset-0 after:content-['']" x-on:click="$dispatch('nq:pick', { id: $el.closest('[data-tool]').dataset.tool })"><bdi dir="ltr">{{ $tool['name'] }}</bdi></button>
                                </h4>
                                @if (! empty($tool['deprecated']))
                                    <x-nq::badge variant="warning">{{ $t::t('Deprecated', 'متقادمة') }}</x-nq::badge>
                                @endif
                            </div>
                            <p dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ $tool['summary'] }}</p>
                            <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                                <x-nq::badge variant="outline"><bdi dir="ltr" class="font-mono">{{ $tool['scope'] }}</bdi></x-nq::badge>
                                <x-nq::badge variant="info">{{ $tool['minRole'] }}</x-nq::badge>
                                @if ($access !== 'read')
                                    <x-nq::badge :variant="$accessVariant[$access] ?? 'neutral'">{{ $accessLabels[$access] ?? $access }}</x-nq::badge>
                                @endif
                            </div>
                        </article>
                    </li>
                @endforeach
            </ul>
        </section>
    @endforeach
</div>
