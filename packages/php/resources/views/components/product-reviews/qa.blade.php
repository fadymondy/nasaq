{{-- <x-nq::product-reviews.qa :questions="$questions" can-ask can-answer x-on:nq-ask="$event.detail.waitUntil(post($event.detail.question))" />
     Questions and answers for a product: an ask form, search and sort, upvotes on questions and answers, seller answers first and an
     answer form under each question. The list is drawn in the browser from the JSON you pass, so it needs the Alpine runtime (@nasaqScripts).
     questions: { id, author, question, date (ISO), votes?, answers: [{ id, author, body, date, seller?, votes? }] }[]
     answers-shown: answers visible before "show more" (2)   page-size: questions per page (5)   default-sort: votes | newest | answered
     loading / error: states ("error" may be text)   can-ask: show the ask form   can-answer: show an answer form under each question
     labels: an array overriding any built-in text. Listen on the root for nq-ask { question }, nq-answer { questionId, answer },
     nq-vote-question { questionId, voted } and nq-vote-answer { questionId, answerId, voted }; each carries waitUntil(promise):
     resolve nothing for success or { error: "…" } to show a message. --}}
@props(['questions' => [], 'answersShown' => 2, 'pageSize' => 5, 'defaultSort' => 'votes', 'loading' => false, 'error' => null, 'canAsk' => false, 'canAnswer' => false, 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $lb = fn (string $key, string $en, string $ar) => $labels[$key] ?? $t($en, $ar);
    $config = [
        'questions' => array_values((array) $questions), 'answersShown' => $answersShown, 'pageSize' => $pageSize, 'defaultSort' => $defaultSort,
        'loading' => (bool) $loading, 'error' => $error === true || filled($error) ? $error : false,
        'canAsk' => (bool) $canAsk, 'canAnswer' => (bool) $canAnswer, 'labels' => (object) $labels,
    ];
    $sorts = [
        'votes' => $lb('sortVotes', 'Most upvoted', 'الأكثر تأييدًا'),
        'newest' => $lb('sortNewest', 'Newest', 'الأحدث'),
        'answered' => $lb('sortAnswered', 'Most answered', 'الأكثر إجابة'),
    ];
    $hide = 'display: none';
@endphp
<section data-slot="product-qa" x-data="nqProductQA(@js($config))" x-id="['nq-qa']" :aria-labelledby="$id('nq-qa')" {{ $attributes->cn('flex flex-col gap-5') }}>
    <header class="flex flex-col gap-1">
        <h2 :id="$id('nq-qa')" class="text-h2 text-foreground" x-text="t.qaTitle"></h2>
        <p class="text-caption text-muted-foreground" x-text="qaCountText"></p>
    </header>

    @if ($canAsk)
        <form novalidate class="flex flex-col gap-2" x-on:submit.prevent="submitAsk()">
            <label :for="$id('nq-qa', 'ask')" class="text-label text-foreground" x-text="t.askTitle"></label>
            <x-nq::field.textarea x-bind:id="$id('nq-qa', 'ask')" rows="2" x-model="ask" x-bind:placeholder="t.askPlaceholder"
                x-bind:aria-invalid="askError ? 'true' : null" x-on:input="if (askState === 'done') askState = 'idle'" />
            <p x-show="askError" style="{{ $hide }}" role="alert" class="text-caption text-nq-danger-text" x-text="askError"></p>
            <div class="flex items-center justify-between gap-3">
                <p role="status" class="text-caption text-nq-success-text" x-text="askState === 'done' ? t.askThanks : ''"></p>
                <x-nq::button type="submit" variant="primary" x-bind:disabled="askState === 'sending'" x-bind:aria-busy="askState === 'sending' ? 'true' : null">
                    <template x-if="askState === 'sending'"><x-nq::spinner /></template>
                    <span x-text="askState === 'sending' ? t.asking : t.askSubmit"></span>
                </x-nq::button>
            </div>
        </form>
    @endif

    <div x-show="errorText" style="{{ $hide }}" role="alert" class="flex flex-col items-start gap-3 rounded-card border border-nq-danger-border bg-nq-danger-subtle p-4 text-body-sm text-nq-danger-text">
        <span x-text="errorText"></span>
        <x-nq::button type="button" variant="secondary" size="sm" x-on:click="$dispatch('nq-retry')"><span x-text="t.retry"></span></x-nq::button>
    </div>

    <div x-show="loading && !errorText" style="{{ $hide }}" role="status" aria-busy="true" :aria-label="t.loading" class="flex flex-col gap-4">
        @foreach ([0, 1] as $i)
            <div class="flex flex-col gap-2">
                <div class="h-4 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none"></div>
                <div class="h-4 w-1/2 animate-pulse rounded bg-secondary motion-reduce:animate-none"></div>
            </div>
        @endforeach
    </div>

    <div x-show="empty" style="{{ $hide }}" class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-8 text-center">
        <x-lucide-message-circle-question aria-hidden="true" class="size-8 text-muted-foreground" />
        <p class="text-h3 text-foreground" x-text="t.noQuestions"></p>
        <p class="text-body-sm text-muted-foreground" x-text="t.noQuestionsHint"></p>
    </div>

    <template x-if="ready">
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-center gap-2">
                <div class="relative min-w-48 flex-1">
                    <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="search" x-model="query" :aria-label="t.searchQuestions" :placeholder="t.searchQuestions"
                        class="h-control w-full rounded-control border border-border bg-card ps-9 pe-3 text-body outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                </div>
                <x-nq::select x-model="sort">
                    <x-nq::select.trigger :aria-label="$lb('sortQuestions', 'Sort questions', 'ترتيب الأسئلة')" class="w-auto min-w-40"><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($sorts as $key => $label)
                            <x-nq::select.item :value="$key">{{ $label }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
            </div>
            <p role="status" aria-live="polite" class="sr-only"><span x-text="shownCountText"></span> <span x-text="voteError"></span></p>
            <p x-show="voteError" style="{{ $hide }}" class="text-caption text-nq-danger-text" x-text="voteError"></p>

            <p x-show="shown.length === 0" style="{{ $hide }}" class="py-6 text-center text-body text-muted-foreground" x-text="t.noQuestionMatches"></p>

            <ul x-show="shown.length > 0" style="{{ $hide }}" class="flex flex-col divide-y divide-border">
                <template x-for="q in page" :key="q.id">
                    <li class="flex flex-col gap-3 py-5" :data-question-id="q.id">
                        <div class="flex items-start gap-3">
                            <div class="min-w-0 flex-1">
                                <h3 class="text-h3 text-foreground" x-text="q.question"></h3>
                                <p class="text-caption text-muted-foreground">
                                    <span x-text="askedBy(q)"></span> · <time :datetime="q.date" x-text="date(q.date)"></time> · <span x-text="answersCount(q)"></span>
                                </p>
                            </div>
                            <x-nq::button data-upvote type="button" size="sm" x-bind:class="voteOf(q.id, q.votes || 0).voted ? 'bg-card border-border hover:bg-nq-hover' : ''"
                                x-bind:aria-pressed="String(voteOf(q.id, q.votes || 0).voted)" x-bind:aria-label="upvoteLabel(q.id, q.votes || 0)" x-on:click="voteQuestion(q)" variant="ghost">
                                <x-lucide-arrow-up aria-hidden="true" />
                                <bdi class="tabular-nums" x-text="fmt(voteOf(q.id, q.votes || 0).count)"></bdi>
                            </x-nq::button>
                        </div>
                        <p x-show="q.answers.length === 0" style="{{ $hide }}" class="text-body-sm text-muted-foreground" x-text="t.noAnswers"></p>
                        <ul x-show="q.answers.length > 0" style="{{ $hide }}" class="flex flex-col gap-3 ps-4">
                            <template x-for="a in answersOf(q)" :key="a.id">
                                <li class="flex items-start gap-3 border-s-2 border-border ps-3">
                                    <div class="min-w-0 flex-1">
                                        <p class="text-body text-foreground" x-text="a.body"></p>
                                        <p class="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                                            <x-nq::badge x-show="a.seller" style="{{ $hide }}" variant="brand">
                                                <x-lucide-badge-check aria-hidden="true" />
                                                <span x-text="t.fromSeller"></span>
                                            </x-nq::badge>
                                            <span><span x-text="a.author"></span> · <time :datetime="a.date" x-text="date(a.date)"></time></span>
                                        </p>
                                    </div>
                                    <x-nq::button data-upvote type="button" size="sm" variant="ghost" x-bind:class="voteOf(q.id + ':' + a.id, a.votes || 0).voted ? 'bg-card border-border hover:bg-nq-hover' : ''"
                                        x-bind:aria-pressed="String(voteOf(q.id + ':' + a.id, a.votes || 0).voted)" x-bind:aria-label="upvoteLabel(q.id + ':' + a.id, a.votes || 0)" x-on:click="voteAnswer(q, a)">
                                        <x-lucide-arrow-up aria-hidden="true" />
                                        <bdi class="tabular-nums" x-text="fmt(voteOf(q.id + ':' + a.id, a.votes || 0).count)"></bdi>
                                    </x-nq::button>
                                </li>
                            </template>
                        </ul>
                        <button x-show="moreAnswers(q)" style="{{ $hide }}" type="button" :aria-expanded="open.includes(q.id) ? 'true' : 'false'" x-on:click="toggleOpen(q.id)"
                            class="self-start ps-4 text-label text-nq-accent-text outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus" x-text="toggleLabel(q)"></button>
                        <div x-show="canAnswer" style="{{ $hide }}" class="flex flex-col gap-2 ps-4">
                            <x-nq::field.textarea rows="2" x-bind:aria-label="t.answer + ': ' + q.question" x-bind:placeholder="t.answerPlaceholder"
                                x-bind:value="answerDraft[q.id] || ''" x-on:input="answerDraft = { ...answerDraft, [q.id]: $event.target.value }" x-bind:aria-invalid="answerError[q.id] ? 'true' : null" />
                            <p x-show="answerError[q.id]" style="{{ $hide }}" role="alert" class="text-caption text-nq-danger-text" x-text="answerError[q.id]"></p>
                            <x-nq::button type="button" variant="secondary" size="sm" class="self-end" x-bind:disabled="answerBusy === q.id" x-bind:aria-busy="answerBusy === q.id ? 'true' : null" x-on:click="submitAnswer(q)">
                                <template x-if="answerBusy === q.id"><x-nq::spinner /></template>
                                <span x-text="t.answerSubmit"></span>
                            </x-nq::button>
                        </div>
                    </li>
                </template>
            </ul>

            <x-nq::button x-show="shown.length > visible" style="{{ $hide }}" type="button" variant="secondary" class="self-center" x-on:click="showMore()"><span x-text="t.showMore"></span></x-nq::button>
        </div>
    </template>
</section>
