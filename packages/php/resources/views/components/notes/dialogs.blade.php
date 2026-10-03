{{-- Internal: the dialogs of x-nq::notes (move, tags, colour, share, export, seal, remove seal, delete, notebooks, export all). Each is opened by openDialog / openNotebook and bound to dlg.<name>. $t: the words. --}}
@php
    $pick = 'flex h-nav-row w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-ring aria-checked:bg-nq-selected [&_svg]:size-4 [&_svg]:text-muted-foreground';
    $err = 'text-body-sm text-nq-danger-text';
@endphp
{{-- Move --}}
<x-nq::dialog x-model="dlg.move">
    <x-nq::dialog.content class="max-w-sm" data-slot="note-move-dialog">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $t['moveTitle'] }}</x-nq::dialog.title>
            <x-nq::dialog.description><span x-text="dialogNote ? titleOf(dialogNote) : ''"></span></x-nq::dialog.description>
        </x-nq::dialog.header>
        <div role="radiogroup" aria-label="{{ $t['moveTitle'] }}" class="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            <button type="button" role="radio" x-bind:aria-checked="moveTo === '' ? 'true' : 'false'" x-on:click="moveTo = ''; saveMove()" class="{{ $pick }}" style="padding-inline-start:0.5rem">
                <x-lucide-folder-open aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ $t['moveNone'] }}</span>
                <x-lucide-check x-show="moveTo === ''" aria-hidden="true" class="text-foreground" />
            </button>
            <template x-for="r in nbParents" x-bind:key="r.notebook.id">
                <button type="button" role="radio" x-bind:aria-checked="moveTo === r.notebook.id ? 'true' : 'false'" x-on:click="moveTo = r.notebook.id; saveMove()" x-bind:style="'padding-inline-start:' + (0.5 + r.depth * 1.25) + 'rem'" class="{{ $pick }}">
                    <x-lucide-notebook aria-hidden="true" />
                    <span class="min-w-0 flex-1 truncate" x-text="r.notebook.name"></span>
                    <x-lucide-check x-show="moveTo === r.notebook.id" aria-hidden="true" class="text-foreground" />
                </button>
            </template>
        </div>
        <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
    </x-nq::dialog.content>
</x-nq::dialog>

{{-- Tags --}}
<x-nq::dialog x-model="dlg.tags">
    <x-nq::dialog.content class="max-w-md" data-slot="note-tags-dialog">
        <form class="grid gap-4" x-on:submit.prevent="saveTags()">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $t['tagsTitle'] }}</x-nq::dialog.title>
                <x-nq::dialog.description><span x-text="dialogNote ? titleOf(dialogNote) : ''"></span></x-nq::dialog.description>
            </x-nq::dialog.header>
            <div data-slot="tag-input" class="flex min-h-control flex-wrap items-center gap-1.5 rounded-control border border-border bg-card px-2 py-1.5 focus-within:outline-2 focus-within:outline-nq-focus">
                <template x-for="tag in tagsDraft" x-bind:key="tag">
                    <x-nq::badge variant="neutral" class="gap-1">
                        <span x-text="tag"></span>
                        <button type="button" x-bind:aria-label="tag" x-on:click="removeTag(tag)" class="inline-flex size-4 items-center justify-center rounded-control hover:bg-nq-hover [&_svg]:size-3"><x-lucide-x aria-hidden="true" /></button>
                    </x-nq::badge>
                </template>
                <input type="text" x-model="tagInput" x-on:keydown="onTagKey($event)" placeholder="{{ $t['tagsPlaceholder'] }}" aria-label="{{ $t['tagsTitle'] }}" list="nq-notes-tag-suggestions" class="min-w-24 flex-1 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <datalist id="nq-notes-tag-suggestions"><template x-for="s in tagSuggestions" x-bind:key="s"><option x-bind:value="s"></option></template></datalist>
            </div>
            <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="closeDialog('tags')">{{ $t['cancel'] }}</x-nq::button>
                <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null">{{ $t['save'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </form>
    </x-nq::dialog.content>
</x-nq::dialog>

{{-- Colour --}}
<x-nq::dialog x-model="dlg.color">
    <x-nq::dialog.content class="max-w-sm" data-slot="note-color-dialog">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $t['colorTitle'] }}</x-nq::dialog.title>
            <x-nq::dialog.description><span x-text="dialogNote ? titleOf(dialogNote) : ''"></span></x-nq::dialog.description>
        </x-nq::dialog.header>
        <div role="radiogroup" aria-label="{{ $t['colorTitle'] }}" class="flex flex-wrap items-center gap-2">
            <template x-for="(label, key) in t.colorNames" x-bind:key="key">
                <button type="button" role="radio" x-bind:aria-checked="colorPick === key ? 'true' : 'false'" x-bind:aria-label="label" x-bind:title="label" x-on:click="saveColor(key)"
                    x-bind:style="'background:var(--nq-tag-' + key + ')'"
                    class="size-7 rounded-full border border-border focus-visible:outline-2 focus-visible:outline-nq-focus aria-checked:outline-2 aria-checked:outline-offset-2 aria-checked:outline-nq-focus"></button>
            </template>
            <x-nq::button type="button" variant="ghost" size="sm" x-bind:disabled="!colorPick" x-bind:data-disabled="colorPick ? null : ''" x-on:click="saveColor('')">{{ $t['noColor'] }}</x-nq::button>
        </div>
        <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
    </x-nq::dialog.content>
