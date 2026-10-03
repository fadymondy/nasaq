<div class="flex flex-col">
    <x-nq::editor-chrome.tabs :tabs="[['id' => 'a', 'title' => 'Trip plan', 'dirty' => true], ['id' => 'b', 'title' => 'Ideas'], ['id' => 'c', 'title' => 'Packing', 'pinned' => true]]" active="a" new />
    <textarea id="editor-chrome-text" class="min-h-24 p-3">Book the flights</textarea>
    <x-nq::editor-chrome.status-bar source="#editor-chrome-text" save-state="saved" retry />
    <x-nq::editor-chrome.backlinks class="p-3" :backlinks="[['id' => 'n1', 'title' => 'Packing list', 'snippet' => 'See the Trip plan for dates.', 'path' => 'Travel']]" highlight="Trip plan" />
</div>
