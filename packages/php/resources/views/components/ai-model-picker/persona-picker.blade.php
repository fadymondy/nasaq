{{-- <x-nq::ai-model-picker.persona-picker :personas="[['id' => 'coach', 'name' => 'Coach', 'description' => 'Plans your week', 'icon' => 'bot', 'starters' => ['Plan my week']]]" value="coach" name="persona" />
     Choose who the assistant should be, then start from one of that persona's prompts. Each persona is a radio card; the starters of the selected one are buttons.
     personas: id, name, description?, icon? (a Lucide icon name, default bot), starters? (strings). value: the starting persona id (default the first); it is x-modelable.
     A starter dispatches a bubbling "nq-starter" event with detail { prompt, persona } to send as the first prompt. name adds a hidden input.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['personas' => [], 'value' => null, 'name' => null, 'disabled' => false])
@php
    use Nasaq\Nasaq;

    $personas = array_values((array) $personas);
    $first = $value ?? ($personas[0]['id'] ?? null);
    $config = ['value' => $first, 'personas' => collect($personas)->mapWithKeys(fn ($p) => [$p['id'] => ['id' => $p['id'], 'name' => $p['name'], 'starters' => array_values($p['starters'] ?? [])]])->all()];
    $startersLabel = Nasaq::t('Try asking', 'جرّب أن تسأل');
@endphp
<div data-slot="persona-picker" x-data="nqPersonaPicker(@js($config))" x-modelable="selected" {{ $attributes->cn('flex flex-col gap-4') }}>
    <x-nq::radio-group :default-value="$first" aria-label="{{ Nasaq::t('Personas', 'الشخصيات') }}" x-model="selected" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        @foreach ($personas as $p)
            <x-nq::radio-group.card :value="$p['id']" :description="$p['description'] ?? null" x-bind:disabled="{{ $disabled ? 'true' : 'false' }}" :data-disabled="$disabled ? '' : null">
                <span class="flex items-center gap-2">
                    <span aria-hidden="true" class="text-muted-foreground [&_svg]:size-4"><x-dynamic-component :component="'lucide-'.($p['icon'] ?? 'bot')" /></span>
                    {{ $p['name'] }}
                </span>
            </x-nq::radio-group.card>
        @endforeach
    </x-nq::radio-group>
    <div data-slot="persona-starters" class="flex flex-col gap-2" x-show="starters().length" @unless (collect($personas)->firstWhere('id', $first)['starters'] ?? null) style="display: none" @endunless>
        <span class="text-label text-foreground">{{ $startersLabel }}</span>
        <ul aria-label="{{ $startersLabel }}" class="flex flex-wrap gap-2">
            <template x-for="s in starters()" :key="s">
                <li>
                    <x-nq::button size="sm" x-on:click="start(s)" :disabled="$disabled" class="h-auto min-h-control-sm whitespace-normal py-1.5 text-start"><span x-text="s"></span></x-nq::button>
                </li>
            </template>
        </ul>
    </div>
    @if ($name)<input type="hidden" name="{{ $name }}" x-bind:value="selected ?? ''" value="{{ $first }}">@endif
</div>