</x-nq::dialog>

{{-- Share --}}
<x-nq::dialog x-model="dlg.share">
    <x-nq::dialog.content class="max-w-md" data-slot="note-share-dialog">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $t['share'] }}</x-nq::dialog.title>
            <x-nq::dialog.description><span x-text="dialogNote ? titleOf(dialogNote) : ''"></span></x-nq::dialog.description>
        </x-nq::dialog.header>
        <div class="flex items-center gap-2">
            <input type="text" readonly dir="ltr" x-bind:value="shareLink" aria-label="{{ $t['share'] }}" x-on:focus="$el.select()" class="h-control min-w-0 flex-1 rounded-control border border-border bg-card px-3 text-body-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" />
            <x-nq::button type="button" variant="secondary" x-on:click="copyLink()">
                <x-lucide-check x-show="copied" aria-hidden="true" /><x-lucide-copy x-show="!copied" aria-hidden="true" />
                <span x-text="copied ? '{{ \Nasaq\Nasaq::t('Copied', 'تم النسخ') }}' : '{{ \Nasaq\Nasaq::t('Copy link', 'نسخ الرابط') }}'"></span>
            </x-nq::button>
        </div>
        <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
    </x-nq::dialog.content>
</x-nq::dialog>

{{-- Export one note --}}
<x-nq::dialog x-model="dlg.export">
    <x-nq::dialog.content class="max-w-sm" data-slot="note-export-dialog">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $t['exportTitle'] }}</x-nq::dialog.title>
            <x-nq::dialog.description>{{ $t['exportHint'] }}</x-nq::dialog.description>
        </x-nq::dialog.header>
        <div role="radiogroup" aria-label="{{ $t['exportTitle'] }}" class="flex flex-col gap-1">
            <template x-for="f in exportFormats" x-bind:key="f">
                <button type="button" role="radio" x-bind:aria-checked="f === exportFormat ? 'true' : 'false'" x-on:click="exportFormat = f" class="{{ $pick }}">
                    <span class="flex-1" x-text="t.exportFormats[f]"></span>
                    <x-lucide-check x-show="f === exportFormat" aria-hidden="true" class="size-4" />
                </button>
            </template>
        </div>
        <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
        <x-nq::dialog.footer>
            <x-nq::button type="button" variant="ghost" x-on:click="closeDialog('export')">{{ $t['cancel'] }}</x-nq::button>
            <x-nq::button type="button" variant="primary" x-on:click="doExport()">{{ $t['exportDownload'] }}</x-nq::button>
        </x-nq::dialog.footer>
    </x-nq::dialog.content>
</x-nq::dialog>

