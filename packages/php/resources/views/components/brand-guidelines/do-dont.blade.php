{{-- <x-nq::brand-guidelines.do-dont :dos="[['id' => 'a', 'title' => 'Use the mark as supplied']]" :donts="[['id' => 'b', 'title' => 'Do not recolour it']]" />
     Two columns of rules, each with a check or a cross and a word ("Do", "Don't"), so meaning never rests on colour.
     dos / donts: lists of ['id', 'title', 'description'?, 'example'? (trusted HTML shown above the title)]. --}}
@props(['dos' => [], 'donts' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $columns = [['do', $t('Do', 'افعل'), $dos, 'check'], ['dont', $t('Don\'t', 'لا تفعل'), $donts, 'x']];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'brand-do-dont') }}" {{ $attributes->except('data-slot')->cn('grid gap-6 sm:grid-cols-2') }}>
    @foreach ($columns as [$kind, $word, $rules, $icon])
        <section aria-label="{{ $word }}" class="flex min-w-0 flex-col gap-3">
            <h4 class="{{ $kind === 'do' ? 'flex items-center gap-2 text-label text-nq-success-text' : 'flex items-center gap-2 text-label text-nq-danger-text' }}">
                <x-nq::icon :name="$icon" aria-hidden="true" class="size-4" />
                {{ $word }}
            </h4>
            <ul class="flex flex-col gap-3">
                @foreach ($rules as $rule)
                    <li class="{{ $kind === 'do' ? 'flex flex-col gap-1 rounded-card border bg-card p-3 border-nq-success/40' : 'flex flex-col gap-1 rounded-card border bg-card p-3 border-nq-danger/40' }}">
                        @if (! empty($rule['example']))<div class="mb-1 flex items-center justify-center rounded-control bg-secondary p-4">{!! $rule['example'] !!}</div>@endif
                        <span class="text-label text-foreground">{{ $rule['title'] }}</span>
                        @if (! empty($rule['description']))<span class="text-body-sm text-muted-foreground">{{ $rule['description'] }}</span>@endif
                    </li>
                @endforeach
            </ul>
        </section>
    @endforeach
</div>
