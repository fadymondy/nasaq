{{-- <x-nq::profile-card.mention-text :text="$comment['text']" :mentions="$comment['mentions']" :resolve="$people" />
     Shows saved text with its mentions as chips.
     text: the saved text. mentions: a list of ['id', 'name', 'start', 'end'] character ranges (overlapping or out-of-range ones are skipped).
     resolve: finds the person behind a mention id, to give the chip a card: an array keyed by id, or a callable (id). Each entry is a person array, or ['person' => ..., 'kind' => ...].
     viewer-time-zone, now, message, mention, view-profile: passed to the cards. --}}
@props(['text', 'mentions' => [], 'resolve' => null, 'viewerTimeZone' => null, 'now' => null, 'message' => false, 'mention' => false, 'viewProfile' => false])
@php
    $segments = [];
    $cursor = 0;
    $len = mb_strlen($text);
    $sorted = array_values($mentions);
    usort($sorted, fn ($a, $b) => $a['start'] <=> $b['start']);
    foreach ($sorted as $m) {
        if ($m['start'] < $cursor || $m['end'] > $len || $m['end'] <= $m['start']) {
            continue;
        }
        if ($m['start'] > $cursor) {
            $segments[] = ['text', mb_substr($text, $cursor, $m['start'] - $cursor)];
        }
        $segments[] = ['mention', $m];
        $cursor = $m['end'];
    }
    if ($cursor < $len) {
        $segments[] = ['text', mb_substr($text, $cursor)];
    }
    $find = function ($id) use ($resolve) {
        $found = is_callable($resolve) ? $resolve($id) : (is_array($resolve) ? ($resolve[$id] ?? null) : null);
        if (is_array($found) && (array_key_exists('person', $found) || array_key_exists('kind', $found))) {
            return [$found['person'] ?? null, $found['kind'] ?? 'person'];
        }

        return [$found, 'person'];
    };
@endphp
<p data-slot="{{ $attributes->get('data-slot', 'mention-text') }}" {{ $attributes->except('data-slot')->cn('whitespace-pre-wrap text-body text-foreground') }}>
    @foreach ($segments as [$type, $value])
        @if ($type === 'text')<span>{{ $value }}</span>@else
            @php [$person, $kind] = $find($value['id']); @endphp
            <x-nq::profile-card.mention-chip :name="$value['name']" :kind="$kind" :person="$person" :viewer-time-zone="$viewerTimeZone" :now="$now" :message="$message" :mention="$mention" :view-profile="$viewProfile" />
        @endif
    @endforeach
</p>
