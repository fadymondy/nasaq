{{-- <x-nq::project-view.new-issue />
     The New issue dialog of x-nq::project-view: a title, a type and a priority. It opens when the enclosing project-view sets newOpen = true (the header and List buttons do),
     and its Create button fires nq-project-create-issue { input: { title, type, priority }, wait } from the project root.
     text: array overriding the words (see x-nq::project-view). locale: default the app locale. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_pv_words($locale, (array) $text);
    $iv = nq_iv_words($locale);
    $types = ['bug', 'feature', 'improvement', 'task', 'chore'];
    $priorities = ['urgent', 'high', 'medium', 'low', 'none'];
    $uid = 'nq-pv-new';
@endphp
<x-nq::dialog x-model="newOpen" data-slot="{{ $attributes->get('data-slot', 'project-new-issue') }}">
    <x-nq::dialog.content>
        <form class="grid gap-4" x-on:submit.prevent="submitNew()">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $t['newIssue'] }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $t['newIssueHint'] }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::field>
                <x-nq::field.label>{{ $t['title'] }}</x-nq::field.label>
                <x-nq::field.input x-model="newTitle" autofocus />
            </x-nq::field>
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1.5">
                    <span id="{{ $uid }}-type" class="text-label">{{ $t['type'] }}</span>
                    <x-nq::select value="task" x-model="newType">
                        <x-nq::select.trigger aria-labelledby="{{ $uid }}-type"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($types as $x)
                                <x-nq::select.item :value="$x"><span class="flex items-center gap-2"><x-nq::issue-view.type-icon :type="$x" />{{ $iv[$x] }}</span></x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </div>
                <div class="flex flex-col gap-1.5">
                    <span id="{{ $uid }}-priority" class="text-label">{{ $t['priority'] }}</span>
                    <x-nq::select value="medium" x-model="newPriority">
                        <x-nq::select.trigger aria-labelledby="{{ $uid }}-priority"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($priorities as $x)
                                <x-nq::select.item :value="$x"><span class="flex items-center gap-2"><x-nq::issue-view.priority-icon :priority="$x" />{{ $iv[$x] }}</span></x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </div>
            </div>
            <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="newError" x-cloak style="display: none" x-text="newError"></p>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-bind:disabled="newBusy" x-on:click="newOpen = false">{{ $t['cancel'] }}</x-nq::button>
                <x-nq::button type="submit" x-bind:disabled="newBusy">{{ $t['create'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </form>
    </x-nq::dialog.content>
</x-nq::dialog>
