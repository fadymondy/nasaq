<x-nq::countdown :duration-ms="1500000" :total="4" :done="1" class="flex flex-col items-center gap-4">
    <x-nq::countdown.timer-ring live>
        <x-nq::countdown.timer-readout :seconds="1500" live label="Focus" />
    </x-nq::countdown.timer-ring>
    <x-nq::countdown.cycle-dots :total="4" :done="1" live />
    <div class="flex gap-2">
        <x-nq::button variant="primary" x-show="status === 'idle' || status === 'done'" x-on:click="start()">{{ \Nasaq\Nasaq::t('Start', 'ابدأ') }}</x-nq::button>
        <x-nq::button variant="secondary" x-show="status === 'running'" x-cloak style="display: none" x-on:click="pause()">{{ \Nasaq\Nasaq::t('Pause', 'إيقاف مؤقت') }}</x-nq::button>
        <x-nq::button variant="primary" x-show="status === 'paused'" x-cloak style="display: none" x-on:click="resume()">{{ \Nasaq\Nasaq::t('Resume', 'متابعة') }}</x-nq::button>
        <x-nq::button variant="ghost" x-on:click="reset()">{{ \Nasaq\Nasaq::t('Reset', 'إعادة') }}</x-nq::button>
    </div>
</x-nq::countdown>
<x-nq::countdown.idle-time-prompt discard-and-stop />
