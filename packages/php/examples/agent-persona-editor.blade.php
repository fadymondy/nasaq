@php
    $agent = [
        'name' => 'Support agent',
        'tagline' => 'Answers billing questions',
        'color' => '--nq-tag-blue',
        'icon' => 'headphones',
        'persona' => "## Role\n\nYou help customers with **invoices** and refunds.",
        'traits' => ['calm', 'precise'],
        'model' => 'fast',
        'greeting' => 'Hi, how can I help?',
    ];
    $models = [['id' => 'fast', 'label' => 'Fast'], ['id' => 'smart', 'label' => 'Smart']];
@endphp
<div class="w-full max-w-4xl">
    <x-nq::agent-persona-editor :value="$agent" :models="$models" :trait-suggestions="['friendly', 'formal', 'concise']" />
</div>
