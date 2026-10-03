{{-- Internal: the reply box of x-nq::inbox (reply or note, email fields, attachments, emoji, saved replies, send). Runs in the inbox's Alpine scope (conv, mode, draftText ...). --}}
<div data-slot="inbox-composer" x-bind:data-mode="mode" class="flex flex-col gap-2 border-t border-border bg-card p-3">
    <x-nq::tabs default-value="reply" x-model="mode" class="gap-0">
        <x-nq::tabs.list aria-label="{{ $t['reply'] }}">
            <x-nq::tabs.tab value="reply">{{ $t['reply'] }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="note">{{ $t['note'] }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>
    </x-nq::tabs>
    <p x-show="noteMode" style="display: none" class="text-caption text-muted-foreground">{{ $t['noteHint'] }}</p>
    <div x-show="replyTo" style="display: none" class="flex items-start gap-2">
        <div data-slot="reply-quote" class="mb-0 flex-1 rounded-[4px] border-s-2 border-nq-accent bg-background/60 py-1 ps-2 pe-2 text-start">
            <span dir="auto" class="block truncate text-caption font-medium text-foreground" x-text="replyTo ? quoteAuthor(replyTo) : ``"></span>
            <span dir="auto" class="line-clamp-2 block text-caption text-muted-foreground" x-text="replyTo ? quoteExcerpt(replyTo) : ``"></span>
        </div>
        <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['cancelReply'] }}" x-on:click="replyTo = null"><x-lucide-x aria-hidden="true" /></x-nq::button>
    </div>

    <div x-bind:class="noteMode ? `border-dashed bg-nq-warning-soft` : `bg-background`" class="flex flex-col gap-2 rounded-card border border-input p-2 transition-colors duration-150 ease-nq focus-within:border-nq-focus">
        <div x-show="richMode" style="display: none" class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-caption text-muted-foreground">
                <span class="w-12 shrink-0">{{ $t['to'] }}</span>
                <bdi dir="ltr" class="min-w-0 flex-1 truncate text-foreground" x-text="toWho"></bdi>
                <x-nq::button x-show="!showCc" type="button" variant="link" size="sm" data-action="add-cc" x-on:click="showCc = true">{{ $t['addCc'] }}</x-nq::button>
            </div>
            <label x-show="showCc" style="display: none" class="flex items-center gap-2 text-caption text-muted-foreground">
                <span class="w-12 shrink-0">{{ $t['cc'] }}</span>
                <x-nq::field.input ltr x-model="ccText" placeholder="{{ $t['ccPlaceholder'] }}" class="h-8" />
            </label>
            <label class="flex items-center gap-2 text-caption text-muted-foreground">
                <span class="w-12 shrink-0">{{ $t['subject'] }}</span>
                <x-nq::field.input dir="auto" x-model="subject" class="h-8" />
            </label>
        </div>

        <div x-show="mentionOptions.length" style="display: none" role="listbox" aria-label="{{ $t['conversations'] }}" class="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-control border border-border bg-popover p-1">
            <template x-for="(a, i) in mentionOptions" x-bind:key="a.id">
                <button type="button" role="option" x-bind:aria-selected="i == mentionActive" x-on:mousedown.prevent="pickMention(a)" x-bind:class="i == mentionActive ? `bg-nq-hover` : ``"
                    class="flex items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm text-foreground outline-none">
                    @include('nasaq::components.inbox._avatar', ['name' => 'a.name', 'src' => 'a.avatar', 'size' => 'xs'])
                    <span class="flex-1 truncate" x-text="a.name"></span>
                </button>
            </template>
        </div>

        <x-nq::field.textarea dir="auto" x-model="draftText" x-bind:placeholder="placeholder" x-bind:aria-label="noteMode ? t.note : t.message" x-bind:rows="richMode ? 4 : 2"
            x-on:input="onDraftInput()" x-on:keydown="onDraftKey($event)" class="min-h-14 resize-none border-0 bg-transparent px-1 py-1 focus-visible:outline-0" />

        <ul x-show="files.length" style="display: none" class="flex flex-wrap gap-1.5">
            <template x-for="(f, i) in files" x-bind:key="f.name + i">
                <li class="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
                    <span dir="auto" class="truncate" x-text="f.name"></span>
                    <button type="button" x-bind:aria-label="say(`removeAttachment`, { name: f.name })" x-on:click="removeFile(i)"
                        class="grid size-5 place-items-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3" />
                    </button>
                </li>
            </template>
        </ul>

        <div class="flex items-center gap-0.5">
            <input type="file" multiple hidden x-ref="fileInput" x-on:change="addFiles($event)">
            <x-nq::button type="button" variant="ghost" size="icon-sm" data-action="attach" aria-label="{{ $t['attach'] }}" x-on:click="$refs.fileInput.click()"><x-lucide-paperclip aria-hidden="true" /></x-nq::button>
            <span x-show="!richMode" style="display: none" class="contents">
                <x-nq::emoji-picker side="top" x-on:emoji-select="insertEmoji($event.detail.emoji)" />
            </span>
            @if (! empty($snippets))
                <span x-show="!noteMode" class="contents">
                    <x-nq::popover x-model="snipOpen">
                        <x-nq::popover.trigger variant="ghost" size="icon-sm" data-action="snippets" aria-label="{{ $t['snippets'] }}"><x-lucide-zap aria-hidden="true" /></x-nq::popover.trigger>
                        <x-nq::popover.content side="top" align="start" class="flex w-80 flex-col gap-2 p-2">
                            <x-nq::field.input data-slot="snippet-search" role="combobox" aria-expanded="true" aria-label="{{ $t['snippetSearch'] }}" placeholder="{{ $t['snippetSearch'] }}"
                                x-model="snipQuery" x-on:input="snipActive = 0" x-on:keydown="onSnipKey($event)" />
                            <ul role="listbox" aria-label="{{ $t['snippets'] }}" class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                                <li x-show="snippetList.length == 0" style="display: none" role="presentation" class="px-2 py-3 text-center text-body-sm text-muted-foreground">{{ $t['snippetsEmpty'] }}</li>
                                <template x-for="(s, i) in snippetList" x-bind:key="s.id">
                                    <li role="option" tabindex="-1" data-action="snippet" x-bind:aria-selected="i == snipActive" x-bind:class="i == snipActive ? `bg-nq-hover` : ``" x-on:mouseenter="snipActive = i" x-on:click="pickSnippet(s)"
                                        class="flex cursor-pointer flex-col gap-0.5 rounded-control px-2 py-1.5 text-start">
                                        <span class="flex items-center gap-2">
                                            <span dir="auto" class="flex-1 truncate text-label text-foreground" x-text="s.title"></span>
                                            <kbd dir="ltr" class="rounded-[4px] border border-border bg-secondary px-1 font-mono text-caption text-muted-foreground" x-text="`/` + s.shortcut"></kbd>
                                        </span>
                                        <span dir="auto" class="line-clamp-2 text-caption text-muted-foreground" x-text="s.body"></span>
                                    </li>
                                </template>
                            </ul>
                        </x-nq::popover.content>
                    </x-nq::popover>
                </span>
            @endif
            <span class="flex-1"></span>
            <span x-show="conv.channel == `whatsapp` &amp;&amp; !noteMode" style="display: none" class="me-2 hidden text-caption text-muted-foreground sm:inline">{{ $t['channelHintWhatsapp'] }}</span>
            <x-nq::button x-show="!wideSend" type="button" variant="primary" size="icon" data-action="send" x-bind:aria-label="noteMode ? t.sendNote : t.send" x-bind:disabled="canSend ? null : true" x-on:click="send()">
                <x-nq::spinner x-show="sending" style="display: none" />
                <x-lucide-send x-show="!sending" aria-hidden="true" class="rtl:-scale-x-100" />
            </x-nq::button>
            <x-nq::button x-show="wideSend" style="display: none" type="button" variant="primary" size="md" data-action="send" x-bind:aria-label="noteMode ? t.sendNote : t.send" x-bind:disabled="canSend ? null : true" x-on:click="send()">
                <x-nq::spinner x-show="sending" style="display: none" />
                <x-lucide-send x-show="!sending" aria-hidden="true" class="rtl:-scale-x-100" />
                <span x-text="noteMode ? t.sendNote : t.send">{{ $t['send'] }}</span>
            </x-nq::button>
        </div>
    </div>
    <p x-show="sendError" style="display: none" role="alert" class="text-caption text-nq-danger-text" x-text="sendError"></p>
</div>
