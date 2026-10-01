{{-- <x-nq::repository-picker search-url="/api/repos?q={query}" branches-url="/api/repos/{id}/branches" :account="['login' => 'acme']" />
     Pick a GitHub repository and a branch through the app installation. It calls no API itself: answer the bubbling events with
     detail.wait(promise), or give search-url / branches-url (JSON; {query}, {id}, {fullName} are filled in).
       nq-repo-search { query } -> repos [{ id, fullName, description?, private?, language?, defaultBranch?, stars?, updatedAt? }]
       nq-repo-branches { repo } -> branches [{ name, default?, protected? }]
       nq-repo-change { repo, branch }     nq-repo-configure
     repo / branch: the starting selection (repo is the object above). hide-branch: repository only. disabled.
     account: ['login' => 'acme', 'avatar' => url]. configure: show the "Configure access" button. name: posts name (owner/repo) and name_branch.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['repo' => null, 'branch' => null, 'searchUrl' => null, 'branchesUrl' => null, 'account' => null, 'configure' => false, 'hideBranch' => false, 'disabled' => false, 'name' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $login = $account['login'] ?? 'GitHub';
    $strings = [
        'loading' => $t('Loading', 'جارٍ التحميل'),
        'failed' => $t('Could not load. Check your connection.', 'تعذّر التحميل. تحقق من اتصالك.'),
        'results' => $t('{n} results', '{n} نتيجة'),
    ];
    $config = [
        'repo' => $repo, 'branch' => $branch, 'hideBranch' => (bool) $hideBranch, 'disabled' => (bool) $disabled,
        'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 'searchUrl' => (string) $searchUrl, 'branchesUrl' => (string) $branchesUrl, 'strings' => $strings,
    ];
    $triggerClass = 'flex h-control w-full min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-start text-body outline-none transition-colors hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50';
    $optionClass = 'flex cursor-pointer items-start gap-2 rounded-control px-2 py-1.5';
@endphp
<div data-slot="repository-picker" x-data="nqRepositoryPicker(@js($config))" x-id="['nq-repo']"
    {{ $attributes->cn(['grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]', 'sm:grid-cols-1' => $hideBranch]) }}>
    @if ($name)
        <input type="hidden" name="{{ $name }}" x-bind:value="repo ? repo.fullName : ''">
        <input type="hidden" name="{{ $name }}_branch" x-bind:value="branch ?? ''">
    @endif

    <div class="flex min-w-0 flex-col gap-1.5">
        <span class="text-label text-foreground">{{ $t('Repository', 'المستودع') }}</span>
        <x-nq::popover x-model="repoOpen">
            <x-nq::popover.trigger :disabled="$disabled" class="{{ $triggerClass }}"
                x-bind:aria-label="`{{ $t('Repository', 'المستودع') }}: ` + (repo ? repo.fullName : `{{ $t('Choose a repository', 'اختر مستودعًا') }}`)">
                <x-nq::oauth-buttons.github-logo width="16" height="16" class="shrink-0" />
                <bdi dir="ltr" class="min-w-0 flex-1 truncate" @if (! $repo) style="display: none" @endif x-show="repo">
                    <span class="text-muted-foreground" x-text="owner ? owner + '/' : ''"></span>
                    <span class="font-semibold text-foreground" x-text="repoName"></span>
                </bdi>
                <span class="min-w-0 flex-1 truncate text-muted-foreground" @if ($repo) style="display: none" @endif x-show="! repo">{{ $t('Choose a repository', 'اختر مستودعًا') }}</span>
                <span x-show="repo && repo.private" style="display: none" class="inline-flex shrink-0" aria-label="{{ $t('Private', 'خاص') }}"><x-nq::icon name="lock" class="size-3.5 text-muted-foreground" /></span>
                <x-nq::icon name="chevrons-up-down" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            </x-nq::popover.trigger>
            <x-nq::popover.content align="start" class="w-[min(28rem,var(--available-width))] p-0">
                <div class="flex min-w-0 flex-col">
                    <div class="relative p-2">
                        <x-nq::icon name="search" aria-hidden="true" class="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <x-nq::field.input type="search" role="combobox" aria-expanded="true" class="ps-8" x-model="query" x-on:keydown="onKey('repo', $event)"
                            x-effect="if (repoOpen) $nextTick(() => $el.focus())"
                            x-bind:aria-controls="$id('nq-repo', 'repo-list')" x-bind:aria-activedescendant="repoActive >= 0 ? $id('nq-repo', 'repo-' + repoActive) : null"
                            aria-label="{{ $t('Search repositories', 'ابحث في المستودعات') }}" placeholder="{{ $t('Search repositories', 'ابحث في المستودعات') }}" />
                    </div>
                    <p class="sr-only" role="status" x-text="statusText('repo')"></p>
                    <div class="max-h-72 overflow-y-auto border-t border-border">
                        <div x-show="repoStatus === 'loading' && repos.length === 0" class="flex flex-col gap-2 p-3" aria-hidden="true">
                            <x-nq::states.skeleton class="h-9 w-full" /><x-nq::states.skeleton class="h-9 w-full" /><x-nq::states.skeleton class="h-9 w-full" />
                        </div>
                        <div x-show="repoStatus === 'error'" style="display: none" class="flex flex-col items-start gap-2 p-4 text-body-sm text-muted-foreground">
                            <p>{{ $t('Could not load. Check your connection.', 'تعذّر التحميل. تحقق من اتصالك.') }}</p>
                            <x-nq::button size="sm" variant="secondary" x-on:click="searchRepos(0)">
                                <x-nq::icon name="rotate-cw" aria-hidden="true" />
                                {{ $t('Try again', 'حاول مرة أخرى') }}
                            </x-nq::button>
                        </div>
                        <div x-show="repoStatus === 'ready' && repos.length === 0" style="display: none" class="p-4 text-body-sm">
                            <p class="text-label text-foreground">{{ $t('No repositories match', 'لا مستودعات مطابقة') }}</p>
                            <p class="mt-1 text-muted-foreground">{{ $t('Check the spelling, or give the GitHub app access to more repositories.', 'تحقق من الكتابة، أو امنح تطبيق GitHub صلاحية على مستودعات أكثر.') }}</p>
                        </div>
                        <ul x-show="repos.length > 0" style="display: none" x-bind:id="$id('nq-repo', 'repo-list')" role="listbox" aria-label="{{ $t('Search repositories', 'ابحث في المستودعات') }}"
                            class="flex flex-col p-1" x-bind:class="repoStatus === 'loading' && 'opacity-60'">
                            <template x-for="(r, i) in repos" :key="r.id">
                                <li role="option" x-bind:id="$id('nq-repo', 'repo-' + i)" x-bind:aria-selected="repo && r.id === repo.id ? 'true' : 'false'"
                                    x-bind:data-active="i === repoActive ? 'true' : null" class="{{ $optionClass }}" x-bind:class="i === repoActive && 'bg-nq-hover'"
                                    x-on:click="pickRepo(r)" x-on:mousemove="repoActive = i">
                                    <span class="min-w-0 flex-1">
                                        <span class="flex min-w-0 flex-col gap-0.5">
                                            <span class="flex items-center gap-2">
                                                <bdi dir="ltr" class="min-w-0 truncate text-label text-foreground" x-text="r.fullName"></bdi>
                                                <x-nq::badge variant="neutral" x-show="r.private" style="display: none">
                                                    <x-nq::icon name="lock" aria-hidden="true" class="size-3" />
                                                    {{ $t('Private', 'خاص') }}
                                                </x-nq::badge>
                                            </span>
                                            <span x-show="r.description" dir="auto" class="line-clamp-1 text-caption text-muted-foreground" x-text="r.description"></span>
                                            <span class="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                                                <bdi x-show="r.language" dir="ltr" x-text="r.language"></bdi>
                                                <span x-show="r.stars !== undefined" class="inline-flex items-center gap-1">
                                                    <x-nq::icon name="star" aria-hidden="true" class="size-3" />
                                                    <bdi x-text="num(r.stars ?? 0)"></bdi>
                                                </span>
                                                <span x-show="r.updatedAt">{{ $t('Updated', 'حُدّث') }} <span x-text="relative(r.updatedAt)"></span></span>
                                            </span>
                                        </span>
                                    </span>
                                    <span x-show="repo && r.id === repo.id" class="mt-0.5 inline-flex shrink-0 text-primary"><x-nq::icon name="check" aria-hidden="true" class="size-4" /></span>
                                </li>
                            </template>
                        </ul>
                    </div>
                    <div class="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-caption text-muted-foreground">
                        <span class="flex min-w-0 items-center gap-1.5">
                            @if (! empty($account['avatar']))
                                <x-nq::avatar size="xs"><x-nq::avatar.image src="{{ $account['avatar'] }}" alt="" /><x-nq::avatar.fallback>{{ strtoupper(substr($login, 0, 1)) }}</x-nq::avatar.fallback></x-nq::avatar>
                            @else
                                <x-nq::icon name="shield-check" aria-hidden="true" class="size-3.5 shrink-0" />
                            @endif
                            <span class="truncate">{{ $t('Through the GitHub app on '.$login, 'عبر تطبيق GitHub على '.$login) }}</span>
                        </span>
                        <x-nq::button size="sm" variant="ghost" class="shrink-0" :style="$configure ? null : 'display: none'" x-on:click="configure()">
                            <x-nq::icon name="settings-2" aria-hidden="true" />
                            {{ $t('Configure access', 'ضبط الصلاحيات') }}
                        </x-nq::button>
                    </div>
                </div>
            </x-nq::popover.content>
        </x-nq::popover>
    </div>

    @unless ($hideBranch)
        <div class="flex min-w-0 flex-col gap-1.5">
            <span class="text-label text-foreground">{{ $t('Branch', 'الفرع') }}</span>
            <x-nq::popover x-model="branchOpen">
                <x-nq::popover.trigger class="{{ $triggerClass }}" x-bind:disabled="(disabled || ! repo) ? '' : null" x-bind:data-disabled="(disabled || ! repo) ? '' : null"
                    x-bind:aria-label="`{{ $t('Branch', 'الفرع') }}: ` + (branch ?? (repo ? `{{ $t('Choose a branch', 'اختر فرعًا') }}` : `{{ $t('Choose a repository first', 'اختر مستودعًا أولًا') }}`))">
                    <x-nq::icon name="git-branch" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                    <bdi dir="ltr" class="min-w-0 flex-1 truncate" @if (! $branch) style="display: none" @endif x-show="branch" x-text="branch"></bdi>
                    <span class="min-w-0 flex-1 truncate text-muted-foreground" @if ($branch) style="display: none" @endif x-show="! branch"
                        x-text="repo ? (branchStatus === 'loading' ? `{{ $t('Loading branches', 'جارٍ تحميل الفروع') }}` : `{{ $t('Choose a branch', 'اختر فرعًا') }}`) : `{{ $t('Choose a repository first', 'اختر مستودعًا أولًا') }}`">{{ $repo ? $t('Choose a branch', 'اختر فرعًا') : $t('Choose a repository first', 'اختر مستودعًا أولًا') }}</span>
                    <x-nq::icon name="chevrons-up-down" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                </x-nq::popover.trigger>
                <x-nq::popover.content align="start" class="w-[min(22rem,var(--available-width))] p-0">
                    <div class="flex min-w-0 flex-col">
                        <div class="relative p-2">
                            <x-nq::icon name="search" aria-hidden="true" class="pointer-events-none absolute start-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <x-nq::field.input type="search" role="combobox" aria-expanded="true" class="ps-8" x-model="branchQuery" x-on:keydown="onKey('branch', $event)"
                                x-effect="if (branchOpen) $nextTick(() => $el.focus())"
                                x-bind:aria-controls="$id('nq-repo', 'branch-list')" x-bind:aria-activedescendant="branchActive >= 0 ? $id('nq-repo', 'branch-' + branchActive) : null"
                                aria-label="{{ $t('Filter branches', 'صفِّ الفروع') }}" placeholder="{{ $t('Filter branches', 'صفِّ الفروع') }}" />
                        </div>
                        <p class="sr-only" role="status" x-text="statusText('branch')"></p>
                        <div class="max-h-72 overflow-y-auto border-t border-border">
                            <div x-show="branchStatus === 'loading' && branches.length === 0" class="flex flex-col gap-2 p-3" aria-hidden="true">
                                <x-nq::states.skeleton class="h-9 w-full" /><x-nq::states.skeleton class="h-9 w-full" /><x-nq::states.skeleton class="h-9 w-full" />
                            </div>
                            <div x-show="branchStatus === 'error'" style="display: none" class="flex flex-col items-start gap-2 p-4 text-body-sm text-muted-foreground">
                                <p>{{ $t('Could not load. Check your connection.', 'تعذّر التحميل. تحقق من اتصالك.') }}</p>
                                <x-nq::button size="sm" variant="secondary" x-on:click="loadBranches()">
                                    <x-nq::icon name="rotate-cw" aria-hidden="true" />
                                    {{ $t('Try again', 'حاول مرة أخرى') }}
                                </x-nq::button>
                            </div>
                            <div x-show="branchStatus === 'ready' && shownBranches.length === 0" style="display: none" class="p-4 text-body-sm">
                                <p class="text-label text-foreground">{{ $t('No branches match', 'لا فروع مطابقة') }}</p>
                            </div>
                            <ul x-show="shownBranches.length > 0" style="display: none" x-bind:id="$id('nq-repo', 'branch-list')" role="listbox" aria-label="{{ $t('Filter branches', 'صفِّ الفروع') }}"
                                class="flex flex-col p-1" x-bind:class="branchStatus === 'loading' && 'opacity-60'">
                                <template x-for="(b, i) in shownBranches" :key="b.name">
                                    <li role="option" x-bind:id="$id('nq-repo', 'branch-' + i)" x-bind:aria-selected="b.name === branch ? 'true' : 'false'"
                                        x-bind:data-active="i === branchActive ? 'true' : null" class="{{ $optionClass }}" x-bind:class="i === branchActive && 'bg-nq-hover'"
                                        x-on:click="pickBranch(b)" x-on:mousemove="branchActive = i">
                                        <span class="min-w-0 flex-1">
                                            <span class="flex items-center gap-2">
                                                <bdi dir="ltr" class="min-w-0 truncate text-body-sm text-foreground" x-text="b.name"></bdi>
                                                <x-nq::badge variant="info" x-show="b.default" style="display: none">{{ $t('Default', 'الافتراضي') }}</x-nq::badge>
                                                <x-nq::badge variant="neutral" x-show="b.protected" style="display: none">
                                                    <x-nq::icon name="lock" aria-hidden="true" class="size-3" />
                                                    {{ $t('Protected', 'محمي') }}
                                                </x-nq::badge>
                                            </span>
                                        </span>
                                        <span x-show="b.name === branch" class="mt-0.5 inline-flex shrink-0 text-primary"><x-nq::icon name="check" aria-hidden="true" class="size-4" /></span>
                                    </li>
                                </template>
                            </ul>
                        </div>
                    </div>
                </x-nq::popover.content>
            </x-nq::popover>
        </div>
    @endunless
</div>
