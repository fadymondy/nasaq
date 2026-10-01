@php
    $models = [
        ['id' => 'opus-5.5', 'label' => 'Opus 5.5', 'tier' => 'flagship', 'provider' => 'Anthropic', 'description' => 'Best for hard, multi-step work.', 'efforts' => ['low', 'medium', 'high', 'max'], 'contextWindow' => 1000000, 'price' => ['input' => 5, 'output' => 25]],
        ['id' => 'sonnet-5.5', 'label' => 'Sonnet 5.5', 'tier' => 'balanced', 'provider' => 'Anthropic', 'efforts' => ['low', 'medium', 'high'], 'contextWindow' => 500000, 'price' => ['input' => 3, 'output' => 15]],
        ['id' => 'haiku-4.5', 'label' => 'Haiku 4.5', 'tier' => 'fast', 'provider' => 'Anthropic', 'contextWindow' => 200000, 'price' => ['input' => 1, 'output' => 5]],
    ];
    $agents = [
        ['id' => 'review', 'label' => 'Code review', 'description' => 'Reads the diff and leaves comments.'],
        ['id' => 'triage', 'label' => 'Triage', 'description' => 'Labels and routes new issues.'],
    ];
    $personas = [
        ['id' => 'coach', 'name' => 'Coach', 'description' => 'Plans your week', 'icon' => 'bot', 'starters' => ['Plan my week', 'What should I do first?']],
        ['id' => 'writer', 'name' => 'Writer', 'description' => 'Drafts and edits', 'icon' => 'pen-line', 'starters' => ['Draft a launch email']],
    ];
@endphp
<div class="flex w-full max-w-2xl flex-col gap-8">
    <x-nq::ai-model-picker :models="$models" :agents="$agents" agent-required :value="['model' => 'opus-5.5', 'effort' => 'high']" name="run" />
    <x-nq::ai-model-picker variant="compact" :models="$models" :agents="$agents" :value="['model' => 'sonnet-5.5']" />
    <x-nq::ai-model-picker.select :models="$models" value="haiku-4.5" name="model" class="w-56" />
    <x-nq::ai-model-picker.persona-picker :personas="$personas" name="persona" />
</div>
