{{-- <x-nq::command-snippet command="$ npm i @nasaq/web" />
     A one-line command with a copy button that is always visible. Long commands scroll sideways. A leading "$ " is dropped from the copy.
     command, prompt ("$"; pass :prompt="false" to hide it), label ("Command" / "أمر"). Always left-to-right. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['command', 'prompt' => '$', 'label' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $clean = trim(preg_replace('/^\s*[$>#]\s+/', '', (string) $command));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'command-snippet') }}" dir="ltr" {{ $attributes->except('data-slot')->cn('flex h-control items-center gap-1 rounded-control border border-border bg-nq-surface-soft ps-3 pe-1 text-start') }}>
    @if ($prompt !== false)<span aria-hidden="true" class="select-none font-mono text-code text-muted-foreground">{{ $prompt }}</span>@endif
    <code role="region" tabindex="0" aria-label="{{ $label ?? $t('Command', 'أمر') }}"
        class="min-w-0 flex-1 overflow-x-auto whitespace-pre py-1 font-mono text-code text-foreground outline-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&::-webkit-scrollbar]:hidden">{{ $clean }}</code>
    <x-nq::copy-button :value="$clean" :label="$t('Copy command', 'نسخ الأمر')" :copied-label="$t('Command copied to clipboard', 'تم نسخ الأمر إلى الحافظة')" />
</div>
