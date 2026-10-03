{{-- <x-nq::code-copy-menu :code="$source" language="ts" filename="greet.ts" />
     A split copy control: the button copies the code at once, the chevron opens a menu with Copy as Markdown, prompts for
     Claude, ChatGPT and Cursor, and "Open in" links that open the assistant with the prompt filled in.
     code, language, filename, instruction (what the assistant should do), targets (["claude","chatgpt","cursor"], [] for none),
     open-links (true). Fires nq-code-copy ({ kind: code|markdown|prompt|open, text, target }); from a menu item it bubbles from <body> (the menu is teleported), so listen on window.
     Used by <x-nq::code-block-ai> and <x-nq::code-tabs ai-copy>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['code', 'language' => null, 'filename' => null, 'instruction' => null, 'targets' => ['claude', 'chatgpt', 'cursor'], 'openLinks' => true])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $source = preg_replace('/\n$/', '', (string) $code);
    $names = ['claude' => 'Claude', 'chatgpt' => 'ChatGPT', 'cursor' => 'Cursor'];
    $defaults = [
        'claude' => 'Read this snippet, explain what it does, and show how to use it in my project.',
        'chatgpt' => 'Explain what this snippet does and how to use it in my project.',
        'cursor' => 'Apply this snippet to my codebase. Match the existing style and keep the change small.',
    ];
    $fence = '```';
    while (str_contains($source, $fence)) {
        $fence .= '`';
    }
    $lang = $language && $language !== 'text' ? $language : '';
    $markdown = ($filename ? "**{$filename}**\n\n" : '').$fence.$lang."\n".$source."\n".$fence;
    $targets = array_values(array_filter((array) $targets, fn ($x) => isset($names[$x])));
    $prompts = [];
    $links = [];
    foreach ($targets as $target) {
        $prompts[$target] = ($instruction ?? $defaults[$target])."\n\n".$markdown."\n";
        $q = rawurlencode($prompts[$target]);
        $url = match ($target) {
            'claude' => 'https://claude.ai/new?q='.$q,
            'chatgpt' => 'https://chatgpt.com/?q='.$q,
            default => 'cursor://anysphere.cursor-deeplink/prompt?text='.$q,
        };
        $links[$target] = strlen($url) > 6000 ? null : $url;
    }
    $config = [
        'code' => $source,
        'markdown' => $markdown,
        'prompts' => $prompts,
        'links' => $links,
        't' => [
            'code' => $t('Code copied to clipboard', 'تم نسخ الشيفرة إلى الحافظة'),
            'markdown' => $t('Markdown copied to clipboard', 'تم نسخ Markdown إلى الحافظة'),
            'prompt' => $t('Prompt for :name copied to clipboard', 'تم نسخ الموجّه الخاص بـ :name إلى الحافظة'),
            'failed' => $t('Could not copy', 'تعذر النسخ'),
            'tooLong' => $t('Too long for a link. Prompt copied instead.', 'النص أطول من أن يُفتح برابط. تم نسخ الموجّه بدلًا من ذلك.'),
        ],
        'names' => $names,
    ];
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'code-copy-menu') }}" x-data="nqCodeCopyMenu({!! \Illuminate\Support\Js::from($config) !!})" {{ $attributes->except('data-slot')->cn('inline-flex items-center') }}>
    <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$t('Copy code', 'نسخ الشيفرة')"
        x-on:click="copyCode()" x-bind:data-copied="done ? '' : null" class="data-copied:text-nq-success-text">
        <x-lucide-copy aria-hidden="true" x-show="! done" />
        <x-lucide-check aria-hidden="true" x-show="done" style="display: none" />
    </x-nq::button>
    <x-nq::dropdown-menu>
        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" :aria-label="$t('Copy options', 'خيارات النسخ')" data-slot="code-copy-menu-trigger" class="-ms-1 w-5">
            <x-lucide-chevron-down aria-hidden="true" class="size-3.5" />
        </x-nq::dropdown-menu.trigger>
        <x-nq::dropdown-menu.content align="end" class="min-w-56">
            <x-nq::dropdown-menu.item x-on:click="copyCode()"><x-lucide-copy aria-hidden="true" /> {{ $t('Copy code', 'نسخ الشيفرة') }}</x-nq::dropdown-menu.item>
            <x-nq::dropdown-menu.item x-on:click="copyMarkdown()"><x-lucide-file-text aria-hidden="true" /> {{ $t('Copy as Markdown', 'نسخ بصيغة Markdown') }}</x-nq::dropdown-menu.item>
            @if ($targets)
                <x-nq::dropdown-menu.separator />
                <x-nq::dropdown-menu.label>{{ $t('Use with AI', 'استخدم مع الذكاء الاصطناعي') }}</x-nq::dropdown-menu.label>
                @foreach ($targets as $target)
                    <x-nq::dropdown-menu.item x-on:click="copyPrompt({!! \Illuminate\Support\Js::from($target) !!})"><x-lucide-sparkles aria-hidden="true" /> <span>{{ $t('Copy prompt for', 'نسخ موجّه لـ') }} <bdi dir="ltr">{{ $names[$target] }}</bdi></span></x-nq::dropdown-menu.item>
                @endforeach
                @if ($openLinks)
                    <x-nq::dropdown-menu.separator />
                    @foreach ($targets as $target)
                        <x-nq::dropdown-menu.item x-on:click="open({!! \Illuminate\Support\Js::from($target) !!})"><x-lucide-external-link aria-hidden="true" class="rtl:-scale-x-100" /> <span>{{ $t('Open in', 'فتح في') }} <bdi dir="ltr">{{ $names[$target] }}</bdi></span></x-nq::dropdown-menu.item>
                    @endforeach
                @endif
            @endif
        </x-nq::dropdown-menu.content>
    </x-nq::dropdown-menu>
    <span role="status" aria-live="polite" class="sr-only" x-text="status"></span>
</span>
