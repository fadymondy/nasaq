<div class="flex max-w-2xl flex-col gap-6">
    <div id="ai-buttons" class="flex flex-wrap items-center gap-3">
        <x-nq::ai-states.sparkle-button show-shortcut>Summarize</x-nq::ai-states.sparkle-button>
        <x-nq::ai-states.sparkle-button :generating="true" />
        <x-nq::ai-states.split-button label="Summarize" :actions="[['id' => 'translate', 'label' => 'Translate', 'icon' => 'languages'], ['id' => 'fix', 'label' => 'Fix grammar', 'shortcut' => 'Mod Shift G']]" />
    </div>
    <x-nq::ai-states.suggestion-chips id="ai-chips" :suggestions="[['id' => 'shorter', 'label' => 'Make it shorter'], ['id' => 'tr', 'label' => 'Translate', 'icon' => 'languages']]" dismissible />
    <x-nq::ai-states.action-menu :actions="[['id' => 'summarize', 'label' => 'Summarize', 'recommended' => true, 'icon' => 'text', 'shortcut' => 'Mod Shift S'], ['id' => 'translate', 'label' => 'Translate', 'description' => 'Into Arabic'], ['id' => 'fix', 'label' => 'Fix grammar', 'keywords' => ['spelling']]]" />
    <x-nq::ai-states.thinking id="ai-thinking-static" :steps="['Reading the document', 'Finding key points', 'Writing']" :current="1" />
    <x-nq::ai-states.thinking id="ai-thinking-live" :steps="['Reading the document', 'Finding key points', 'Writing']" :interval="100" />
    <x-nq::ai-states.shimmer :lines="4" />
    <x-nq::ai-states.streaming-text id="ai-text-static" text="Two tasks are **overdue**: the invoice and the contract." />
    <x-nq::ai-states.streaming-text id="ai-text-streaming" text="Two tasks are **overdue" streaming />
    <div x-data="{ answer: 'Hello', busy: true }" id="ai-live">
        <x-nq::ai-states.streaming-text id="ai-text-live" :markdown="false" text="Hello" text-expr="answer" streaming-expr="busy" :cps="2000" />
        <x-nq::ai-states.stream-controls id="ai-controls-live" state="streaming" state-expr="busy ? `streaming` : `done`" regenerate />
    </div>
    <x-nq::ai-states.stream-controls id="ai-controls-static" state="done" regenerate />
    <x-nq::ai-states.generated-label model="Claude" />
    <x-nq::ai-states.confidence-meter :value="0.86" />
    <x-nq::ai-states.feedback id="ai-feedback" />
    <x-nq::ai-states.summary id="ai-summary" tldr="Two tasks are overdue." :points="['Send the invoice', 'Review the contract']" full="## Details&#10;&#10;The invoice is 3 days late." :sources="[['id' => 's1', 'title' => 'Task board', 'url' => 'https://example.com/board']]"
        :confidence="0.64" model="Claude" regenerate feedback />
    <x-nq::ai-states.summary id="ai-summary-loading" loading />
</div>
