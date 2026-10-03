{{-- <x-nq::feedback-reporter.hub :issues="$issues" page="/checkout" x-on:nq-feedback-vote="$event.detail.waitUntil(vote($event.detail.id))" x-on:nq-report-new="openDialog()" />
     What people already reported on this page, with a status filter and a "Me too" vote, so a visitor adds a vote instead of a duplicate. Report writing lives in your own report dialog: this is the list around it.
     issues: [['id', 'title', 'status' (open | in-progress | resolved), 'createdAt' (optional), 'votes' (optional), 'voted' (optional), 'author' (optional), 'mine' (optional: the visitor sent it)]].
     mine-tab: show the "Mine" tab (default: when any issue is mine). counts: server totals by tab (all, open, in-progress, resolved, mine) when issues is only the first page; missing ones are counted from issues.
     has-more: more reports exist than issues holds, so a "Load more" row shows; it fires nq-load-more (detail.waitUntil(promise)) and the button spins until that settles. loading-more: render it spinning.
     page: the address the reports are about. report-new (default true): the "Report a problem" button. can-vote (default true): the "Me too" buttons. can-open (default false): titles become buttons.
     labels: array overrides, by key (mine, yours, emptyMineTitle, emptyMine, loadMore, showing, hubTitle, hubDescription, page, reportNew, all, open, inProgress, resolved, emptyTitle, emptyBody, emptyFiltered, meToo, voted, votes, by, filterLabel, listLabel).
     Events, bubbling from the root: nq-report-new; nq-open-issue (detail.id); nq-feedback-filter (detail.filter, to fetch that tab); nq-load-more; nq-feedback-vote (detail.id and detail.waitUntil(promise); resolve { error } or reject on failure).
     The status filter and the vote busy state need the Alpine runtime (@nasaqScripts). Re-render with the new votes after a vote. --}}
