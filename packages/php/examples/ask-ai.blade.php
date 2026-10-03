<div class="flex flex-col gap-4">
    <x-nq::ask-ai replace
        x-on:ask-ai="$event.detail.wait(new Promise((resolve) => setTimeout(() => resolve('**' + $event.detail.prompt + '**: the returns window starts on the day your order is delivered.'), 600)))">
        <article class="max-w-prose text-body">
            <p>Refunds are issued to the original payment method within 5 working days. The returns window starts on the day your order is delivered.</p>
        </article>
    </x-nq::ask-ai>

    <x-nq::ask-ai.insight-card
        title="Signups fell 18% on mobile"
        tone="warning"
        :metric="['label' => 'Mobile signups', 'value' => 1240, 'delta' => -0.18]"
        body="The drop starts on the day the new form shipped. [Details](#)"
        :confidence="0.78"
        :actions="[['id' => 'open', 'label' => 'Open the funnel']]"
        ask
        dismissible
        :show-feedback="true" />
</div>