{{-- Seal and remove the seal --}}
@foreach (['seal', 'unseal'] as $kind)
    <x-nq::dialog x-model="dlg.{{ $kind }}">
        <x-nq::dialog.content class="max-w-sm" data-slot="note-seal-dialog">
            <form class="grid gap-4" x-on:submit.prevent="{{ $kind === 'seal' ? 'confirmSeal()' : 'confirmUnseal()' }}">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t[$kind.'Title'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t[$kind.'Body'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="grid gap-1.5">
                    <label for="nq-notes-{{ $kind }}-pw" class="text-label text-foreground">{{ $t['password'] }}</label>
                    <x-nq::password-input id="nq-notes-{{ $kind }}-pw" x-model="password" autocomplete="{{ $kind === 'seal' ? 'new-password' : 'current-password' }}" :show-strength="$kind === 'seal'" dir="ltr" />
                </div>
                @if ($kind === 'seal')
                    <div class="grid gap-1.5">
                        <label for="nq-notes-seal-pw2" class="text-label text-foreground">{{ $t['passwordConfirm'] }}</label>
                        <x-nq::password-input id="nq-notes-seal-pw2" x-model="password2" autocomplete="new-password" dir="ltr" />
                    </div>
                @endif
                <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="closeDialog('{{ $kind }}')">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="{{ $kind === 'seal' ? '!!passwordProblem' : '!password' }}" x-bind:aria-busy="busy === '{{ $kind }}' ? 'true' : null">{{ $t[$kind.'Action'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
@endforeach

{{-- Delete a note --}}
<x-nq::alert-dialog x-model="dlg.delete">
    <x-nq::alert-dialog.content data-slot="note-delete-dialog">
        <x-nq::alert-dialog.header>
            <x-nq::alert-dialog.title>{{ $t['deleteTitle'] }}</x-nq::alert-dialog.title>
            <x-nq::alert-dialog.description>
                {{ $t['deleteBody'] }}
                <span class="mt-1 block font-medium text-foreground" x-text="dialogNote ? titleOf(dialogNote) : ''"></span>
            </x-nq::alert-dialog.description>
        </x-nq::alert-dialog.header>
        <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
        <x-nq::alert-dialog.footer>
            <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
            <x-nq::alert-dialog.action x-on:click="confirmDelete()">{{ $t['deleteConfirm'] }}</x-nq::alert-dialog.action>
        </x-nq::alert-dialog.footer>
    </x-nq::alert-dialog.content>
</x-nq::alert-dialog>

{{-- New or renamed notebook --}}
<x-nq::dialog x-model="dlg.notebook">
    <x-nq::dialog.content class="max-w-sm" data-slot="notebook-dialog">
        <form class="grid gap-4" x-on:submit.prevent="saveNotebook()">
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="nbKind === 'create' ? t.newNotebook : t.renameNotebook"></span></x-nq::dialog.title>
            </x-nq::dialog.header>
            <div class="grid gap-1.5">
                <label for="nq-notes-nb-name" class="text-label text-foreground">{{ $t['notebookName'] }}</label>
                <x-nq::field.input id="nq-notes-nb-name" x-model="nbName" placeholder="{{ $t['notebookNamePlaceholder'] }}" />
            </div>
            <div x-show="nbKind === 'create' && nbParents.length" class="grid gap-1.5">
                <label for="nq-notes-nb-parent" class="text-label text-foreground">{{ $t['notebookParent'] }}</label>
                <select id="nq-notes-nb-parent" x-model="nbParent" class="h-control rounded-control border border-border bg-card px-2 text-body-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <option value="">{{ $t['notebookRoot'] }}</option>
                    <template x-for="p in nbParents" x-bind:key="p.notebook.id"><option x-bind:value="p.notebook.id" x-text="'— '.repeat(p.depth) + p.notebook.name"></option></template>
                </select>
            </div>
            <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="closeDialog('notebook')">{{ $t['cancel'] }}</x-nq::button>
                <x-nq::button type="submit" variant="primary" x-bind:disabled="!nbName.trim()" x-bind:aria-busy="busy === 'nb' ? 'true' : null"><span x-text="nbKind === 'create' ? t.create : t.save"></span></x-nq::button>
            </x-nq::dialog.footer>
        </form>
    </x-nq::dialog.content>
</x-nq::dialog>

{{-- Delete a notebook --}}
<x-nq::alert-dialog x-model="dlg.notebookDelete">
    <x-nq::alert-dialog.content data-slot="notebook-delete-dialog">
        <x-nq::alert-dialog.header>
            <x-nq::alert-dialog.title>{{ $t['notebookDeleteTitle'] }}</x-nq::alert-dialog.title>
            <x-nq::alert-dialog.description>
                {{ $t['notebookDeleteBody'] }}
                <span class="mt-1 block font-medium text-foreground" x-text="(notebooks.find((b) => b.id === nbId) || {}).name || ''"></span>
            </x-nq::alert-dialog.description>
        </x-nq::alert-dialog.header>
        <p x-show="err.dialog" x-cloak role="alert" class="{{ $err }}" x-text="err.dialog"></p>
        <x-nq::alert-dialog.footer>
            <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
            <x-nq::alert-dialog.action x-on:click="deleteNotebook()">{{ $t['deleteNotebook'] }}</x-nq::alert-dialog.action>
        </x-nq::alert-dialog.footer>
    </x-nq::alert-dialog.content>
</x-nq::alert-dialog>

{{-- Export all (the filtered list) --}}
<x-nq::dialog x-model="dlg.exportAll">
    <x-nq::dialog.content class="max-w-sm" data-slot="notes-export-dialog">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $t['exportAll'] }}</x-nq::dialog.title>
            <x-nq::dialog.description><span x-text="fill(t.resultCount, num(shown.length))"></span></x-nq::dialog.description>
        </x-nq::dialog.header>
        <div role="radiogroup" aria-label="{{ $t['exportAll'] }}" class="flex flex-col gap-1">
            @foreach (['csv' => 'CSV (.csv)', 'json' => 'JSON (.json)'] as $f => $label)
                <button type="button" role="radio" x-bind:aria-checked="exportAllFormat === '{{ $f }}' ? 'true' : 'false'" x-on:click="exportAllFormat = '{{ $f }}'" class="{{ $pick }}">
                    <span class="flex-1" dir="ltr">{{ $label }}</span>
                    <x-lucide-check x-show="exportAllFormat === '{{ $f }}'" aria-hidden="true" class="size-4" />
                </button>
            @endforeach
        </div>
        <x-nq::dialog.footer>
            <x-nq::button type="button" variant="ghost" x-on:click="closeDialog('exportAll')">{{ $t['cancel'] }}</x-nq::button>
            <x-nq::button type="button" variant="primary" x-on:click="doExportAll()">{{ $t['exportDownload'] }}</x-nq::button>
        </x-nq::dialog.footer>
    </x-nq::dialog.content>
</x-nq::dialog>