@props(['issues' => [], 'page' => null, 'reportNew' => true, 'canVote' => true, 'canOpen' => false, 'labels' => [], 'mineTab' => null, 'counts' => [], 'hasMore' => false, 'loadingMore' => false])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $fill = fn (string $text, array $vars) => str_replace(array_map(fn ($k) => '{'.$k.'}', array_keys($vars)), array_values($vars), $text);
    $tally = ['all' => count($issues), 'open' => 0, 'in-progress' => 0, 'resolved' => 0, 'mine' => 0];
    foreach ($issues as $issue) { $tally[$issue['status']]++; if (! empty($issue['mine'])) { $tally['mine']++; } }
    $counts = array_merge($tally, $counts);
    $tabs = [
        'all' => $L('all', 'All', 'الكل'),
        'open' => $L('open', 'Open', 'مفتوحة'),
        'in-progress' => $L('inProgress', 'In progress', 'قيد المعالجة'),
        'resolved' => $L('resolved', 'Resolved', 'تم حلها'),
    ];
    if ($mineTab ?? $tally['mine'] > 0) { $tabs['mine'] = $L('mine', 'Mine', 'بلاغاتي'); }
    $showing = $L('showing', 'Showing {shown} of {total}', 'يعرض {shown} من {total}');
    $badges = ['resolved' => 'success', 'in-progress' => 'info', 'open' => 'neutral'];
    $title = $L('hubTitle', 'Reports on this page', 'البلاغات على هذه الصفحة');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'feedback-hub') }}" aria-label="{{ $title }}" x-data="nqFeedbackHub(@js(['counts' => $counts, 'showing' => $showing]))"
    {{ $attributes->except('data-slot')->cn('flex w-full max-w-2xl flex-col gap-4 rounded-card border border-border bg-card p-4') }}>
    <header class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            <h2 class="text-h3">{{ $title }}</h2>
            <p class="text-body-sm text-muted-foreground">{{ $L('hubDescription', 'What other people already told us about this page. Add your vote instead of sending a duplicate.', 'ما أخبرنا به الآخرون عن هذه الصفحة. أضف صوتك بدل إرسال بلاغ مكرر.') }}</p>
            @if ($page)
                <p class="text-caption text-muted-foreground">{{ $L('page', 'Page', 'الصفحة') }} <bdi dir="ltr" class="font-mono text-foreground">{{ $page }}</bdi></p>
            @endif
        </div>
        @if ($reportNew)
            <x-nq::button variant="primary" size="sm" class="shrink-0" x-on:click="reportNew()"><x-lucide-bug aria-hidden="true" />{{ $L('reportNew', 'Report a problem', 'الإبلاغ عن مشكلة') }}</x-nq::button>
        @endif
    </header>
    <x-nq::toggle-group :default-value="['all']" x-model="filter" class="flex-wrap" aria-label="{{ $L('filterLabel', 'Filter by status', 'تصفية حسب الحالة') }}">
        @foreach ($tabs as $value => $text)
            <x-nq::toggle-group.toggle :value="$value">{{ $text }}<span class="text-caption tabular-nums opacity-70">{{ $counts[$value] }}</span></x-nq::toggle-group.toggle>
        @endforeach
    </x-nq::toggle-group>
    @if (count($issues) > 0)
        <ul role="list" aria-label="{{ $L('listLabel', 'Reports on this page', 'البلاغات على هذه الصفحة') }}" x-show="visible() > 0" class="flex flex-col rounded-control border border-border">
            @foreach ($issues as $issue)
                @php
                    $id = (string) $issue['id'];
                    $voted = (bool) ($issue['voted'] ?? false);
                    $blocked = $voted || $issue['status'] === 'resolved';
                    $hasVotes = array_key_exists('votes', $issue) && $issue['votes'] !== null;
                @endphp
                <li data-id="{{ $id }}" data-status="{{ $issue['status'] }}" @if (! empty($issue['mine'])) data-mine @endif x-show="shows(@js($issue['status']), {{ ! empty($issue['mine']) ? 'true' : 'false' }})" class="flex items-start gap-3 border-t border-border p-3 first:border-t-0">
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        @if ($canOpen)
                            <button type="button" dir="auto" x-on:click="open({{ $loop->index }})" class="w-fit max-w-full truncate rounded-control text-start text-label underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $issue['title'] }}</button>
                        @else
                            <span dir="auto" class="truncate text-label">{{ $issue['title'] }}</span>
                        @endif
                        <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                            <x-nq::badge :variant="$badges[$issue['status']] ?? 'neutral'">{{ $tabs[$issue['status']] ?? $issue['status'] }}</x-nq::badge>
                            @if (! empty($issue['mine']))<x-nq::badge variant="neutral">{{ $L('yours', 'Yours', 'بلاغك') }}</x-nq::badge>@elseif (! empty($issue['author']))<span dir="auto">{{ $fill($L('by', 'by {name}', 'بواسطة {name}'), ['name' => $issue['author']]) }}</span>@endif
                            @if (isset($issue['createdAt']))<x-nq::numeric.date-time :value="$issue['createdAt']" relative />@endif
                        </span>
                    </div>
                    @if ($canVote)
                        <x-nq::button :variant="$voted ? 'secondary' : 'ghost'" size="sm" aria-pressed="{{ $voted ? 'true' : 'false' }}" :disabled="$blocked"
                            :title="$hasVotes ? $fill($L('votes', '{count} people have this', '{count} أشخاص لديهم المشكلة'), ['count' => $issue['votes']]) : null"
                            x-on:click="vote({{ $loop->index }})" x-bind:disabled="blocked({{ $loop->index }}, {{ $blocked ? 'true' : 'false' }})" x-bind:aria-busy="busy === {{ $loop->index }} ? 'true' : null">
                            @if ($voted)<x-lucide-check aria-hidden="true" />@else<x-lucide-thumbs-up aria-hidden="true" />@endif
                            <span>{{ $voted ? $L('voted', 'You said this too', 'قلت ذلك أيضاً') : $L('meToo', 'Me too', 'وأنا أيضاً') }}</span>
                            @if ($hasVotes)<span class="tabular-nums text-muted-foreground">{{ $issue['votes'] }}</span>@endif
                        </x-nq::button>
                    @endif
                </li>
            @endforeach
        </ul>
    @endif
    @php $none = count($issues) > 0 ? 'display: none' : null; @endphp
    <x-nq::states.empty icon="bug" x-show="visible() === 0 && current() === 'all'" :style="$none" :title="$L('emptyTitle', 'Nothing reported here', 'لا بلاغات هنا')" :description="$L('emptyBody', 'No one has reported a problem on this page yet.', 'لم يبلّغ أحد عن مشكلة في هذه الصفحة بعد.')" class="py-8" />
    <x-nq::states.empty icon="bug" x-show="visible() === 0 && current() === 'mine'" style="display: none" :title="$L('emptyMineTitle', 'You have not reported anything', 'لم تبلغ عن شيء بعد')" :description="$L('emptyMine', 'Reports you send from this page show up here, with their status.', 'البلاغات التي ترسلها من هذه الصفحة تظهر هنا مع حالتها.')" class="py-8" />
    <x-nq::states.empty icon="bug" x-show="visible() === 0 && current() !== 'all' && current() !== 'mine'" style="display: none" :title="$L('emptyTitle', 'Nothing reported here', 'لا بلاغات هنا')" :description="$L('emptyFiltered', 'No reports with this status.', 'لا توجد بلاغات بهذه الحالة.')" class="py-8" />
    @if ($hasMore)
        <div class="flex items-center justify-between gap-3">
            <span class="text-caption text-muted-foreground tabular-nums" x-text="showingText()">{{ $fill($showing, ['shown' => count($issues), 'total' => $counts['all']]) }}</span>
            <x-nq::button variant="secondary" size="sm" :loading="$loadingMore" x-on:click="loadMore()" x-bind:disabled="loadingMore" x-bind:aria-busy="loadingMore ? 'true' : null">{{ $L('loadMore', 'Load more', 'عرض المزيد') }}</x-nq::button>
        </div>
    @endif
</section>
