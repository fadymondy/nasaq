{{-- <x-nq::personal-widgets.social-links :links="[['kind' => 'github', 'label' => 'GitHub', 'href' => 'https://github.com/x', 'handle' => '@x'], ['kind' => 'email', 'label' => 'Email', 'href' => 'mailto:hi@x.dev']]" />
     Links to the owner's other places. links: each ['kind' => github | linkedin | x | youtube | instagram | email | website | other, 'label', 'href', 'handle' (optional)].
     layout: chips (default, a wrapping row of small buttons) | list (one link per line with the handle). External links open in a new tab; mailto: links do not.
     GitHub shows its official mark; other brands show their name as text. --}}
@props(['links' => [], 'layout' => 'chips'])
@php
    $chips = $layout !== 'list';
    $link = 'inline-flex items-center gap-2 rounded-control text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus '
        .($chips ? 'h-control-sm border border-border bg-card px-2.5 hover:bg-nq-hover' : 'py-1 hover:underline hover:decoration-nq-line-strong hover:underline-offset-4');
@endphp
<ul data-slot="{{ $attributes->get('data-slot', 'social-links') }}" {{ $attributes->except('data-slot')->cn('flex list-none gap-2 p-0 '.($chips ? 'flex-wrap' : 'flex-col')) }}>
    @foreach ((array) $links as $l)
        @php
            $l = (array) $l;
            $external = (bool) preg_match('#^https?://#i', $l['href'] ?? '');
        @endphp
        <li>
            <a href="{{ $l['href'] ?? '#' }}" @if ($external) target="_blank" rel="noopener noreferrer" @endif class="{{ $link }}">
                @if (($l['kind'] ?? '') === 'github')<x-nq::oauth-buttons.github-logo class="size-4" />@endif
                @if (($l['kind'] ?? '') === 'email')<x-nq::icon name="mail" class="size-4 text-muted-foreground" />@endif
                @if (($l['kind'] ?? '') === 'website')<x-nq::icon name="globe" class="size-4 text-muted-foreground" />@endif
                <span>{{ $l['label'] ?? '' }}</span>
                @if (! $chips && ! empty($l['handle']))<span dir="ltr" class="text-muted-foreground">{{ $l['handle'] }}</span>@endif
            </a>
        </li>
    @endforeach
</ul>
