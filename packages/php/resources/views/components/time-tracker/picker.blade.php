{{-- Internal: the project and task selects the timer and the entry dialog share. <x-nq::time-tracker.picker model="sel" /> (model: sel for the timer, dlg for the dialog).
     The task list follows the project. Reads the projects from the enclosing <x-nq::time-tracker>. --}}
@aware(['projects' => []])
@props(['model' => 'sel'])
@php
    $options = collect($projects)->map(fn ($p) => ['value' => $p['id'], 'label' => $p['name']])->all();
@endphp
<div x-id="['project', 'task']" class="contents">
    <div data-slot="field" class="flex flex-col gap-1.5">
        <label data-slot="field-label" x-bind:for="$id('project')" class="text-label text-foreground">{{ \Nasaq\Nasaq::t('Project', 'المشروع') }}</label>
        <x-nq::native-select :options="$options" :placeholder="\Nasaq\Nasaq::t('Choose a project', 'اختر مشروعًا')" x-bind:id="$id('project')"
            x-effect="syncProject($el, '{{ $model }}')" x-on:change="pickProject('{{ $model }}', $event.target.value)"
            x-bind:disabled="locked('{{ $model }}')" x-bind:aria-invalid="invalidProject('{{ $model }}') ? 'true' : null" />
        <div data-slot="field-error" role="alert" x-show="invalidProject('{{ $model }}')" style="display: none" class="text-caption text-nq-danger-text">{{ \Nasaq\Nasaq::t('Choose a project.', 'اختر مشروعًا.') }}</div>
    </div>
    <div data-slot="field" class="flex flex-col gap-1.5">
        <label data-slot="field-label" x-bind:for="$id('task')" class="text-label text-foreground">{{ \Nasaq\Nasaq::t('Task', 'المهمة') }}</label>
        <x-nq::native-select :placeholder="\Nasaq\Nasaq::t('No task', 'بدون مهمة')" x-bind:id="$id('task')"
            x-effect="syncTask($el, '{{ $model }}')" x-on:change="pickTask('{{ $model }}', $event.target.value)" x-bind:disabled="taskLocked('{{ $model }}')">
            <template x-for="x in tasksOf(projectValue('{{ $model }}'))" x-bind:key="x.id"><option x-bind:value="x.id" x-text="x.name"></option></template>
        </x-nq::native-select>
    </div>
</div>
